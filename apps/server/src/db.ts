import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface ShareRow {
  ciphertext: string;
  downloads_left: number;
  expires_at: number;
  id: string;
}

export function createDb(dataDir: string): Database.Database {
  const isMemory = dataDir === ':memory:';

  if (!isMemory && !existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(isMemory ? ':memory:' : join(dataDir, 'env2.db'));

  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      ciphertext TEXT NOT NULL,
      downloads_left INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);
  `);

  return db;
}

export function startCleanup(db: Database.Database, intervalMs = 60_000): NodeJS.Timeout {
  const cleanup = db.prepare('DELETE FROM shares WHERE expires_at <= ?');

  return setInterval(() => {
    cleanup.run(Date.now());
  }, intervalMs);
}
