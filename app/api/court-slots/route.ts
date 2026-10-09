import { NextResponse } from 'next/server'

// GET /api/court-slots
// ---------------------------------------------------------------------------
// Which half-hours on which courts are taken, per club-local day — the grid
// behind the hero's "Show calendar of bookings" overlay.
//
// A thin cached proxy, for the same two reasons as the two endpoints beside
// it: the club uuid stays out of the browser bundle, and one cached response
// is shared by every visitor rather than each of them hitting the platform.
//
// ⛔ NOT THE SAME UPSTREAM AS /api/court-availability. That one proxies
// `court-availability`, which returns court-hours free per sport, band and
// day — a COUNT, which is what the rate card's hover panel draws. This
// proxies `court-slots`, which returns the SHAPE of the day: this court, this
// half hour, taken. Neither can be derived from the other, and the two must
// not be merged "because they both say availability".
//
// Env:
//   ORANGISH_API_BASE  default https://app.orangish.io
//   EXTON_CLUB_ID      overrides the club below; normally unset
//
// ⚠️ THE CLUB ID IS DEFAULTED IN CODE, NOT REQUIRED FROM THE ENVIRONMENT, for
// the reason written out at length in ./court-availability/route.ts: a value
// that exists only as an env var nobody set is not configuration, it is a
// no-op, and the feature ships dead. It is a location row id, not a secret —
// the upstream takes it as a public query parameter from anyone who asks — and
// this file is server-only, so it still stays out of the browser bundle.
//
// On any failure this returns an empty payload rather than an error, and the
// overlay renders its own "couldn't load" state. A marketing page must not
// show a broken state because a platform call failed.

export const revalidate = 60

const CLUB_ID = process.env.EXTON_CLUB_ID || 'f9d70a9d-ca32-4dc3-877e-83815a45bb5f'
const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')

/** One run of taken half-hours on one court, on one club-local day. */
export type SlotBlock = {
  /** Club-local date, YYYY-MM-DD. */
  date: string
  courtId: string
  /** Minutes from club-local midnight, inclusive. */
  from: number
  /** Minutes from club-local midnight, exclusive. 1440 is midnight. */
  to: number
  /** 'booking' = somebody hired it. 'programme' = academy, squad or lesson. */
  kind: 'booking' | 'programme'
  /**
   * ⛔ THE ONLY IDENTITY THIS PROXY WILL CARRY, and it is four fixed strings.
   *
   * The partner organisation holding the hour — SquashTigers, Chester County
   * Cricket Academy, Philadelphia Badminton, Sera Dance & Fitness — resolved
   * upstream in the platform's lib/court-partners.ts. Absent on everything
   * else, which the calendar draws as "Private".
   *
   * `who` was here until 2026-10-08 and carried the holder's initials ("RK").
   * It is gone: initials plus an exact court and hour identify a person at a
   * club this size, and this page is public and indexed.
   */
  org?: 'squashtigers' | 'ccca' | 'philadelphia-badminton' | 'sera'
}

export type CourtRef = {
  id: string
  sport: string
  /** The sport's own id. /book/courts picks its tab from this. */
  sportId: string
  name: string
  /** Just the distinguishing part — "2" out of "BADMINTON 2". */
  label: string
}

export type CourtSlots = {
  timeZone: string
  days: string[]
  courts: CourtRef[]
  blocks: SlotBlock[]
}

const EMPTY: CourtSlots = { timeZone: 'America/New_York', days: [], courts: [], blocks: [] }

/** The four keys this proxy will forward. Anything else is dropped silently. */
const PARTNERS = ['squashtigers', 'ccca', 'philadelphia-badminton', 'sera'] as const

/* How many days to ask the platform for.
 *
 * ⚠️ THE DEFAULT IS DELIBERATELY SMALL AND THE TV BOARD RELIES ON IT. /board
 * renders only the current day and relaunches every ten minutes; pulling a
 * year each time would be ~117 KB of which it uses a fraction. /calendar asks
 * for 365 explicitly because it is a page somebody opens to look ahead.
 *
 * Clamped here as well as upstream: this value reaches a query string, and a
 * caller asking for 100000 should get a sane number rather than an error. */
const DEFAULT_DAYS = 14
const MAX_DAYS = 365

export async function GET(req: Request) {
  const asked = Number(new URL(req.url).searchParams.get('days'))
  const days = Number.isFinite(asked) && asked > 0
    ? Math.min(Math.trunc(asked), MAX_DAYS)
    : DEFAULT_DAYS

  if (!CLUB_ID) return NextResponse.json(EMPTY)

  try {
    const res = await fetch(
      `${API_BASE}/api/public/court-slots?club=${encodeURIComponent(CLUB_ID)}&days=${days}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return NextResponse.json(EMPTY)

    const body = (await res.json()) as Partial<CourtSlots>
    if (!Array.isArray(body.days) || !Array.isArray(body.courts) || !Array.isArray(body.blocks)) {
      return NextResponse.json(EMPTY)
    }

    // Re-shaped rather than forwarded: the upstream may grow fields, and the
    // overlay should only ever receive what it renders.
    return NextResponse.json({
      timeZone: typeof body.timeZone === 'string' ? body.timeZone : EMPTY.timeZone,
      days: body.days.filter((d) => typeof d === 'string'),
      courts: body.courts
        .filter((c) => c && typeof c.id === 'string' && typeof c.sport === 'string')
        .map((c) => ({
          id: c.id,
          sport: c.sport,
          sportId: String(c.sportId ?? ''),
          name: String(c.name ?? ''),
          label: String(c.label ?? ''),
        })),
      blocks: body.blocks
        .filter((b) => b && typeof b.date === 'string' && typeof b.courtId === 'string'
          && typeof b.from === 'number' && typeof b.to === 'number'
          && (b.kind === 'booking' || b.kind === 'programme'))
        .map((b) => {
          // ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH, and that is the whole guard:
          // whatever the upstream sends, the only identity that can reach this
          // public page is one of four fixed keys. The previous version capped
          // `who` at four characters on the same reasoning — the upstream was
          // meant to have reduced it to initials, and forwarding a full name to
          // a public page on the strength of a remote response is the mistake
          // worth refusing locally. Now nothing textual is forwarded at all.
          const org = PARTNERS.find((k) => k === b.org)
          return {
            date: b.date, courtId: b.courtId, from: b.from, to: b.to, kind: b.kind,
            ...(org ? { org } : {}),
          }
        }),
    } satisfies CourtSlots)
  } catch {
    // A platform blip must not take a hole out of the hero.
    return NextResponse.json(EMPTY)
  }
}
