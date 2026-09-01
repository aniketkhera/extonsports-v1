import type { MetadataRoute } from 'next'

// Public pages only. Admin, API and the token-bearing /unsubscribe page are
// deliberately excluded (they are also disallowed in robots.ts — keep the two
// files in agreement, since a URL that is listed here but blocked there is
// what trips Search Console's "Blocked by robots.txt" report).
//
// When a public route is added under app/, add it here too: the careers pages
// were live and marked `index, follow` for weeks while this file still only
// listed the homepage, so they carried no sitemap priority or lastModified.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://extonsports.com'
  const now = new Date()

  const routes: Array<{
    path: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    // Open coaching roles — these drive recruiting traffic, so they are
    // indexed. Drop the entry once a role is filled and the page comes down.
    { path: '/careers/head-badminton-coach', changeFrequency: 'weekly', priority: 0.8 },
  ]

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? `${base}/` : `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
