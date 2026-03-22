import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { createDb, startCleanup } from './db.js';
import { sharesRoutes } from './routes.js';

const port = Number(process.env.PORT) || 3000;
const dataDir = process.env.DATA_DIR || './data';

const db = createDb(dataDir);
startCleanup(db);

const app = new Hono();

app.use('*', cors());

app.get('/health', c => c.json({ ok: true }));

app.route('/', sharesRoutes(db));

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`env2 server listening on http://localhost:${info.port}`);
});
