import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /my-bookings (2026-10-20): one guest's bookings, reached from an email. Also
        // noindex in its metadata and X-Robots-Tag (next.config.ts); absent from the
        // sitemap on purpose. /academies (2026-11-16): the academy partners' signed-in page,
        // the same three layers (orangish-app docs/academy-page.md §4) — its three page paths
        // by name, '$' ending the first: a bare '/academies' is a PREFIX rule and would also
        // block public/academies/ccca-*.png, the CCCA shield on the home page.
        disallow: ['/admin/', '/api/', '/unsubscribe/', '/my-bookings', '/academies$', '/academies/link', '/academies/open'],
      },
    ],
    sitemap: 'https://www.extonsports.com/sitemap.xml',
    host: 'https://www.extonsports.com',
  }
}
