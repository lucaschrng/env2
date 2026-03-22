# env2

Ephemeral encrypted `.env` sharing. One command to share, one to receive. Zero-knowledge — the server never sees your secrets.

## How it works

```
env2 share → encrypts .env files → uploads ciphertext → returns URL
                                                          ↓
                                        https://env2.dev/s/abc123#key
                                                                  ↑
                                              encryption key in fragment
                                              (never sent to server)
                                                          ↓
env2 receive <url> → fetches ciphertext → decrypts locally → writes .env files
                                                          ↓
                                              server deletes blob (one-time use)
```

The encryption key lives in the URL fragment (`#...`). Per the HTTP spec, fragments are never sent to the server. The server only stores encrypted blobs it can't read.

## Install

```bash
npm i -g @griv/env2
```

## Usage

### Share

```bash
env2 share
```

Scans for `.env` files, lets you pick which files and vars to include, encrypts everything, and gives you a URL.

### Receive

```bash
env2 receive https://env2.dev/s/abc123#key
```

Fetches, decrypts, and writes files. Per-var selection and smart merge with existing `.env` files — existing vars are preserved, new vars appended, selected vars updated in place.

## Security

- **AES-256-GCM** encryption (Node built-in `crypto`, zero dependencies)
- Random 32-byte key + 12-byte IV per share
- Key transmitted via URL fragment — never hits the server
- Shares expire (default 15 minutes) and self-destruct after download (default 1 download)
- Server is a dumb blob store — it never has the decryption key

## Self-hosting

The default server runs on Cloudflare Workers. You can self-host with Docker:

```bash
docker run -d -p 3000:3000 -v env2-data:/data ghcr.io/lucaschrng/env2-server
```

Or with Docker Compose:

```bash
git clone https://github.com/lucaschrng/env2.git
cd env2
docker compose up -d
```

Then point the CLI to your server:

```bash
env2 config set host http://localhost:3000
```

## Monorepo structure

```
apps/
  worker/       # Cloudflare Workers — managed server
  server/       # Node/Hono/SQLite — self-hostable Docker image
packages/
  cli/          # @griv/env2 — the CLI tool
  crypto/       # AES-256-GCM encryption utilities
  types/        # Shared TypeScript types
```

## Development

```bash
git clone https://github.com/lucaschrng/env2.git
cd env2
pnpm install
pnpm build

# Start the worker locally (Cloudflare Workers)
pnpm --filter @env2/worker dev

# Or start the self-hosted server locally
pnpm --filter @env2/server dev

# Test the CLI (pointing to local server)
cd /your/project
node /path/to/env2/packages/cli/dist/index.js share --host http://localhost:3000
```

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. `pnpm lint && pnpm build` to verify
5. Open a PR

## License

MIT
