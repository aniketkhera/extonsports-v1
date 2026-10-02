import { NextResponse } from 'next/server'

// GET /api/court-availability
//
// Fourteen days, shown as two pages of seven. The upstream clamps at 14 and
// the cost is the same order either way (one hour-grid pass), so the pager is
// free: both weeks arrive in the first response and turning the page is state,
// not a round trip.
// ---------------------------------------------------------------------------
// Court-hours free per sport, per rate band, per day for the week ahead —
// the numbers behind the rate card's hover panel.
//
// A thin cached proxy, for the same two reasons as /api/availability beside
// it: the club uuid stays out of the browser bundle, and one cached response
// is shared by every visitor rather than each of them hitting the platform.
//
// ⛔ NOT THE SAME UPSTREAM AS /api/availability. That one proxies
// `next-availability`, a still-unbuilt contract returning one next-free SLOT
// per sport, and is the thing SHOW_NEXT_SLOT in Hero.tsx is parked behind.
// This proxies `court-availability`, which exists and is deployed. Two
// endpoints, two questions: "when could I next get on" versus "how much of
// the week is already committed". Only the second one is honest on a quiet
// Tuesday, which is why it is the one that shipped.
//
// Env:
//   ORANGISH_API_BASE  default https://app.orangish.io
//   EXTON_CLUB_ID      overrides the club below; normally unset
//
// ⚠️ THE CLUB ID IS DEFAULTED IN CODE, NOT REQUIRED FROM THE ENVIRONMENT, and
// that is deliberate. The sibling repo learned this the expensive way with its
// CALL_* variables: a value that exists only as an env var nobody set is not
// configuration, it is a no-op, and the feature ships dead. EXTON_CLUB_ID was
// not set in this project when the hover shipped (2026-10-02), so gating on it
// would have deployed a panel that never appears.
//
// It is not a secret — it is a location row id, and the upstream endpoint
// takes it as a public query parameter from anyone who asks. Keeping it out of
// the BROWSER bundle is the real point, and this file is server-only, so that
// still holds. The env var remains as an override for a second club.
//
// On any failure this returns an empty payload rather than an error, and the
// card renders no panel. A marketing page must not show a broken state
// because a platform call failed.

export const revalidate = 60

const CLUB_ID = process.env.EXTON_CLUB_ID || 'f9d70a9d-ca32-4dc3-877e-83815a45bb5f'
const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')

/** One sport × band × day. `band` is the PLATFORM's vocabulary. */
export type AvailabilityCell = {
  sport: string
  /** 'peak' | 'standard' | 'late_night'. 'standard' is this site's "off-peak". */
  band: string
  /** Club-local date, YYYY-MM-DD. */
  date: string
  free: number
  total: number
}

export type CourtAvailability = {
  days: string[]
  courtsBySport: Record<string, number>
  cells: AvailabilityCell[]
}

const EMPTY: CourtAvailability = { days: [], courtsBySport: {}, cells: [] }

export async function GET() {
  if (!CLUB_ID) return NextResponse.json(EMPTY)

  try {
    const res = await fetch(
      `${API_BASE}/api/public/court-availability?club=${encodeURIComponent(CLUB_ID)}&days=14`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) },
    )
    if (!res.ok) return NextResponse.json(EMPTY)

    const body = (await res.json()) as Partial<CourtAvailability>
    if (!Array.isArray(body.cells) || !Array.isArray(body.days)) return NextResponse.json(EMPTY)

    // Re-shaped rather than forwarded: the upstream may grow fields, and the
    // hero should only ever receive what it renders.
    return NextResponse.json({
      days: body.days.filter((d) => typeof d === 'string'),
      courtsBySport: body.courtsBySport ?? {},
      cells: body.cells
        .filter((c) => c && typeof c.sport === 'string' && typeof c.band === 'string'
          && typeof c.date === 'string' && typeof c.free === 'number' && typeof c.total === 'number')
        .map((c) => ({ sport: c.sport, band: c.band, date: c.date, free: c.free, total: c.total })),
    } satisfies CourtAvailability)
  } catch {
    // A platform blip must not take a hole out of the hero.
    return NextResponse.json(EMPTY)
  }
}
