import { NextResponse } from 'next/server'

// GET /api/schedule
// ---------------------------------------------------------------------------
// The academy/studio timetable for the hero roster, read from the platform so
// the site never retypes a class time. Same rule as the rate card: a time
// written into marketing copy goes stale the moment someone reschedules, and
// the visitor finds out at the door.
//
// ── WHY NOT /api/featured ───────────────────────────────────────────────────
// app/api/featured/route.ts was built against `GET /api/public/sessions`, which
// WAS NEVER SHIPPED. It still 404s, so https://extonsports.com/api/featured has
// been returning {"sessions":[]} in production — the Featured rail has shown no
// schedule since it launched. The same is true of app/api/availability, which
// calls the equally absent /api/public/next-availability.
//
// This route uses the endpoint that actually exists:
//
//   GET https://app.orangish.io/api/squads?location_id=<uuid>
//   → 200, an ARRAY of group_sessions rows
//
// It is deliberately unauthenticated upstream ("NO auth gate here,
// deliberately. The classes list is PUBLIC by owner decision" —
// orangish-app/app/api/squads/route.ts:10-15). Verified anonymously: 200 with
// 14 real Bollywood Dance sessions.
//
// ⛔ THIS MUST STAY A SERVER PROXY, for two independent reasons:
//
//   1. /api/squads sends no Access-Control-* header, so a browser fetch from
//      extonsports.com is blocked outright.
//   2. Its payload carries the club's INTERNAL config to anonymous callers —
//      locations.features (access_paused, door_mechanism, hide_schedule_details,
//      pos, public_join) and the Stripe fee-mode columns. Passing the upstream
//      JSON through would publish the club's operational flags to anyone who
//      opens devtools. Everything below is an explicit whitelist.
//
// Env:
//   ORANGISH_API_BASE  default https://app.orangish.io
//   EXTON_CLUB_SLUG    default exton-sports
//   EXTON_CLUB_ID      optional; skips the slug→uuid lookup when set

export const revalidate = 300

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
const SLUG = process.env.EXTON_CLUB_SLUG || 'exton-sports'
const CLUB_ID = process.env.EXTON_CLUB_ID
const FALLBACK_TZ = 'America/New_York'

/** One program's timetable, already formatted. Nulls mean "say nothing". */
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
  /** Authoritative from the platform; the roster is withheld for this club. */
  full: boolean
}

export type SchedulePayload = { programs: ProgramSchedule[] }

const EMPTY: SchedulePayload = { programs: [] }

/** Only the fields this route is willing to look at. Nothing else is read. */
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

/**
 * The Exton location uuid.
 *
 * EXTON_CLUB_ID is not set anywhere today, which is why /api/featured
 * short-circuits to empty even when its upstream is healthy. So the slug is the
 * real source: /api/public/clubs/<slug> returns the id, and EXTON_CLUB_SLUG
 * already has a working default — the same one lib/club-pricing.ts relies on.
 */
async function resolveClubId(): Promise<string | null> {
  if (CLUB_ID) return CLUB_ID
  try {
    const res = await fetch(`${API_BASE}/api/public/clubs/${SLUG}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { club?: { id?: string } }
    return json.club?.id ?? null
  } catch {
    return null
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

  // Plural because it is a recurring slot, not one date. When a program runs at
  // more than two different times there is no honest one-line summary, so it
  // falls back to the next session's time rather than listing five.
  const dayPart = days.map((d) => `${d}s`).join(' & ')
  const timePart = times.length <= 2 ? times.join(' / ') : times[0]
  return [dayPart, timePart].filter(Boolean).join(' · ')
}

function formatPrice(rate: number): string {
  return Number.isInteger(rate) ? `$${rate}` : `$${rate.toFixed(2)}`
}

export async function GET() {
  const clubId = await resolveClubId()
  if (!clubId) return NextResponse.json(EMPTY satisfies SchedulePayload)

  try {
    const res = await fetch(`${API_BASE}/api/squads?location_id=${encodeURIComponent(clubId)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return NextResponse.json(EMPTY satisfies SchedulePayload)

    const body: unknown = await res.json()
    // The upstream returns a bare array today. Tolerate an envelope in case that
    // changes rather than silently rendering nothing.
    const rows: SquadRow[] = Array.isArray(body)
      ? (body as SquadRow[])
      : (((body as { sessions?: SquadRow[] })?.sessions ?? []) as SquadRow[])

    const now = Date.now()
    const byProgram = new Map<string, { dates: Date[]; rate?: number; mins?: number; full: boolean }>()
    let tz = FALLBACK_TZ

    for (const row of rows) {
      const name = row.squad_programs?.name
      if (!name || !row.scheduled_at) continue
      if (row.status && row.status !== 'scheduled') continue

      const at = new Date(row.scheduled_at)
      if (Number.isNaN(at.getTime()) || at.getTime() < now) continue

      if (row.locations?.timezone) tz = row.locations.timezone

      const entry = byProgram.get(name) ?? { dates: [], full: true }
      entry.dates.push(at)
      if (typeof row.member_rate === 'number') entry.rate ??= row.member_rate
      if (typeof row.duration_mins === 'number') entry.mins ??= row.duration_mins
      // Full only if EVERY upcoming session is full — one open seat is bookable.
      if (!row.is_full) entry.full = false
      byProgram.set(name, entry)
    }

    const programs: ProgramSchedule[] = [...byProgram.entries()].map(([program, e]) => {
      e.dates.sort((a, b) => a.getTime() - b.getTime())
      return {
        program,
        when: formatWhen(e.dates, tz),
        duration: typeof e.mins === 'number' ? `${e.mins} min` : null,
        price: typeof e.rate === 'number' ? formatPrice(e.rate) : null,
        upcoming: e.dates.length,
        full: e.full,
      }
    })

    return NextResponse.json({ programs } satisfies SchedulePayload)
  } catch {
    // A marketing page with a hole in it beats one that throws — the same
    // fallback stance lib/club-pricing.ts takes for the caps.
    return NextResponse.json(EMPTY satisfies SchedulePayload)
  }
}
