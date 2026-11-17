import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/login', '/register', '/reset-password', '/forgot-password'],
    },
    sitemap: 'https://music.dcintelix.rw/sitemap.xml',
  };
}
