import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

interface ScannedFile {
  path: string;
  varCount: number;
}

export function scanEnvFiles(root: string): ScannedFile[] {
  const results: ScannedFile[] = [];

  walkDir(root, root, (relPath, fullPath, name) => {
    if (isEnvFile(name)) {
      const content = readFileSync(fullPath, 'utf-8');
      const varCount = countVars(content);
      results.push({ path: relPath, varCount });
    }
  });

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export function scanExampleFiles(root: string): string[] {
  const results: string[] = [];

  walkDir(root, root, (relPath, _fullPath, name) => {
    if (name === '.env.example') {
      results.push(relPath);
    }
  });

  return results.sort((a, b) => a.localeCompare(b));
}

export function walkDir(
  root: string,
  dir: string,
  callback: (relPath: string, fullPath: string, name: string) => void,
): void {
  const gitignorePatterns = loadGitignore(root);

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
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
      else {
        callback(relPath, fullPath, entry.name);
      }
    }
  }

  walk(dir);
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
