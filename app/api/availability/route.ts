import { NextResponse } from 'next/server'
import { OPENING_FIRST_HOUR, isOpen } from '../../../lib/opening'
import { COURT_RATES } from '../../../lib/rates'

// GET /api/availability
// ---------------------------------------------------------------------------
// Feeds the "next free" column in the hero rate card — one slot per sport,
// because a squash player does not care when the cricket lane frees up. The
// numbers belong to the platform (this site has no bookings database), so this
// route is a thin, cached proxy in front of Orangish.
//
// Upstream contract (app.orangish.io):
//
//   GET /api/public/next-availability?club=<location-uuid>
//   → 200 { slots: Array<{ sport: string, startsAt: ISO8601,
//                          court?: string, remainingToday?: number }> }
//
// That endpoint does not exist yet. Until it ships, set no env vars and this
// route serves the opening slot for every sport; the hero renders identically
// either way, so the column can ship ahead of the platform work.
//
// Env:
//   ORANGISH_API_BASE  default https://app.orangish.io
//   EXTON_CLUB_ID      the Exton location uuid on the platform
//
// Deliberately server-side: the club uuid stays out of the browser bundle, and
// one cached response is shared by every visitor rather than each of them
// hitting the platform directly.

export const revalidate = 60

const CLUB_ID = process.env.EXTON_CLUB_ID
const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')

export type SportSlot = {
  /** Matches a `sport` in lib/rates.ts, so the card can join the two by name. */
  sport: string
  /** "Today · 6:30 PM" or "Tue 21 Sep 2027 · 6:00 AM" — already formatted. */
  label: string
  /** "Court 2", or null when the upstream does not name a court. */
  court: string | null
}

export type AvailabilityPayload = {
  slots: SportSlot[]
  /** True while these are opening-day placeholders rather than live slots. */
  preOpening: boolean
}

function formatSlot(startsAt: string, timeZone = 'America/New_York'): string {
  const d = new Date(startsAt)
  if (Number.isNaN(d.getTime())) return ''

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })

  // "Today" reads better than the date for the common case, and the column is
  // only ever about the next few hours once the club is open.
  const today = new Date().toLocaleDateString('en-US', { timeZone })
  const slotDay = d.toLocaleDateString('en-US', { timeZone })
  if (today === slotDay) return `Today · ${time}`

  const day = d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  })
  return `${day} · ${time}`
}

/** Every sport opens at the same hour on opening day. Formatted through the
    same helper as a live slot, so the column reads identically either side of
    opening — "Tue 15 Sep · 6:00 AM" becomes "Today · 6:30 PM" and nothing
    about the layout changes. */
function openingDaySlots(): AvailabilityPayload {
  const label = formatSlot(OPENING_FIRST_HOUR)
  return {
    slots: COURT_RATES.map((r) => ({ sport: r.sport, label, court: null })),
    preOpening: true,
  }
}

export async function GET() {
  // Before the doors open there is nothing to query — the answer is the
  // opening date, and it is the same for every sport and every visitor.
  if (!isOpen() || !CLUB_ID) {
    return NextResponse.json(openingDaySlots())
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/public/next-availability?club=${encodeURIComponent(CLUB_ID)}`,
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) },
    )
    if (!res.ok) return NextResponse.json({ slots: [], preOpening: false })

    const body = (await res.json()) as {
      slots?: Array<{ sport?: string; startsAt?: string; court?: string }>
    }

    const slots: SportSlot[] = (body.slots ?? [])
      .map((s) => {
        if (!s.sport || !s.startsAt) return null
        const label = formatSlot(s.startsAt)
        if (!label) return null
        return { sport: s.sport, label, court: s.court ?? null }
      })
      .filter((s): s is SportSlot => s !== null)

    return NextResponse.json({ slots, preOpening: false })
  } catch {
    // A platform blip must not take a hole out of the hero. The column falls
    // back to a dash per row and the rest of the card is unaffected.
    return NextResponse.json({ slots: [], preOpening: false })
  }
}
