import type { CreateShareRequest, CreateShareResponse, FetchShareResponse } from '@env2/types';

import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  SHARES: KVNamespace;
}

interface ShareMetadata {
  downloadsLeft: number;
  expiresAt: number;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/health', c => c.json({ ok: true }));

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

  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  const metadata: ShareMetadata = {
    downloadsLeft: body.maxDownloads,
    expiresAt: Date.now() + body.ttl * 1000,
  };

  await c.env.SHARES.put(id, body.ciphertext, {
    expirationTtl: body.ttl,
    metadata,
  });

  return c.json({ id } satisfies CreateShareResponse, 201);
});

app.get('/s/:id', async (c) => {
  const { id } = c.req.param();

  const { metadata, value: ciphertext } = await c.env.SHARES.getWithMetadata<ShareMetadata>(id);

  if (!ciphertext || !metadata) {
    return c.json({ error: 'Share not found or expired' }, 404);
  }

  if (metadata.expiresAt < Date.now()) {
    await c.env.SHARES.delete(id);
    return c.json({ error: 'Share expired' }, 404);
  }

  if (metadata.downloadsLeft <= 1) {
    await c.env.SHARES.delete(id);
  }
  else {
    await c.env.SHARES.put(id, ciphertext, {
      expirationTtl: Math.max(1, Math.floor((metadata.expiresAt - Date.now()) / 1000)),
      metadata: { ...metadata, downloadsLeft: metadata.downloadsLeft - 1 },
    });
  }

  return c.json({ ciphertext } satisfies FetchShareResponse);
});

export default app;
