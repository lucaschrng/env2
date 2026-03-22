import Database from 'better-sqlite3';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDb } from './db.js';
import { sharesRoutes } from './routes.js';

function createApp(db: Database.Database): Hono {
  const app = new Hono();
  app.route('/', sharesRoutes(db));
  return app;
}

async function post(app: Hono, body: Record<string, unknown>) {
  return app.request('/s', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

describe('POST /s', () => {
  let db: Database.Database;
  let app: Hono;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates a share and returns 201', async () => {
    const res = await post(app, { ciphertext: 'test', maxDownloads: 1, ttl: 60 });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTypeOf('string');
    expect(body.id).toHaveLength(12);
  });

  it('rejects missing fields with 400', async () => {
    const res = await post(app, { ciphertext: 'test' });
    expect(res.status).toBe(400);
  });

  it('rejects ttl > 3600 with 400', async () => {
    const res = await post(app, { ciphertext: 'test', maxDownloads: 1, ttl: 9999 });
    expect(res.status).toBe(400);
  });

  it('rejects maxDownloads > 10 with 400', async () => {
    const res = await post(app, { ciphertext: 'test', maxDownloads: 99, ttl: 60 });
    expect(res.status).toBe(400);
  });
});

describe('GET /s/:id', () => {
  let db: Database.Database;
  let app: Hono;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns ciphertext on first fetch', async () => {
    const create = await post(app, { ciphertext: 'secret', maxDownloads: 1, ttl: 60 });
    const { id } = await create.json();

    const res = await app.request(`/s/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ciphertext).toBe('secret');
  });

  it('returns 404 after maxDownloads exhausted', async () => {
    const create = await post(app, { ciphertext: 'secret', maxDownloads: 1, ttl: 60 });
    const { id } = await create.json();

    await app.request(`/s/${id}`);
    const res = await app.request(`/s/${id}`);
    expect(res.status).toBe(404);
  });

  it('allows multiple downloads when maxDownloads > 1', async () => {
    const create = await post(app, { ciphertext: 'data', maxDownloads: 3, ttl: 60 });
    const { id } = await create.json();

    expect((await app.request(`/s/${id}`)).status).toBe(200);
    expect((await app.request(`/s/${id}`)).status).toBe(200);
    expect((await app.request(`/s/${id}`)).status).toBe(200);
    expect((await app.request(`/s/${id}`)).status).toBe(404);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await app.request('/s/doesnotexist');
    expect(res.status).toBe(404);
  });

  it('returns 404 for expired share', async () => {
    const create = await post(app, { ciphertext: 'data', maxDownloads: 1, ttl: 60 });
    const { id } = await create.json();

    // Manually expire the share by updating expires_at to the past
    db.prepare('UPDATE shares SET expires_at = ? WHERE id = ?').run(Date.now() - 1000, id);

    const res = await app.request(`/s/${id}`);
    expect(res.status).toBe(404);
  });
});
