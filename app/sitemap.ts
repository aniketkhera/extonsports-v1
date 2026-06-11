import type { MetadataRoute } from 'next'

// Coming-soon shape — only the homepage is public. Admin, API and
// the token-bearing /unsubscribe page are deliberately excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://extonsports.com'
  const now = new Date()
  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ]
}
