import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkExampleSync } from './example-sync';
import { scanExampleFiles } from './scanner';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  log: {
    message: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
}));

import * as p from '@clack/prompts';

const mockedConfirm = vi.mocked(p.confirm);

let root: string;

function readFile(relPath: string): string {
  return readFileSync(join(root, relPath), 'utf-8');
}

function writeFile(relPath: string, content: string): void {
  const full = join(root, relPath);
  const dir = join(full, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  root = join(tmpdir(), `env2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe('scanExampleFiles', () => {
  it('finds .env.example at root', () => {
    writeFile('.env.example', 'FOO=bar\n');
    const result = scanExampleFiles(root);
    expect(result).toEqual(['.env.example']);
  });

  it('finds nested .env.example files', () => {
    writeFile('.env.example', 'A=1\n');
    writeFile('apps/web/.env.example', 'B=2\n');
    const result = scanExampleFiles(root);
    expect(result).toEqual(['.env.example', 'apps/web/.env.example']);
  });

  it('returns empty array when no .env.example exists', () => {
    writeFile('.env', 'FOO=bar\n');
    const result = scanExampleFiles(root);
    expect(result).toEqual([]);
  });

  it('skips node_modules', () => {
    writeFile('node_modules/.env.example', 'A=1\n');
    const result = scanExampleFiles(root);
    expect(result).toEqual([]);
  });
});

describe('checkExampleSync', () => {
  describe('no .env.example files', () => {
    it('does nothing', async () => {
      writeFile('.env', 'FOO=bar\n');
      await checkExampleSync(root);
      expect(mockedConfirm).not.toHaveBeenCalled();
    });
  });

  describe('.env.example exists but .env does not', () => {
    it('prompts to scaffold and creates .env on confirm', async () => {
      writeFile('.env.example', '# Database\nDB_URL=postgres://localhost\nDB_PORT=5432\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      expect(mockedConfirm).toHaveBeenCalledOnce();
      expect(existsSync(join(root, '.env'))).toBe(true);
      const content = readFile('.env');
      expect(content).toContain('DB_URL=postgres://localhost');
      expect(content).toContain('DB_PORT=5432');
      expect(content).toContain('# Database');
    });

    it('does not create .env when user declines', async () => {
      writeFile('.env.example', 'FOO=bar\n');
      mockedConfirm.mockResolvedValueOnce(false);

      await checkExampleSync(root);

      expect(existsSync(join(root, '.env'))).toBe(false);
    });

    it('does not create .env when user cancels', async () => {
      writeFile('.env.example', 'FOO=bar\n');
      mockedConfirm.mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(p.isCancel).mockReturnValueOnce(true);

      await checkExampleSync(root);

      expect(existsSync(join(root, '.env'))).toBe(false);
    });

    it('scaffolds nested .env from nested .env.example', async () => {
      writeFile('apps/web/.env.example', 'NEXT_PUBLIC_URL=http://localhost:3000\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      expect(existsSync(join(root, 'apps/web/.env'))).toBe(true);
      expect(readFile('apps/web/.env')).toContain('NEXT_PUBLIC_URL=http://localhost:3000');
    });
  });

  describe('both .env.example and .env exist', () => {
    it('does nothing when .env has all keys from .env.example', async () => {
      writeFile('.env.example', 'FOO=example\nBAR=example\n');
      writeFile('.env', 'FOO=real\nBAR=real\n');

      await checkExampleSync(root);

      expect(mockedConfirm).not.toHaveBeenCalled();
    });

    it('does nothing when .env has extra keys not in .env.example', async () => {
      writeFile('.env.example', 'FOO=example\n');
      writeFile('.env', 'FOO=real\nEXTRA=value\n');

      await checkExampleSync(root);

      expect(mockedConfirm).not.toHaveBeenCalled();
    });

    it('detects missing keys and adds them on confirm', async () => {
      writeFile('.env.example', 'FOO=example\nBAR=example\nBAZ=example\n');
      writeFile('.env', 'FOO=real\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      expect(mockedConfirm).toHaveBeenCalledOnce();
      const content = readFile('.env');
      expect(content).toContain('FOO=real');
      expect(content).toContain('BAR=');
      expect(content).toContain('BAZ=');
      // Missing keys should have empty values, not example values
      expect(content).not.toContain('BAR=example');
      expect(content).not.toContain('BAZ=example');
    });

    it('does not modify .env when user declines', async () => {
      writeFile('.env.example', 'FOO=example\nBAR=example\n');
      writeFile('.env', 'FOO=real\n');
      mockedConfirm.mockResolvedValueOnce(false);

      await checkExampleSync(root);

      const content = readFile('.env');
      expect(content).toBe('FOO=real\n');
      expect(content).not.toContain('BAR');
    });

    it('preserves existing .env content when adding missing keys', async () => {
      writeFile('.env.example', 'FOO=x\nBAR=x\nBAZ=x\n');
      writeFile('.env', '# My config\nFOO=real\n\n# Other\nBAZ=real\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      const content = readFile('.env');
      expect(content).toContain('# My config');
      expect(content).toContain('FOO=real');
      expect(content).toContain('BAZ=real');
      expect(content).toContain('BAR=');
    });

    it('preserves comment grouping from .env.example for missing keys', async () => {
      writeFile('.env.example', '# Database\nDB_URL=x\nDB_PORT=x\n\n# Redis\nREDIS_URL=x\n');
      writeFile('.env', 'DB_URL=real\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      const content = readFile('.env');
      expect(content).toContain('# Database');
      expect(content).toContain('DB_PORT=');
      expect(content).toContain('# Redis');
      expect(content).toContain('REDIS_URL=');
    });
  });

  describe('multiple .env.example files', () => {
    it('handles root and nested .env.example independently', async () => {
      writeFile('.env.example', 'ROOT_KEY=x\n');
      writeFile('apps/web/.env.example', 'WEB_KEY=x\n');
      // Root .env exists but missing key, nested .env doesn't exist
      writeFile('.env', 'OTHER=val\n');

      // First confirm: add missing ROOT_KEY to .env
      mockedConfirm.mockResolvedValueOnce(true);
      // Second confirm: create apps/web/.env from .env.example
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      expect(mockedConfirm).toHaveBeenCalledTimes(2);
      expect(readFile('.env')).toContain('ROOT_KEY=');
      expect(existsSync(join(root, 'apps/web/.env'))).toBe(true);
      expect(readFile('apps/web/.env')).toContain('WEB_KEY=x');
    });
  });

  describe('edge cases', () => {
    it('skips .env.example with no vars (only comments)', async () => {
      writeFile('.env.example', '# This is just a comment\n# Another comment\n');

      await checkExampleSync(root);

      expect(mockedConfirm).not.toHaveBeenCalled();
    });

    it('handles .env.example with empty values', async () => {
      writeFile('.env.example', 'SECRET_KEY=\nAPI_URL=\n');
      mockedConfirm.mockResolvedValueOnce(true);

      await checkExampleSync(root);

      expect(existsSync(join(root, '.env'))).toBe(true);
      const content = readFile('.env');
      expect(content).toContain('SECRET_KEY=');
      expect(content).toContain('API_URL=');
    });

    it('values in .env can differ from .env.example without triggering', async () => {
      writeFile('.env.example', 'FOO=default_value\n');
      writeFile('.env', 'FOO=completely_different\n');

      await checkExampleSync(root);

      // Different values are fine — only missing keys matter
      expect(mockedConfirm).not.toHaveBeenCalled();
    });
  });
});
