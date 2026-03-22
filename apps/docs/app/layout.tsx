import type { Metadata } from 'next';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { Geist, Geist_Mono } from 'next/font/google';

import './global.css';

export const metadata: Metadata = {
  description: 'Ephemeral encrypted .env sharing. Zero-knowledge by design.',
  metadataBase: new URL(
    process.env.NODE_ENV === 'production'
      ? 'https://env2-docs.charoing-lucas.workers.dev'
      : 'http://localhost:3000',
  ),
  openGraph: {
    siteName: 'env2',
    type: 'website',
  },
  title: {
    default: 'env2',
    template: '%s | env2',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

const geist = Geist({
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html className={`${geist.className} ${geistMono.variable}`} lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
