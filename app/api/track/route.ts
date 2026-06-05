import { NextRequest, NextResponse } from 'next/server'
import { insertRow, supabaseConfigured, PROPERTY } from '../../../lib/supabase'

// POST /api/track  { path?, referrer?, utm_source?, utm_medium?, utm_campaign? }
//
// Fired once per page load by a small client beacon. Logs one row per
// visit to the `visits` table with geo (from Vercel edge headers) so we
// can see per-visitor origin (region/country/referrer) for ALL visitors,
// not just signups.
//
// Fully best-effort + fire-and-forget: always returns 204 quickly, never
// blocks the page, never surfaces errors to the client.

// Lightweight bot detection from the user-agent. Not exhaustive — just
// catches the obvious crawlers/monitors so they can be filtered out of
// human-traffic reports. Anything flagged is still stored (is_bot=true).
const BOT_RE = /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch|vercel-screenshot|gptbot|claudebot|ahrefs|semrush/i

function deviceFromUa(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobi|iphone|android.*mobile|phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

export async function POST(req: NextRequest) {
  // Always succeed from the client's perspective.
  try {
    if (!supabaseConfigured()) return new NextResponse(null, { status: 204 })

    let body: Record<string, string | null> = {}
    try { body = await req.json() } catch { /* empty beacon is fine */ }

    // Don't log admin traffic — only public-site visits are interesting.
    const path = clean(body.path)
    if (path && path.startsWith('/admin')) return new NextResponse(null, { status: 204 })

    const ua = req.headers.get('user-agent') || ''
    const is_bot = BOT_RE.test(ua)

    const hdr = (name: string) => {
      const v = req.headers.get(name)
      return v ? decodeURIComponent(v) : null
    }

    await insertRow('visits', {
      property:     PROPERTY,
      path,
      referrer:     clean(body.referrer),
      utm_source:   clean(body.utm_source),
      utm_medium:   clean(body.utm_medium),
      utm_campaign: clean(body.utm_campaign),
      country:      req.headers.get('x-vercel-ip-country') || null,
      region:       hdr('x-vercel-ip-country-region'),
      city:         hdr('x-vercel-ip-city'),
      device:       deviceFromUa(ua),
      is_bot,
    }, 'return=minimal')
  } catch (e) {
    console.error('[track] failed:', e instanceof Error ? e.message : e)
  }
  return new NextResponse(null, { status: 204 })
}

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  return s.slice(0, 500)
}
