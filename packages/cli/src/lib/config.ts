import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.env2');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_HOST = 'https://env2-worker.charoing-lucas.workers.dev';

interface Config {
  host: string;
}

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return { host: DEFAULT_HOST };
  }
  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(raw) as Config;
}

export function resetConfig(): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify({ host: DEFAULT_HOST }, null, 2) + '\n');
}

export function setConfig(key: keyof Config, value: string): void {
  ensureDir();
  const config = getConfig();
  config[key] = value;
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}
