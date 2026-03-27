import type { FetchShareResponse, ShareManifest } from '@env2/types';

import * as p from '@clack/prompts';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { decryptManifest } from '../lib/crypto';
import { type EnvGroup, mergeEnvContent, parseEnvContent, serializeEnvGroups } from '../lib/env-parser';
import { checkExampleSync } from '../lib/example-sync';

interface ReceiveOptions {
  dryRun: boolean;
  force: boolean;
  noInteractive: boolean;
  overwrite: boolean;
  root: string;
  stdout: boolean;
}

export async function receive(url: string, options: ReceiveOptions): Promise<void> {
  const root = resolve(options.root || '.');

  p.intro('env2 receive');

  // Parse URL — extract base + id + key from fragment
  const parsed = new URL(url);
  const key = parsed.hash.slice(1);
  parsed.hash = '';
  const fetchUrl = parsed.toString();

  if (!key) {
    p.log.error('Invalid URL — missing encryption key (fragment).');
    process.exit(1);
  }

  const s = p.spinner();
  s.start('Fetching...');

  const res = await fetch(fetchUrl);

  if (!res.ok) {
    s.stop('Failed.');
    if (res.status === 404) {
      p.log.error('Share not found or expired.');
    }
    else {
      p.log.error(`Server error: ${res.status}`);
    }
    process.exit(1);
  }

  const { ciphertext } = (await res.json()) as FetchShareResponse;

  let manifest: ShareManifest;
  try {
    const plaintext = decryptManifest(ciphertext, key);
    manifest = JSON.parse(plaintext);
  }
  catch {
    s.stop('Failed.');
    p.log.error('Decryption failed — invalid key or corrupted data.');
    process.exit(1);
  }

  s.stop(`Decrypted ${manifest.files.length} file(s).`);

  if (!options.noInteractive && !options.stdout) {
    await checkExampleSync(root);
  }

  // Build selections per file
  const fileSelections: { content: string; groups: EnvGroup[]; path: string; selectedKeys: Set<string> }[] = [];

  for (const file of manifest.files) {
    const groups = parseEnvContent(file.content);
    const allKeys = groups.flatMap(g => g.vars.map(v => v.key));

    let selectedKeys: Set<string>;

    if (options.noInteractive || options.stdout) {
      selectedKeys = new Set(allKeys);
    }
    else {
      // Build options for the multiselect — vars grouped under comments
      const selectOptions: { hint?: string; label: string; value: string }[] = [];
      for (const group of groups) {
        for (const v of group.vars) {
          selectOptions.push({
            hint: group.comment?.replace(/^#\s*/, '') ?? undefined,
            label: v.key,
            value: v.key,
          });
        }
      }

      const selected = await p.multiselect({
        initialValues: allKeys,
        message: `${file.path} (${allKeys.length} vars)`,
        options: selectOptions,
      });

      if (p.isCancel(selected)) {
        p.cancel('Cancelled.');
        process.exit(0);
      }

      selectedKeys = new Set(selected);
    }

    fileSelections.push({ content: file.content, groups, path: file.path, selectedKeys });
  }

  // Filter groups to only include selected vars
  const filesToWrite: { content: string; path: string }[] = [];

  for (const { groups, path, selectedKeys } of fileSelections) {
    const selectedGroups: EnvGroup[] = groups
      .map(g => ({
        comment: g.comment,
        vars: g.vars.filter(v => selectedKeys.has(v.key)),
      }))
      .filter(g => g.vars.length > 0);

    if (selectedGroups.length === 0) continue;

    const fullPath = join(root, path);
    let content: string;

    if (!options.overwrite && existsSync(fullPath)) {
      const existing = readFileSync(fullPath, 'utf-8');
      content = mergeEnvContent(existing, selectedGroups);
    }
    else {
      content = serializeEnvGroups(selectedGroups);
    }

    filesToWrite.push({ content, path });
  }

  if (filesToWrite.length === 0) {
    p.outro('No vars selected — nothing to write.');
    return;
  }

  // Stdout mode — print and exit
  if (options.stdout) {
    for (const f of filesToWrite) {
      console.log(`# ${f.path}`);
      console.log(f.content);
    }
    p.outro('Done.');
    return;
  }

  // Dry run — show what would be written
  if (options.dryRun) {
    for (const f of filesToWrite) {
      const fullPath = join(root, f.path);
      const exists = existsSync(fullPath);
      const icon = exists ? (options.overwrite ? '\u26a0 overwrite' : '\u26a0 merge') : '\u2190 new';
      p.log.info(`${f.path}  ${icon}`);
    }
    p.outro('Dry run — no files written.');
    return;
  }

  // Show summary and confirm
  for (const f of filesToWrite) {
    const fullPath = join(root, f.path);
    const exists = existsSync(fullPath);
    const icon = exists ? (options.overwrite ? '\u26a0 overwrite' : '\u26a0 merge') : '\u2190 new';
    p.log.info(`${f.path}  ${icon}`);
  }

  if (!options.force) {
    const confirm = await p.confirm({ message: 'Proceed?' });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled.');
      process.exit(0);
    }
  }

  // Write files
  for (const f of filesToWrite) {
    const fullPath = join(root, f.path);
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(fullPath, f.content);
  }

  p.outro(`Wrote ${filesToWrite.length} file(s).`);
}
