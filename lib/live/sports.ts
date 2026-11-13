/* Which sport is on air, for the TVs. 2026-11-12.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket: "put up a LIVE NOW sign on the reception, vestibule, cricket and badminton TVs
   (as the case may be for cricket and badminton) when the stream is on."

   "As the case may be" is the whole of this file. lib/live/youtube.ts answers whether a
   broadcast is on air; it cannot answer WHICH courts are in it, because a broadcast is one
   mosaic and the blanking happens inside the picture. The platform's live-schedule knows,
   because it is the same answer the box itself gates on — so the club's own screens and the
   box are reading one source, and a TV cannot name a sport the stream is not showing.

   ⚠️ BOTH HAVE TO BE TRUE. A sport is announced only when YouTube is really serving AND the
   schedule says that side is live. The schedule alone would light the sign while a dead
   encoder showed a parent nothing; YouTube alone cannot tell cricket from badminton. */

const SCHEDULE_URL = 'https://app.orangish.io/api/public/live-schedule?club=exton-sports'

export type LiveSports = { badminton: boolean; cricket: boolean }

export const NO_SPORTS: LiveSports = { badminton: false, cricket: false }

/**
 * Read the platform's answer.
 *
 * Fails closed on every shape it does not recognise: a sign that names a court had better
 * be right, and "we could not tell" has to look the same as "nothing is on".
 */
export function parseSports(body: unknown): LiveSports {
  if (typeof body !== 'object' || body === null) return NO_SPORTS
  const b = body as { badminton?: unknown; cricket?: unknown; readFailed?: unknown }
  // readFailed is the platform saying its own read of the bookings failed. It still sends
  // the sides as false, but say so explicitly rather than relying on that.
  if (b.readFailed === true) return NO_SPORTS
  const on = (side: unknown) =>
    typeof side === 'object' && side !== null && (side as { on?: unknown }).on === true
  return { badminton: on(b.badminton), cricket: on(b.cricket) }
}

/** The sports to name in the sign, given the broadcast state and the schedule. */
export function sportsOnAir(broadcastLive: boolean, schedule: LiveSports): LiveSports {
  if (!broadcastLive) return NO_SPORTS
  return { badminton: schedule.badminton, cricket: schedule.cricket }
}

/**
 * What the band says after "LIVE NOW".
 *
 * Named when we know, and deliberately vague when we do not: with the broadcast up but the
 * schedule unreadable, "a session is streaming" is still true, where naming a court would
 * be a guess about children on camera.
 */
export function bandLine(sports: LiveSports): string {
  const on = [sports.cricket && 'Cricket', sports.badminton && 'Badminton'].filter(Boolean)
  if (on.length === 2) return 'Cricket and badminton are streaming'
  if (on.length === 1) return `${on[0]} is streaming`
  return 'A coaching session is streaming'
}

// ── the impure half ───────────────────────────────────────────────────────────
// Thirty seconds, matching youtube.ts, so the two halves of one answer cannot be
// minutes apart and the TVs never hammer the platform.
const TTL_MS = 30_000
let cached: { at: number; value: LiveSports } | null = null

export function forgetSports(): void {
  cached = null
}

/** Never throws: any failure is NO_SPORTS, which reads as "do not name a court". */
export async function liveSports(
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<LiveSports> {
  if (cached && now - cached.at < TTL_MS) return cached.value
  let value = NO_SPORTS
  try {
    const res = await fetchImpl(SCHEDULE_URL, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) value = parseSports(await res.json())
  } catch {
    value = NO_SPORTS
  }
  // A failure is cached for the same thirty seconds: when the platform is down, a hall of
  // screens must not become a hall of retries.
  cached = { at: now, value }
  return value
}
