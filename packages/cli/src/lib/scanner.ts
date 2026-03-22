import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

interface ScannedFile {
  path: string;
  varCount: number;
}

export function scanEnvFiles(root: string): ScannedFile[] {
  const gitignorePatterns = loadGitignore(root);
  const results: ScannedFile[] = [];

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(root, fullPath);

      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.turbo') {
        continue;
      }

      if (isGitignored(relPath, gitignorePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      }
      else if (isEnvFile(entry.name)) {
        const content = readFileSync(fullPath, 'utf-8');
        const varCount = countVars(content);
        results.push({ path: relPath, varCount });
      }
    }
  }

  walk(root);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

function countVars(content: string): number {
  return content.split('\n').filter(line =>
    line.trim() && !line.trim().startsWith('#'),
  ).length;
}

function isEnvFile(name: string): boolean {
  return name === '.env' || (name.startsWith('.env.') && name !== '.env.example');
}

function isGitignored(relPath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/$/, '');
    if (relPath === clean || relPath.startsWith(clean + '/')) {
      return true;
    }
  }
  return false;
}

function loadGitignore(root: string): string[] {
  const gitignorePath = join(root, '.gitignore');
  if (!existsSync(gitignorePath)) return [];
  return readFileSync(gitignorePath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}
