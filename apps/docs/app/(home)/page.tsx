import { Clock, Lock, Server } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl py-16 sm:py-24">
        <p className="mb-4 text-sm font-medium text-fd-muted-foreground">
          Open-source CLI tool
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Share
          {' '}
          <code className="text-fd-primary">.env</code>
          {' '}
          files.
          <br />
          Zero-knowledge.
        </h1>
        <p className="mb-8 text-lg text-fd-muted-foreground">
          One command to share, one command to receive. Encrypted client-side with AES-256-GCM. The server never sees your secrets.
        </p>

        <div className="mx-auto mb-8 max-w-md overflow-hidden rounded-xl border border-fd-border bg-fd-card">
          <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2">
            <span className="size-3 rounded-full bg-red-400" />
            <span className="size-3 rounded-full bg-yellow-400" />
            <span className="size-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-fd-muted-foreground">Terminal</span>
          </div>
          <div className="px-4 py-3 text-left font-mono text-sm">
            <p className="text-fd-muted-foreground">
              <span className="text-fd-primary">$</span>
              {' '}
              npm i -g @griv/env2
            </p>
            <p className="mt-1 text-fd-muted-foreground">
              <span className="text-fd-primary">$</span>
              {' '}
              env2 share
            </p>
            <p className="mt-1 text-fd-foreground">
              ✔ Encrypted 3 file(s)
            </p>
            <p className="text-fd-foreground">
              {'  '}
              https://env2.dev/s/abc123#aB3xK9...
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            className="inline-flex items-center rounded-lg bg-fd-primary px-6 py-2.5 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
            href="/docs/quickstart"
          >
            Get started
          </Link>
          <Link
            className="inline-flex items-center rounded-lg border border-fd-border bg-fd-card px-6 py-2.5 text-sm font-medium text-fd-foreground transition-colors hover:bg-fd-accent"
            href="/docs"
          >
            Documentation
          </Link>
        </div>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 pb-16 sm:grid-cols-3">
        <div className="rounded-xl border border-fd-border bg-fd-card p-6 text-left">
          <Lock className="mb-3 size-5 text-fd-primary" />
          <h3 className="mb-1 font-semibold text-fd-foreground">Encrypted</h3>
          <p className="text-sm text-fd-muted-foreground">
            AES-256-GCM encryption. The key never leaves your machine.
          </p>
        </div>
        <div className="rounded-xl border border-fd-border bg-fd-card p-6 text-left">
          <Clock className="mb-3 size-5 text-fd-primary" />
          <h3 className="mb-1 font-semibold text-fd-foreground">Ephemeral</h3>
          <p className="text-sm text-fd-muted-foreground">
            One-time use. Auto-deletes after download or TTL expiry.
          </p>
        </div>
        <div className="rounded-xl border border-fd-border bg-fd-card p-6 text-left">
          <Server className="mb-3 size-5 text-fd-primary" />
          <h3 className="mb-1 font-semibold text-fd-foreground">Self-hostable</h3>
          <p className="text-sm text-fd-muted-foreground">
            Run your own server with Docker. Full control over your data.
          </p>
        </div>
      </div>
    </main>
  );
}
