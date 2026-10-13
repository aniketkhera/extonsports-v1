/**
 * ⚠️ DEAD since 2026-10-13. The footer stopped publishing player caps that day (Aniket:
 * "let's not put these numbers up") and now prints a recommendation — 4 per squash
 * court, 6 per badminton court, 8 per cricket lane. The same day the platform took the
 * caps OUT of the club card this reads (orangish-app #627: "just don't want it
 * published outside"), so the fetch below now always falls back to the local copy.
 * Nothing imports this file; it is kept only as a record of how the tables were built.
 * Do not wire it back up: the caps are deliberately not published outside the app.
 *
 * Player caps, fetched from the platform rather than retyped here.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * lib/rates.ts carries a hardcoded copy of the club's numbers, and that copy
 * has already drifted once: this site advertised band hours the platform did
 * not charge, in the direction that under-stated the price, for weeks. The
 * caps are the same shape of risk and worse in consequence, because a wrong
 * headcount is discovered at the door.
 *
 * So the caps come from `GET /api/public/clubs/<slug>` on app.orangish.io,
 * which reads `court_player_limits` — the very rows the booking guard uses to
 * refuse people. One source, no retyping.
 *
 * ⚠️ THE CAP HAS TWO DIMENSIONS. `max_players` is the ONE-HOUR number;
 * `max_players_step` is how many more each hour beyond the first admits. A
 * consumer that reads only the first publishes "cricket seats 8" for a
 * three-hour lane that seats 16.
 *
 * ── FALLING BACK IS DELIBERATE ──────────────────────────────────────────────
 * Every failure returns null and the caller renders its local constants. A
 * marketing page with a hole in it is worse than a page showing numbers that
 * are a day stale, and this fetch sits in the footer of every render.
 */

import { cache } from 'react'
import { PLAYER_CAPS, GROUP_CAPS, type SportCap, type GroupCap } from './rates'

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')
const SLUG = process.env.EXTON_CLUB_SLUG || 'exton-sports'

/** One entry of the platform's published rate card. */
type CardRow = {
  sport: string
  band: string
  hourly_rate: number
  max_players: number | null
  /** Absent until the platform ships it; 0 is the correct reading. */
  max_players_step?: number | null
}

export type SportCaps = { peak: SportCap; offPeak: SportCap }

/** One entry of the platform's `court_group_caps`: courts booked together. */
type GroupRow = { sport: string; courts: number; max_players: number }

type ClubCard = { court_rate_card?: CardRow[]; court_group_caps?: GroupRow[] | null }

/**
 * The club card, fetched ONCE per render and shared by both readers below, or null
 * when it could not be had.
 *
 * ⚠️ ONE FETCH, NOT TWO (2026-10-13). Two fetch() calls to this URL are NOT one
 * request, whatever the URL and cache options: a `signal` (the timeout below)
 * switches off Next's render-pass dedupe (next/dist/server/lib/dedupe-fetch.js). Had
 * the per-court caps and the courts-together totals each fetched, one could fail
 * while the other did not, and the footer would print live per-court caps beside the
 * local together totals, or the reverse (caught in review before it shipped). React's
 * cache() makes it one call, so both halves of the table come from one answer.
 */
const fetchClubCard = cache(async (): Promise<ClubCard | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/public/clubs/${SLUG}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { club?: ClubCard }
    return json.club ?? null
  } catch {
    return null
  }
})

/**
 * Caps per sport, or null when the platform could not be reached.
 *
 * `offPeak` covers standard AND late night, which the footer presents as one
 * column. Where those two disagree the STRICTER wins — publishing the roomier
 * of two numbers is the mistake that gets somebody turned away.
 */
export async function fetchPlayerCaps(): Promise<Record<string, SportCaps> | null> {
  try {
    const card = (await fetchClubCard())?.court_rate_card
    if (!Array.isArray(card) || card.length === 0) return null

    // ⛔ EACH SLOT IS FILLED ONLY FROM ITS OWN BANDS. An earlier version seeded
    // BOTH peak and offPeak from whichever row arrived first; the card is
    // ordered peak-first, so peak's number seeded off-peak and then won every
    // "stricter wins" comparison against it. The footer published the peak cap
    // in the off-peak column — squash 2 where it should have said 4.
    const partial: Record<string, { peak: SportCap | null; offPeak: SportCap | null }> = {}
    for (const row of card) {
      if (typeof row.max_players !== 'number') continue
      const slot = row.band === 'peak' ? 'peak' : 'offPeak'

      // ⚠️ ABSENT IS NOT ZERO. The platform did not publish max_players_step
      // until after the caps themselves shipped, so an older deployment simply
      // omits the field. Reading that as 0 would flatten the curve and render
      // "badminton 6, 6, 6" — no growth at all, which is worse than the local
      // copy this fetch was meant to improve on.
      //
      // So: a NUMBER (including a real 0) is authoritative; a missing field
      // falls back to the local step for that sport and band.
      const localStep = PLAYER_CAPS[row.sport]?.[slot]?.step ?? 0
      const cap: SportCap = {
        base: row.max_players,
        step: typeof row.max_players_step === 'number' ? row.max_players_step : localStep,
      }

      const bucket = (partial[row.sport] ??= { peak: null, offPeak: null })
      const current = bucket[slot]
      // offPeak collapses every non-peak band into one column, so among them
      // the STRICTER wins — publishing the roomier of two numbers is the
      // mistake that gets somebody turned away at the door.
      //
      // Since 2026-10-08 that is only 'standard', late night having been
      // abolished, so there is nothing left to collapse at Exton. The rule
      // stays because it costs nothing and is the safe direction if a band is
      // ever added back.
      bucket[slot] =
        !current || cap.base < current.base || (cap.base === current.base && cap.step < current.step)
          ? cap
          : current
    }

    // A sport is only published when BOTH halves were seen. A half-answer here
    // would silently mean "peak applies all day", which is not true and not
    // ours to guess — the local copy is the better answer in that case.
    const out: Record<string, SportCaps> = {}
    for (const [sport, b] of Object.entries(partial)) {
      if (b.peak && b.offPeak) out[sport] = { peak: b.peak, offPeak: b.offPeak }
    }

    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

/**
 * Courts booked TOGETHER, per sport, or null when the platform could not say.
 *
 * ⚠️ NULL IS NOT EMPTY. The club card publishes `court_group_caps: null` when it
 * could not read its table, and an older deployment omits the field altogether;
 * both mean "unknown" and keep the local copy. Only an ARRAY is the platform's
 * answer — and an empty one is a real answer ("no such limits"), which drops the
 * line rather than printing a copy the platform has since removed.
 *
 * Read from the same single fetch as fetchPlayerCaps (fetchClubCard).
 */
export async function fetchGroupCaps(): Promise<Record<string, GroupCap[]> | null> {
  try {
    const rows = (await fetchClubCard())?.court_group_caps
    if (!Array.isArray(rows)) return null

    const out: Record<string, GroupCap[]> = {}
    for (const r of rows) {
      if (typeof r?.sport !== 'string' || !Number.isInteger(r.courts) || typeof r.max_players !== 'number') continue
      ;(out[r.sport] ??= []).push({ courts: r.courts, base: r.max_players })
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.courts - b.courts)
    return out
  } catch {
    return null
  }
}

/** The courts-together limits to render: the platform's if it answered, the copy otherwise. */
export async function groupCapsOrFallback(): Promise<Record<string, GroupCap[]>> {
  return (await fetchGroupCaps()) ?? GROUP_CAPS
}

/**
 * The caps to render: the platform's if reachable, the local copy otherwise.
 * Never throws and never returns empty, so the footer always has something.
 */
export async function playerCapsOrFallback(): Promise<{
  caps: Record<string, SportCaps>
  live: boolean
}> {
  const fetched = await fetchPlayerCaps()
  if (fetched) return { caps: fetched, live: true }
  return { caps: PLAYER_CAPS, live: false }
}
