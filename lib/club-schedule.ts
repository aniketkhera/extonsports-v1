/**
 * The club's programme timetable, read from the platform.
 *
 * ── WHY THIS IS A LIB AND NOT A ROUTE ───────────────────────────────────────
 * Two routes need the same upstream: /api/schedule feeds the hero roster and
 * /api/featured feeds the Featured rail. They want different shapes out, but
 * the fetch, the field whitelist, the timezone handling and the recurrence
 * derivation are identical — and those are exactly the parts that must not
 * drift, because a wrong hour published in two places is twice as wrong.
 *
 * ── THE UPSTREAM THAT ACTUALLY EXISTS ───────────────────────────────────────
 * Both routes were originally written against endpoints that were never built:
 *
 *   /api/public/sessions          (featured)      → 404
 *   /api/public/next-availability (availability)  → 404
 *
 * So https://extonsports.com/api/featured returned {"sessions":[]} from the day
 * it shipped, and the Featured rail has never shown a schedule. The endpoint
 * that does exist is:
 *
 *   GET https://app.orangish.io/api/squads?location_id=<uuid>
 *   → 200 { sessions: group_sessions[] }
 *
 * It is deliberately unauthenticated ("NO auth gate here, deliberately. The
 * classes list is PUBLIC by owner decision" — orangish-app
 * app/api/squads/route.ts:10-15). Verified anonymously: 200, real sessions.
 *
 * ⛔ SERVER-SIDE ONLY, for two independent reasons:
 *
 *   1. /api/squads sends no Access-Control-* header, so a browser fetch from
 *      extonsports.com is blocked outright.
 *   2. Its payload hands anonymous callers the club's INTERNAL config —
 *      locations.features (access_paused, door_mechanism, hide_schedule_details,
 *      pos, public_join) and the Stripe fee-mode columns. Everything below is an
 *      explicit whitelist; the upstream JSON never reaches the client.
 *
 * Env:
 *   ORANGISH_API_BASE  default https://app.orangish.io
 *   EXTON_CLUB_SLUG    default exton-sports
 *   EXTON_CLUB_ID      optional; skips the slug→uuid lookup when set
 */

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
const SLUG = process.env.EXTON_CLUB_SLUG || 'exton-sports'
const CLUB_ID = process.env.EXTON_CLUB_ID
const FALLBACK_TZ = 'America/New_York'

/**
 * One multi-session pack a programme sells.
 *
 * `price` is the STICKER — the number the Studio prints on its flyer, and the
 * one the court rate card next to it also quotes. `allIn` is what checkout
 * actually takes once Exton's passed-on Stripe fee is grossed up, published by
 * the platform rather than derived here so the two can never disagree about the
 * fee. Which of the two a surface shows is that surface's call; both are
 * carried because a mirror that drops half the answer is how drift starts.
 */
export type PackPrice = {
  /** Sessions in the pack, e.g. 4. */
  quantity: number
  /** "$80" — pre-fee, matching the rate card's convention. */
  price: string
  /** "$82.70" — what the card is charged. */
  allIn: string | null
  /** 45, or null when the pack does not expire. */
  validityDays: number | null
}

/** One programme's timetable, already formatted. Nulls mean "say nothing". */
export type ProgramSchedule = {
  /** Matches squad_programs.name, e.g. "Bollywood Dance". */
  program: string
  /** "Tuesdays & Thursdays · 7:00 PM", or null when it cannot be derived. */
  when: string | null
  /** "60 min", or null. */
  duration: string | null
  /** "$25", or null when the platform has no rate. */
  price: string | null
  /** Upcoming sessions counted, so the UI can say "14 upcoming". */
  upcoming: number
  /**
   * "Sep 15" — the first session, but ONLY while the programme has not begun.
   *
   * Derived, not typed, and deliberately self-expiring: set only when NO
   * session has already happened. Once the first passes, the earliest remaining
   * session stops being a start date, and a hardcoded "Starts Sep 15" would
   * still be on the page in November insisting otherwise.
   */
  startsOn: string | null
  /** Authoritative from the platform; the roster is withheld for this club. */
  full: boolean
  /**
   * Multi-session packs, cheapest first. EMPTY is the normal case — most
   * programmes sell none — so a surface must render nothing rather than an
   * empty heading.
   */
  packs: PackPrice[]
}

/** Only the fields this module is willing to look at. Nothing else is read. */
type SquadRow = {
  scheduled_at?: string
  duration_mins?: number
  member_rate?: number
  status?: string
  is_full?: boolean
  squad_programs?: { name?: string } | null
  locations?: { timezone?: string } | null
}

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** What /api/public/clubs/<slug> gives us: the uuid, and the price book. */
type ClubFacts = {
  id: string | null
  /** Programme name -> its packs, cheapest first. */
  packsByProgram: Map<string, PackPrice[]>
}

const NO_FACTS: ClubFacts = { id: null, packsByProgram: new Map() }

/** The platform's shape. Everything else in the payload is ignored. */
type ClubProgramRow = {
  name?: string
  packs?: Array<{
    quantity?: number
    rate?: number | null
    all_in?: number | null
    validity_days?: number | null
  }>
}

/**
 * The Exton location uuid, and the pack prices that arrive with it.
 *
 * EXTON_CLUB_ID is set nowhere today, which is the second reason /api/featured
 * returned empty even when its upstream was healthy — it short-circuited before
 * fetching. So the slug is the real source: /api/public/clubs/<slug> returns the
 * id, and EXTON_CLUB_SLUG already has a working default, the same one
 * lib/club-pricing.ts relies on.
 *
 * ── WHY THE PACKS COME FROM HERE AND NOT /api/squads ────────────────────────
 * /api/squads returns SESSIONS. A pack is priced on the PROGRAMME
 * (squad_program_packs), which that payload does not carry. The club endpoint
 * does, and it is the same endpoint lib/club-pricing.ts already reads for the
 * player caps — so the packs cost this site nothing: no new request, and the
 * fetch cache dedupes it against the id lookup that was happening anyway.
 *
 * ⚠️ THE CLUB_ID SHORTCUT NO LONGER SKIPS THE FETCH. It used to return early,
 * which would now mean "an id but no prices" — packs silently missing at
 * exactly the deployment that has the env var set. The env var still avoids
 * TRUSTING the endpoint for the id; it no longer avoids calling it.
 */
async function fetchClubFacts(): Promise<ClubFacts> {
  try {
    const res = await fetch(`${API_BASE}/api/public/clubs/${SLUG}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return { ...NO_FACTS, id: CLUB_ID ?? null }
    const json = (await res.json()) as { club?: { id?: string; programs?: ClubProgramRow[] } }

    const packsByProgram = new Map<string, PackPrice[]>()
    for (const pr of json.club?.programs ?? []) {
      if (!pr?.name || !Array.isArray(pr.packs)) continue
      const packs = pr.packs
        // A pack with no price is a size the club declined to sell. The
        // platform already filters these; re-checking costs nothing and keeps
        // "$NaN classes" off the page if that ever changes.
        .filter((pk) => typeof pk?.quantity === 'number' && typeof pk?.rate === 'number')
        .map((pk) => ({
          quantity: pk.quantity as number,
          price: formatPrice(pk.rate as number),
          allIn: typeof pk.all_in === 'number' ? formatPrice(pk.all_in) : null,
          validityDays: typeof pk.validity_days === 'number' ? pk.validity_days : null,
        }))
        .sort((a, b) => a.quantity - b.quantity)
      if (packs.length) packsByProgram.set(pr.name, packs)
    }

    return { id: CLUB_ID ?? json.club?.id ?? null, packsByProgram }
  } catch {
    return { ...NO_FACTS, id: CLUB_ID ?? null }
  }
}

/**
 * "Tuesdays & Thursdays · 7:00 PM" from a list of dates.
 *
 * Derived rather than read: every Exton row comes back with
 * recurrence_pattern_id null and no endpoint joins recurrence_patterns, so the
 * weekly rule only exists as the shape of the dates themselves.
 *
 * ⚠️ The timezone is not decoration. These arrive as 23:00:00+00, which is
 * 7:00 PM America/New_York. Formatting without an explicit zone publishes the
 * wrong hour on a server in any other zone, and shifts silently at DST.
 */
function formatWhen(dates: Date[], tz: string): string | null {
  if (dates.length === 0) return null

  const days: string[] = []
  const times: string[] = []
  for (const d of dates) {
    const day = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz })
    if (!days.includes(day)) days.push(day)
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
    if (!times.includes(time)) times.push(time)
  }

  days.sort((a, b) => WEEK.indexOf(a) - WEEK.indexOf(b))

  // Plural because it is a recurring slot, not one date. Seven days is every
  // day, and "Sundays & Mondays & ..." is nobody's idea of a timetable.
  const dayPart =
    days.length === WEEK.length ? '7 days a week' : days.map((d) => `${d}s`).join(' & ')
  // More than two start times has no honest one-line summary, so it falls back
  // to the next session's time rather than listing five.
  const timePart = times.length <= 2 ? times.join(' / ') : times[0]
  return [dayPart, timePart].filter(Boolean).join(' · ')
}

function formatPrice(rate: number): string {
  return Number.isInteger(rate) ? `$${rate}` : `$${rate.toFixed(2)}`
}

/**
 * Every programme with upcoming sessions, or [] when the platform cannot be
 * reached. Never throws: a marketing page with a hole in it beats one that
 * errors, which is the same stance lib/club-pricing.ts takes for the caps.
 */
export async function fetchProgramSchedules(): Promise<ProgramSchedule[]> {
  const { id: clubId, packsByProgram } = await fetchClubFacts()
  if (!clubId) return []

  try {
    const res = await fetch(`${API_BASE}/api/squads?location_id=${encodeURIComponent(clubId)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []

    const body: unknown = await res.json()
    // The upstream returns { sessions: [...] }. A bare array is tolerated in
    // case that changes, rather than silently rendering nothing.
    const rows: SquadRow[] = Array.isArray(body)
      ? (body as SquadRow[])
      : (((body as { sessions?: SquadRow[] })?.sessions ?? []) as SquadRow[])

    const now = Date.now()
    const byProgram = new Map<
      string,
      { dates: Date[]; rate?: number; mins?: number; full: boolean; hasPast: boolean }
    >()
    let tz = FALLBACK_TZ

    for (const row of rows) {
      const name = row.squad_programs?.name
      if (!name || !row.scheduled_at) continue
      if (row.status && row.status !== 'scheduled') continue

      const at = new Date(row.scheduled_at)
      if (Number.isNaN(at.getTime())) continue

      if (row.locations?.timezone) tz = row.locations.timezone

      const entry = byProgram.get(name) ?? { dates: [], full: true, hasPast: false }

      // Past sessions are counted but not listed: they are what proves the
      // programme is already running, which is what makes "Starts ..." a lie.
      if (at.getTime() < now) {
        entry.hasPast = true
        byProgram.set(name, entry)
        continue
      }

      entry.dates.push(at)
      if (typeof row.member_rate === 'number') entry.rate ??= row.member_rate
      if (typeof row.duration_mins === 'number') entry.mins ??= row.duration_mins
      // Full only if EVERY upcoming session is full — one open seat is bookable.
      if (!row.is_full) entry.full = false
      byProgram.set(name, entry)
    }

    return [...byProgram.entries()]
      .filter(([, e]) => e.dates.length > 0)
      .map(([program, e]) => {
        e.dates.sort((a, b) => a.getTime() - b.getTime())
        const first = e.dates[0]
        return {
          program,
          when: formatWhen(e.dates, tz),
          duration: typeof e.mins === 'number' ? `${e.mins} min` : null,
          price: typeof e.rate === 'number' ? formatPrice(e.rate) : null,
          upcoming: e.dates.length,
          full: e.full,
          // Matched on the platform's own programme name, which is the same
          // string both endpoints return — no second mapping to keep in step.
          // Absent is the normal case and renders nothing.
          packs: packsByProgram.get(program) ?? [],
          startsOn:
            !e.hasPast && first
              ? first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: tz })
              : null,
        }
      })
  } catch {
    return []
  }
}

/** "Bollywood Dance" → "bollywood-dance", so a programme can be matched to the
    Featured rail's slugs without a second hardcoded mapping to keep in step. */
export function programSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
