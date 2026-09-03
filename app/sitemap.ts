import type { MetadataRoute } from 'next'

// Public pages only. Admin, API and the token-bearing /unsubscribe page are
// deliberately excluded (they are also disallowed in robots.ts — keep the two
// files in agreement, since a URL that is listed here but blocked there is
// what trips Search Console's "Blocked by robots.txt" report).
//
// When a public route is added under app/, add it here too. A public route
// that is live and marked `index, follow` while this file still lists only the
// homepage carries no sitemap priority or lastModified — which is exactly what
// happened to the careers pages, for weeks, before they came down.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://extonsports.com'
  const now = new Date()

  const routes: Array<{
    path: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  ]

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? `${base}/` : `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
