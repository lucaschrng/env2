import type { CreateShareRequest, CreateShareResponse, FetchShareResponse } from '@env2/types';
import type Database from 'better-sqlite3';

import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';

import type { ShareRow } from './db.js';

export function sharesRoutes(db: Database.Database): Hono {
  const app = new Hono();

  const insertShare = db.prepare(
    'INSERT INTO shares (id, ciphertext, downloads_left, expires_at) VALUES (?, ?, ?, ?)',
  );
  const getShare = db.prepare('SELECT * FROM shares WHERE id = ?');
  const deleteShare = db.prepare('DELETE FROM shares WHERE id = ?');
  const decrementDownloads = db.prepare(
    'UPDATE shares SET downloads_left = downloads_left - 1 WHERE id = ?',
  );

  app.post('/s', async (c) => {
    const body = await c.req.json<CreateShareRequest>();

    if (!body.ciphertext || !body.ttl || !body.maxDownloads) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (body.ttl > 3600) {
      return c.json({ error: 'TTL cannot exceed 1 hour' }, 400);
    }

    if (body.maxDownloads > 10) {
      return c.json({ error: 'Max downloads cannot exceed 10' }, 400);
    }

    const id = randomUUID().replace(/-/g, '').slice(0, 12);
    const expiresAt = Date.now() + body.ttl * 1000;

    insertShare.run(id, body.ciphertext, body.maxDownloads, expiresAt);

    return c.json({ id } satisfies CreateShareResponse, 201);
  });

  app.get('/s/:id', (c) => {
    const { id } = c.req.param();

    const row = getShare.get(id) as ShareRow | undefined;

    if (!row) {
      return c.json({ error: 'Share not found or expired' }, 404);
    }

    if (row.expires_at < Date.now()) {
      deleteShare.run(id);
      return c.json({ error: 'Share expired' }, 404);
    }

    if (row.downloads_left <= 1) {
      deleteShare.run(id);
    }
    else {
      decrementDownloads.run(id);
    }

    return c.json({ ciphertext: row.ciphertext } satisfies FetchShareResponse);
  });

  return app;
}
