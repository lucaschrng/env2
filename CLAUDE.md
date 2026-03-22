# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Keep this file up to date

Whenever something is changed, decided, added, or removed that affects the architecture, conventions, commands, or structure of this project — update this file. Do not wait to be asked. Proactively keep CLAUDE.md in sync with the actual state of the project.

Also keep `README.md` (GitHub) and `packages/cli/README.md` (npm) up to date when commands, flags, architecture, or behavior changes. Same principle — don't wait to be asked.

## What is env2

env2 is an open-source CLI tool for ephemeral encrypted `.env` file sharing. One command to share, one command to receive. Zero-knowledge by design — the server never sees your secrets.

### How it works

1. `env2 share` → scans for `.env` files, encrypts them client-side (AES-256-GCM), uploads ciphertext to server
2. Returns a URL: `https://env2.dev/s/abc123#<key>` — the encryption key is in the URL fragment (`#`), which is **never sent to the server**
3. Teammate runs `env2 receive <url>` → fetches ciphertext, decrypts locally, writes `.env` files
4. Server deletes the blob after download (one-time use, TTL expiry)

## Monorepo structure (Turborepo)

```
apps/
  docs/       # Fumadocs — documentation site (docs.env2.dev) [not yet created]
  worker/     # Cloudflare Workers — managed server
  server/     # Node/Hono/SQLite — self-hostable Docker image
packages/
  cli/        # @griv/env2 — published to npm, bin: "env2"
  crypto/     # AES-256-GCM wrapper — Node built-in crypto, zero deps
  types/      # shared TypeScript types — manifest schema, API contract
```

## Commands

```bash
pnpm dev             # dev mode (turborepo)
pnpm build           # build all packages and apps
pnpm lint            # lint all packages and apps
pnpm lint:fix        # auto-fix lint errors
pnpm typecheck       # type-check all packages and apps
docker compose up    # run self-hosted server locally
```

## Architecture

### Encryption

- **AES-256-GCM** — symmetric encryption for the manifest (Node built-in `crypto`, zero deps)
- Random 32-byte key + 12-byte IV per share
- Key transmitted via URL fragment (`#`) — never touches the server
- IV prepended to ciphertext (standard practice)

### Manifest format

```json
{
  "version": 1,
  "files": [
    { "path": ".env", "content": "DB_URL=..." },
    { "path": "apps/web/.env", "content": "NEXT_PUBLIC_URL=..." }
  ]
}
```

The entire JSON manifest is encrypted as one blob.

### Server

Simple KV store with TTL. Two implementations behind one interface:

- **Cloudflare Workers + KV** — managed, globally distributed (default: env2.dev)
- **Node/Hono + SQLite** — self-hostable Docker image

```ts
interface Store {
  set(id: string, ciphertext: string, ttlSeconds: number, maxDownloads: number): Promise<void>
  get(id: string): Promise<string | null>
  decrementAndCheck(id: string): Promise<boolean>
}
```

No auth, no user table, no database beyond blob storage.

### CLI

- **commander** — argument parsing
- **@clack/prompts** — interactive UI (checkbox picker, confirmations)
- **Node built-in crypto** — AES-256-GCM encryption/decryption

### CLI commands

```bash
env2 share                      # interactive picker, all .env files pre-selected
env2 share apps/web/            # specific directory
env2 share .env apps/web/.env   # specific files
env2 share --ttl 30m            # custom expiry (default: 15m)
env2 share --downloads 3        # max downloads (default: 1)
env2 share --no-interactive     # skip picker, share all
env2 share --host <url>         # custom server

env2 receive <url>              # fetch + decrypt + write files
env2 receive <url> --dry-run    # preview without writing
env2 receive <url> --force      # skip overwrite confirmation
env2 receive <url> --stdout     # print to stdout instead

env2 config set host <url>      # set default server
env2 config get host            # read current
env2 config reset               # back to env2.dev
```

### CLI config

`~/.env2/config.json`:
```json
{
  "host": "https://env2.dev"
}
```

### URL format

```
https://env2.dev/s/abc123#aB3xK9mP...
                   └─ ID  └─ encryption key (base64url)
```

The `#` fragment is never sent to the server per HTTP spec. True zero-knowledge.

## Conventions

- **Always use pnpm** — never npm or yarn. Use `pnpm dlx` instead of `npx`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Feature branches can be messy — squash before merging to `main`
- Never commit secrets — `.gitignore` enforced
- npm scope: `@griv/env2`, npm username: `griv`
- ESLint: flat config with `typescript-eslint`, `@stylistic/eslint-plugin` (single quotes, semicolons), `eslint-plugin-perfectionist` (natural sort)
- Pre-commit: husky + lint-staged
