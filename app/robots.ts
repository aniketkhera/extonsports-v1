import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /my-bookings (2026-10-20): one guest's bookings, reached from an email. Also
        // noindex in its metadata and X-Robots-Tag (next.config.ts); absent from the
        // sitemap on purpose.
        disallow: ['/admin/', '/api/', '/unsubscribe/', '/my-bookings'],
      },
    ],
    sitemap: 'https://www.extonsports.com/sitemap.xml',
    host: 'https://www.extonsports.com',
  }
}
