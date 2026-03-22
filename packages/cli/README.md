# @griv/env2

Ephemeral encrypted `.env` sharing. Zero-knowledge — the server never sees your secrets.

## Install

```bash
npm i -g @griv/env2
```

## Share

```bash
env2 share
```

```
◆ Select files to share
│ ✓ .env                (12 vars)
│ ✓ apps/web/.env       (8 vars)
│ ✓ apps/api/.env       (3 vars)
│
◆ .env (12 vars)
│ ✓ DATABASE_URL
│ ✓ DATABASE_POOL_SIZE
│ ✓ REDIS_URL
│
◇ Encrypting and uploading...
✔ Encrypted 3 file(s) — expires 15min, 1 download(s)
│ https://env2.dev/s/abc123#aB3xK9mP...
│
◇ Copy URL to clipboard?
└ Copied! Share it with your teammate.
```

## Receive

```bash
env2 receive https://env2.dev/s/abc123#key
```

```
◇ Fetching...
◆ Decrypted 3 file(s).
│
◆ .env (12 vars)
│ ✓ DATABASE_URL
│ ✓ DATABASE_POOL_SIZE
│ ✓ REDIS_URL
│
│ .env          ⚠ merge (file exists)
│ apps/web/.env ← new
│ apps/api/.env ← new
│
◇ Proceed?
└ Wrote 3 file(s).
```

Existing `.env` files are merged — your local vars are preserved, shared vars are added or updated.

## Commands

### `env2 share`

| Flag | Description | Default |
|------|-------------|---------|
| `--ttl <duration>` | Expiry (e.g. `5m`, `15m`, `1h`) | `15m` |
| `--downloads <n>` | Max downloads | `1` |
| `--root <path>` | Working directory | `.` |
| `--host <url>` | Custom server URL | configured host |
| `--no-interactive` | Skip pickers, share all | `false` |

### `env2 receive <url>`

| Flag | Description | Default |
|------|-------------|---------|
| `--root <path>` | Write relative to this dir | `.` |
| `--dry-run` | Preview without writing | `false` |
| `--force` | Skip confirmation prompts | `false` |
| `--overwrite` | Replace files instead of merging | `false` |
| `--no-interactive` | Accept all vars | `false` |
| `--stdout` | Print to stdout | `false` |

### `env2 config`

```bash
env2 config set host https://your-server.com  # self-hosted server
env2 config get host                           # show current
env2 config reset                              # back to default
```

## Security

Secrets are encrypted with AES-256-GCM before leaving your machine. The encryption key is embedded in the URL fragment (`#...`) which is never sent to the server per the HTTP spec. Shares self-destruct after download.

## License

MIT — [GitHub](https://github.com/lucaschrng/env2)
