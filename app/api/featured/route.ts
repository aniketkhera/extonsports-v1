import { NextResponse } from 'next/server'

// GET /api/featured
// ---------------------------------------------------------------------------
// Schedule and price for the sessions on the hero's Featured rail. The site
// deliberately holds none of this: a class time or a drop-in price written into
// the marketing copy goes stale the moment someone reschedules on the platform,
// and the visitor finds out only at checkout. So the card renders the name and
// the description from this repo and asks Orangish for everything that moves.
//
// Upstream contract (app.orangish.io):
//
//   GET /api/public/sessions?club=<location-uuid>&slugs=<a,b,c>
//   → 200 { sessions: Array<{ slug: string,
//                             nextStartsAt?: ISO8601,
//                             venue?: string,
//                             priceCents?: number,
//                             spotsLeft?: number }> }
//
// That endpoint does not exist yet. Until it ships this route returns an empty
// list, and the card simply omits its schedule line rather than inventing one.
//
// Env:
//   ORANGISH_API_BASE  default https://app.orangish.io
//   EXTON_CLUB_ID      the Exton location uuid on the platform

export const revalidate = 300

const CLUB_ID = process.env.EXTON_CLUB_ID
const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')

/** Slugs the Featured rail asks about. Keep in step with FEATURES. */
const FEATURED_SLUGS = ['bollywood-dance']

export type FeaturedSession = {
  slug: string
  /** "Saturdays · 10:30 AM · Studio", or null when unscheduled. */
  when: string | null
  /** "$25 drop-in", or null when the platform has no price. */
  price: string | null
  /** Null hides the hint entirely rather than implying an empty class. */
  spotsLeft: number | null
}

export type FeaturedPayload = { sessions: FeaturedSession[] }

function formatWhen(startsAt: string, venue?: string, timeZone = 'America/New_York'): string | null {
  const d = new Date(startsAt)
  if (Number.isNaN(d.getTime())) return null

  const day = d.toLocaleDateString('en-US', { weekday: 'long', timeZone })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
  // "Saturdays" reads as the recurring slot the class actually is, rather than
  // pinning the reader to one specific date.
  return [`${day}s`, time, venue].filter(Boolean).join(' · ')
}

function formatPrice(cents: number): string {
  const dollars = cents / 100
  const amount = Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`
  return `${amount} drop-in`
}

export async function GET() {
  if (!CLUB_ID) return NextResponse.json({ sessions: [] } satisfies FeaturedPayload)

  try {
    const res = await fetch(
      `${API_BASE}/api/public/sessions?club=${encodeURIComponent(CLUB_ID)}` +
        `&slugs=${encodeURIComponent(FEATURED_SLUGS.join(','))}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) },
    )
    if (!res.ok) return NextResponse.json({ sessions: [] } satisfies FeaturedPayload)

    const body = (await res.json()) as {
      sessions?: Array<{
        slug?: string
        nextStartsAt?: string
        venue?: string
        priceCents?: number
        spotsLeft?: number
      }>
    }

    const sessions: FeaturedSession[] = (body.sessions ?? [])
      .map((s) => {
        if (!s.slug) return null
        return {
          slug: s.slug,
          when: s.nextStartsAt ? formatWhen(s.nextStartsAt, s.venue) : null,
          price: typeof s.priceCents === 'number' ? formatPrice(s.priceCents) : null,
          spotsLeft: typeof s.spotsLeft === 'number' ? s.spotsLeft : null,
        }
      })
      .filter((s): s is FeaturedSession => s !== null)

    return NextResponse.json({ sessions } satisfies FeaturedPayload)
  } catch {
    return NextResponse.json({ sessions: [] } satisfies FeaturedPayload)
  }
}
