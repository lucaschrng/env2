import type { CreateShareResponse, ShareManifest } from '@env2/types';

import * as p from '@clack/prompts';
import { DEFAULT_MAX_DOWNLOADS, DEFAULT_TTL } from '@env2/types';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { getConfig } from '../lib/config';
import { encryptManifest } from '../lib/crypto';
import { type EnvGroup, parseEnvContent, serializeEnvGroups } from '../lib/env-parser';
import { checkExampleSync } from '../lib/example-sync';
import { scanEnvFiles } from '../lib/scanner';

interface ShareOptions {
  downloads: string;
  host?: string;
  noInteractive: boolean;
  root: string;
  ttl: string;
}

export async function share(options: ShareOptions): Promise<void> {
  const root = resolve(options.root || '.');
  const host = options.host || getConfig().host;

  p.intro('env2 share');

  if (!options.noInteractive) {
    await checkExampleSync(root);
  }

  const files = scanEnvFiles(root);

  if (files.length === 0) {
    p.log.warn('No .env files found.');
    p.outro('Nothing to share.');
    return;
  }

  let selectedPaths: string[];

  if (options.noInteractive) {
    selectedPaths = files.map(f => f.path);
  }
  else {
    const selected = await p.multiselect({
      initialValues: files.map(f => f.path),
      message: 'Select files to share',
      options: files.map(f => ({
        hint: `${f.varCount} vars`,
        label: f.path,
        value: f.path,
      })),
    });

    if (p.isCancel(selected)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }

    selectedPaths = selected;
  }

  if (selectedPaths.length === 0) {
    p.log.warn('No files selected.');
    p.outro('Nothing to share.');
    return;
  }

  // Per-var selection for each file
  const manifestFiles: { content: string; path: string }[] = [];

  for (const path of selectedPaths) {
    const raw = readFileSync(join(root, path), 'utf-8');
    const groups = parseEnvContent(raw);
    const allKeys = groups.flatMap(g => g.vars.map(v => v.key));

    if (options.noInteractive || allKeys.length === 0) {
      manifestFiles.push({ content: raw, path });
      continue;
    }

    const selectOptions = groups.flatMap(g =>
      g.vars.map(v => ({
        hint: g.comment?.replace(/^#\s*/, '') ?? undefined,
        label: v.key,
        value: v.key,
      })),
    );

    const selected = await p.multiselect({
      initialValues: allKeys,
      message: `${path} (${allKeys.length} vars)`,
      options: selectOptions,
    });

    if (p.isCancel(selected)) {
      p.cancel('Cancelled.');
      process.exit(0);
    }

    const selectedSet = new Set(selected);
    const filteredGroups: EnvGroup[] = groups
      .map(g => ({
        comment: g.comment,
        vars: g.vars.filter(v => selectedSet.has(v.key)),
      }))
      .filter(g => g.vars.length > 0);

    if (filteredGroups.length > 0) {
      manifestFiles.push({ content: serializeEnvGroups(filteredGroups), path });
    }
  }

  if (manifestFiles.length === 0) {
    p.log.warn('No vars selected.');
    p.outro('Nothing to share.');
    return;
  }

  const manifest: ShareManifest = {
    files: manifestFiles,
    version: 1,
  };

  const s = p.spinner();
  s.start('Encrypting and uploading...');

  const { ciphertext, key } = encryptManifest(JSON.stringify(manifest));
  const ttl = parseTtl(options.ttl);
  const maxDownloads = Number(options.downloads) || DEFAULT_MAX_DOWNLOADS;

  const res = await fetch(`${host}/s`, {
    body: JSON.stringify({ ciphertext, maxDownloads, ttl }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!res.ok) {
    s.stop('Upload failed.');
    p.log.error(`Server error: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  const { id } = (await res.json()) as CreateShareResponse;

  s.stop('Done!');

  const ttlMin = Math.round(ttl / 60);
  const shareUrl = `${host}/s/${id}#${key}`;

  p.log.success(`Encrypted ${selectedPaths.length} file(s) — expires ${ttlMin}min, ${maxDownloads} download(s)`);
  p.log.message(shareUrl);

  const copy = await p.confirm({ message: 'Copy URL to clipboard?' });

  if (!p.isCancel(copy) && copy) {
    try {
      const { default: clipboardy } = await import('clipboardy');
      await clipboardy.write(shareUrl);
      p.outro('Copied! Share it with your teammate.');
    }
    catch {
      p.outro('Could not copy — share the URL above.');
    }
  }
  else {
    p.outro('Share this URL with your teammate.');
  }
}

function parseTtl(ttl: string): number {
  const match = ttl.match(/^(\d+)(s|m|h)$/);
  if (!match) return DEFAULT_TTL;
  const [, value, unit] = match;
  const multiplier = { h: 3600, m: 60, s: 1 }[unit!]!;
  return Number(value) * multiplier;
}
