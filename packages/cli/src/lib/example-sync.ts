import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { parseEnvContent, serializeEnvGroups } from './env-parser';
import { scanExampleFiles } from './scanner';

/**
 * Pre-flight check: ensure .env files are in sync with .env.example files.
 * - If .env.example exists but .env doesn't → offer to scaffold .env
 * - If both exist but .env is missing keys from .env.example → offer to add them
 */
export async function checkExampleSync(root: string): Promise<void> {
  const examplePaths = scanExampleFiles(root);
  if (examplePaths.length === 0) return;

  for (const exampleRelPath of examplePaths) {
    const envRelPath = exampleRelPath.replace(/\.example$/, '');
    const exampleFullPath = join(root, exampleRelPath);
    const envFullPath = join(root, envRelPath);

    const exampleContent = readFileSync(exampleFullPath, 'utf-8');
    const exampleGroups = parseEnvContent(exampleContent);
    const exampleKeys = new Set(exampleGroups.flatMap(g => g.vars.map(v => v.key)));

    if (exampleKeys.size === 0) continue;

    if (!existsSync(envFullPath)) {
      // .env doesn't exist — offer to scaffold from .env.example
      p.log.warn(`${envRelPath} does not exist but ${exampleRelPath} was found.`);

      const create = await p.confirm({
        message: `Create ${envRelPath} from ${exampleRelPath}?`,
      });

      if (p.isCancel(create) || !create) continue;

      const dir = dirname(envFullPath);
      if (!existsSync(dir)) {
        const { mkdirSync } = await import('node:fs');
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(envFullPath, exampleContent);
      p.log.success(`Created ${envRelPath}`);
    }
    else {
      // Both exist — check for missing keys
      const envContent = readFileSync(envFullPath, 'utf-8');
      const envGroups = parseEnvContent(envContent);
      const envKeys = new Set(envGroups.flatMap(g => g.vars.map(v => v.key)));

      const missingKeys = [...exampleKeys].filter(k => !envKeys.has(k));

      if (missingKeys.length === 0) continue;

      p.log.warn(`${envRelPath} is missing ${missingKeys.length} key(s) from ${exampleRelPath}:`);
      for (const key of missingKeys) {
        p.log.message(`  ${key}`);
      }

      const add = await p.confirm({
        message: `Add missing key(s) to ${envRelPath} with empty values?`,
      });

      if (p.isCancel(add) || !add) continue;

      // Build groups for missing keys, preserving comment grouping from .env.example
      const missingSet = new Set(missingKeys);
      const missingGroups = exampleGroups
        .map(g => ({
          comment: g.comment,
          vars: g.vars
            .filter(v => missingSet.has(v.key))
            .map(v => ({ key: v.key, value: '' })),
        }))
        .filter(g => g.vars.length > 0);

      // Append missing vars to existing .env
      const lines = envContent.trimEnd().split('\n');
      const lastLine = lines[lines.length - 1]?.trim();
      if (lastLine !== '') {
        lines.push('');
      }
      lines.push(serializeEnvGroups(missingGroups).trimEnd());

      writeFileSync(envFullPath, lines.join('\n') + '\n');
      p.log.success(`Added ${missingKeys.length} key(s) to ${envRelPath}`);
    }
  }
}
