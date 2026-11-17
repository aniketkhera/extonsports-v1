// What a tap on /academies picks, and the ONE write it becomes, 2026-11-16 (orangish-app
// docs/academy-page.md D4, D5, §3.3). Pure: the components keep the state, this decides it.
//
// ONE SHAPE FOR BOTH CARDS. POST /add takes one date, one start, one length and up to three
// courts (§3.3) — so a pick is a rectangle: a set of courts × one run of half-hours. The grid
// and the extend chips are two ways of drawing that rectangle:
//   • Book more: tap a free cell to start a run; tap further free cells on a picked court to
//     stretch it (up to 2 hours, D5), or a free cell in the same rows on another court to add
//     that court. Anything that would not make one clean rectangle of FREE cells starts a new
//     pick at the tapped cell instead — a tap never silently picks a taken half-hour.
//   • Extend: +30 min or +1 hour per court, all starting at the session's end (D4). One
//     length per press: picking +1 hour on court 3 while courts 1–2 have +30 moves them to
//     +1 hour where that is free, and drops a court where it is not — on screen, before the
//     press, never after it.
//
// The amount shown is a PREVIEW from the rates the platform sent. The platform computes
// every charge itself (D7: "the browser never sends a price") and the request below carries
// none.

import type { DayView, ExtendGroup, PartnerKey, PricedRate, Rate, Use } from './view'
import { localHm, localParts } from './view'

/** D5: 30–120 minutes in 30-minute steps; 1–3 courts per action. */
export const MAX_ROWS = 4
export const MAX_COURTS = 3
const HALF_HOUR_MS = 30 * 60_000

/** A book pick: court indexes into day.courts (sorted), rows [from, to) into day.slots. */
export type BookPick = { courts: number[]; from: number; to: number }

/** Rows [from, to) are back to back, 30 minutes apart (a gap in opening hours breaks a run). */
export function contiguous(day: DayView, from: number, to: number): boolean {
  if (from < 0 || to > day.slots.length || to <= from) return false
  for (let i = from + 1; i < to; i++) {
    if (Date.parse(day.slots[i].start) - Date.parse(day.slots[i - 1].start) !== HALF_HOUR_MS) return false
  }
  return true
}

function allFree(day: DayView, courts: number[], from: number, to: number): boolean {
  if (!contiguous(day, from, to)) return false
  for (let i = from; i < to; i++) for (const c of courts) if (day.slots[i]?.cells[c] !== 'free') return false
  return true
}

function fresh(day: DayView, court: number, row: number): BookPick | null {
  return day.slots[row]?.cells[court] === 'free' ? { courts: [court], from: row, to: row + 1 } : null
}

/**
 * The pick after a tap on (court, row). Taps on a cell that is not free and not picked change
 * nothing. See the header for the rules; every result is a rectangle of free cells, at most
 * MAX_ROWS long and MAX_COURTS wide, or null.
 */
export function tapCell(day: DayView, pick: BookPick | null, court: number, row: number): BookPick | null {
  const state = day.slots[row]?.cells[court]
  if (state === undefined) return pick
  const picked = !!pick && pick.courts.includes(court) && row >= pick.from && row < pick.to

  if (picked && pick) {
    // Untap: a one-row pick loses the court; otherwise the run is trimmed from the end that
    // was tapped, or cut short after a middle cell.
    if (pick.to - pick.from === 1) {
      const courts = pick.courts.filter((c) => c !== court)
      return courts.length ? { ...pick, courts } : null
    }
    if (row === pick.from) return { ...pick, from: pick.from + 1 }
    if (row === pick.to - 1) return { ...pick, to: pick.to - 1 }
    return { ...pick, to: row + 1 }
  }

  if (state !== 'free') return pick
  if (!pick) return fresh(day, court, row)

  if (pick.courts.includes(court)) {
    // Stretch the run on a court already picked.
    const from = Math.min(pick.from, row)
    const to = Math.max(pick.to, row + 1)
    if (to - from <= MAX_ROWS && allFree(day, pick.courts, from, to)) return { ...pick, from, to }
    return fresh(day, court, row)
  }
  if (row >= pick.from && row < pick.to && pick.courts.length < MAX_COURTS && allFree(day, [court], pick.from, pick.to)) {
    // Another court in the same rows.
    return { ...pick, courts: [...pick.courts, court].sort((a, b) => a - b) }
  }
  return fresh(day, court, row)
}

/** Drop a pick that no longer fits a fresh grid (after a refresh someone else booked a cell). */
export function stillFits(day: DayView, pick: BookPick | null): BookPick | null {
  if (!pick) return null
  if (pick.courts.some((c) => c < 0 || c >= day.courts.length)) return null
  return allFree(day, pick.courts, pick.from, pick.to) && pick.to - pick.from <= MAX_ROWS ? pick : null
}

/** Rows shown at once in the grid (the mockup's "Earlier · Later"): four hours, which holds a
 *  whole evening block and the hour either side of it on one phone screen. */
export const WINDOW_ROWS = 8

/**
 * Where the grid's window starts for a day: a little before the partner's own first
 * half-hour that is still to come (that is where extra time is usually wanted — 16 of
 * Sachin's last 20 extras were the hour before a block, D4), else at the first free row,
 * else the first row that is not past.
 */
export function windowStart(day: DayView, size = WINDOW_ROWS): number {
  const rows = day.slots.length
  if (rows <= size) return 0
  const firstWith = (s: string) => day.slots.findIndex((sl) => sl.cells.some((c) => c === s))
  const yours = firstWith('yours')
  const free = firstWith('free')
  const open = day.slots.findIndex((sl) => sl.cells.some((c) => c !== 'past'))
  const start = yours >= 0 ? yours - 2 : free >= 0 ? free : open
  return Math.max(0, Math.min(start, rows - size))
}

/* ── extend ─────────────────────────────────────────────────────────────────── */

export type ExtendPick = { minutes: 30 | 60; courtIds: string[] }

function optionOk(group: ExtendGroup, courtId: string, minutes: number): boolean {
  return !!group.courts.find((c) => c.courtId === courtId)?.options.find((o) => o.minutes === minutes && o.ok)
}

/** The extend pick after a tap on `minutes` for `courtId`. See the header. */
export function tapExtend(group: ExtendGroup, pick: ExtendPick | null, courtId: string, minutes: 30 | 60): ExtendPick | null {
  if (!optionOk(group, courtId, minutes)) return pick
  if (pick && pick.minutes === minutes && pick.courtIds.includes(courtId)) {
    const courtIds = pick.courtIds.filter((c) => c !== courtId)
    return courtIds.length ? { minutes, courtIds } : null
  }
  const keep = pick ? pick.courtIds.filter((c) => c !== courtId && optionOk(group, c, minutes)) : []
  const chosen = new Set([...keep, courtId])
  // In the group's own court order, so "Courts 1 and 2" reads in order.
  const courtIds = group.courts.map((c) => c.courtId).filter((c) => chosen.has(c)).slice(0, MAX_COURTS)
  return { minutes, courtIds }
}

/** The courts that dropped out of a pick between two states (for the "dropped" note). */
export function droppedCourts(before: ExtendPick | null, after: ExtendPick | null): string[] {
  if (!before) return []
  const now = new Set(after?.courtIds ?? [])
  return before.courtIds.filter((c) => !now.has(c))
}

/* ── money (a preview; the platform charges) ───────────────────────────────── */

/** The uses the switch offers, in the platform's order — PBA's two, none for CCCA (D8). */
export function usesOf(rates: Rate[]): Use[] {
  const order: Use[] = ['coaching', 'open_play']
  return order.filter((u) => rates.some((r) => r.use === u))
}

/**
 * The rate a pick is charged at: by use for PBA, the single null-use rate for CCCA. Null when
 * there is none OR it has no figure (view.ts Rate: the platform can't price it) — so a summary,
 * a confirm line and a button exist only where there is an amount to put in them.
 */
export function rateFor(rates: Rate[], use: Use | null): PricedRate | null {
  const r = rates.find((x) => x.use === use)
  return r && r.centsPerHour !== null ? { use: r.use, centsPerHour: r.centsPerHour } : null
}

/**
 * The rates Book more prices a pick on `day` with: that day's own when the platform sent them,
 * else the overview's, which are TODAY's (view.ts DayView says why they can differ). Extend is
 * same-day, so it always uses the overview's.
 */
export function ratesForDay(overviewRates: Rate[], day: DayView | null): Rate[] {
  return day?.rates ?? overviewRates
}

/** Cents for `minutes` on each of `courts` courts at `centsPerHour`, rounded per court. */
export function amountCents(centsPerHour: number, minutes: number, courts: number): number {
  return Math.round((centsPerHour * minutes) / 60) * courts
}

/* ── the one write (§3.3 POST /add) ─────────────────────────────────────────── */

export type AddBody = {
  requestId: string
  kind: 'extend' | 'book'
  date: string
  start: string
  minutes: number
  courtIds: string[]
  use?: Use
}

/** `use` rides only for PBA (D8); CCCA's write never carries one (bad_use otherwise). */
function withUse(body: Omit<AddBody, 'use'>, partner: PartnerKey, use: Use | null): AddBody {
  return partner === 'pba' && use ? { ...body, use } : body
}

/** Book more → the write. Null for a pick that is not a clean rectangle any more. */
export function bookBody(
  day: DayView, pick: BookPick, tz: string, requestId: string, partner: PartnerKey, use: Use | null,
): AddBody | null {
  if (!stillFits(day, pick)) return null
  const first = day.slots[pick.from]
  const start = localHm(first.start, tz)
  const local = localParts(first.start, tz)
  if (!start || !local || local.ymd !== day.date) return null
  return withUse({
    requestId,
    kind: 'book',
    date: day.date,
    start,
    minutes: (pick.to - pick.from) * 30,
    courtIds: pick.courts.map((c) => day.courts[c].id),
  }, partner, use)
}

/** Extend → the write: the session's end, club-local, is both the date and the start. */
export function extendBody(
  group: ExtendGroup, pick: ExtendPick, tz: string, requestId: string, partner: PartnerKey, use: Use | null,
): AddBody | null {
  const local = localParts(group.parentEnd, tz)
  const start = localHm(group.parentEnd, tz)
  if (!local || !start || pick.courtIds.length < 1) return null
  if (pick.courtIds.some((c) => !optionOk(group, c, pick.minutes))) return null
  return withUse({ requestId, kind: 'extend', date: local.ymd, start, minutes: pick.minutes, courtIds: pick.courtIds }, partner, use)
}

/** A v4-shaped id, as crypto.randomUUID() makes. The route refuses anything else. */
export const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
