import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';

const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://env2-docs.charoing-lucas.workers.dev'
  : 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: 'monthly',
      priority: 1,
      url: baseUrl,
    },
    ...source.getPages().map(page => ({
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      url: `${baseUrl}${page.url}`,
    })),
  ];
}
