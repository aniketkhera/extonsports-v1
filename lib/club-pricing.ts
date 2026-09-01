/**
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
 * consumer that reads only the first publishes "cricket seats 10" for a
 * three-hour lane that seats 20.
 *
 * ── FALLING BACK IS DELIBERATE ──────────────────────────────────────────────
 * Every failure returns null and the caller renders its local constants. A
 * marketing page with a hole in it is worse than a page showing numbers that
 * are a day stale, and this fetch sits in the footer of every render.
 */

import { PLAYER_CAPS, type SportCap } from './rates'

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

/**
 * Caps per sport, or null when the platform could not be reached.
 *
 * `offPeak` covers standard AND late night, which the footer presents as one
 * column. Where those two disagree the STRICTER wins — publishing the roomier
 * of two numbers is the mistake that gets somebody turned away.
 */
export async function fetchPlayerCaps(): Promise<Record<string, SportCaps> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/public/clubs/${SLUG}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { club?: { court_rate_card?: CardRow[] } }
    const card = json.club?.court_rate_card
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
      // offPeak collapses standard AND late night into one column, so among
      // those two the STRICTER wins — publishing the roomier of two numbers is
      // the mistake that gets somebody turned away at the door.
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
