import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://nordicrun.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/api/', '/fr/dashboard', '/fr/plan', '/fr/profile', '/fr/cycle', '/fr/races', '/en/dashboard', '/en/plan', '/en/profile', '/en/cycle', '/en/races'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
