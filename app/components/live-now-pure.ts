/* The "LIVE NOW" badge's pure parts. 2026-11-12.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-12: "if we are streaming - show a LIVE NOW glowing on this page, as
   well as the top of extonsports.com homepage."

   ⚠️ THIS REVERSES A DELIBERATE DECISION, so it is written down rather than discovered.
   app/live/page.tsx was built on 2026-11-09 to show the SAME thing whether or not a
   session was on air, the reasoning being that an on/off indicator on a public address
   publishes the club's timetable to anyone willing to poll it. The owner has decided the
   trade is worth it. What the badge still does NOT do is hand over the way in: it says a
   session is on, never which video, so the day-link remains the only route to the picture.

   WHAT "LIVE" MEANS HERE. Not "a class is booked" — "YouTube is serving a broadcast right
   now". lib/live/youtube.ts already answers exactly that question, and already caches the
   answer for thirty seconds, so the badge adds no new source of truth and no new quota
   path. A calendar would light the badge while a dead encoder showed a parent nothing. */

/** Where the badge asks. Returns { live } and deliberately nothing else. */
export const LIVE_STATUS_PATH = '/api/live/status'

export const LIVE_NOW_COPY = {
  label: 'LIVE NOW',
  /** The homepage badge is a link; this is what it points at and how it reads. */
  href: '/live',
  linkTitle: 'A coaching session is on air now — get a link to watch',
  /** Announced once, when the badge appears. Not repeated on every poll. */
  announce: 'A coaching session is on air now.',
} as const

/**
 * Read the endpoint's answer.
 *
 * Strictly `{ live: true }` and nothing else counts. A truthy string, a 1, a missing
 * field, an HTML error page parsed into something odd — all of it means NOT live. The
 * badge claims a camera is on children; the parse errs towards silence.
 */
export function parseLiveStatus(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false
  return (body as { live?: unknown }).live === true
}

/** Steady-state poll gap. A session starting is not urgent to the second. */
export const POLL_OK_MS = 45_000
/** The ceiling when the endpoint keeps failing. */
export const POLL_MAX_MS = 300_000

/**
 * How long to wait before asking again.
 *
 * Doubles per consecutive failure so a site-wide outage does not turn every open tab into
 * a retry loop; the exponent is capped before the multiply so a long-abandoned tab cannot
 * overflow its way back to a short delay.
 */
export function pollDelayMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return POLL_OK_MS
  const doublings = Math.min(Math.floor(consecutiveFailures), 8)
  return Math.min(POLL_OK_MS * 2 ** doublings, POLL_MAX_MS)
}
