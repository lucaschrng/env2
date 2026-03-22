import type { MetadataRoute } from 'next';

const baseUrl = process.env.NODE_ENV === 'production'
  ? 'https://env2-docs.charoing-lucas.workers.dev'
  : 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: '/',
      userAgent: '*',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
