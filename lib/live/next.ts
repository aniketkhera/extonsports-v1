/* When is the next stream? For the off-air watch page. 2026-11-13.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket: make the off-air page "note when the next stream starts and for which
   sport/sports".

   The answer is the platform's: live-schedule?next=1 walks the same rule the box gates on
   (orangish-app lib/live-schedule.ts nextStream), so this page cannot promise a session the
   box will blank — PBA open play, a member on a badminton court, a dated open-play evening.
   Nothing here decides what streams; it only reads and words the answer.

   Shown only behind a valid day token, on the watch page. The public /live page still
   says nothing about the timetable. */

// LIVE_NEXT_URL is for pointing a local dev server at a local platform; production never sets it.
const NEXT_URL =
  process.env.LIVE_NEXT_URL || 'https://app.orangish.io/api/public/live-schedule?club=exton-sports&next=1'

export type NextSport = 'badminton' | 'cricket'
export type NextSide = { sport: NextSport; start: string; end: string }
export type NextStream = { date: string; start: string; end: string; sides: NextSide[] }

/** 'unknown' when we could not tell, which the page shows as silence, never as "none". */
export type NextAnswer = NextStream | null | 'unknown'

const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Read the platform's answer. Anything not exactly the expected shape is 'unknown'. */
export function parseNext(body: unknown): NextAnswer {
  if (typeof body !== 'object' || body === null) return 'unknown'
  const b = body as { next?: unknown; nextReadFailed?: unknown }
  if (b.nextReadFailed !== false || !('next' in b)) return 'unknown'
  if (b.next === null) return null
  const n = b.next as Partial<NextStream>
  if (typeof n !== 'object' || n === null) return 'unknown'
  if (typeof n.date !== 'string' || !DATE.test(n.date)) return 'unknown'
  if (typeof n.start !== 'string' || !HHMM.test(n.start)) return 'unknown'
  if (typeof n.end !== 'string' || !HHMM.test(n.end)) return 'unknown'
  if (!Array.isArray(n.sides) || n.sides.length === 0) return 'unknown'
  const sides: NextSide[] = []
  for (const s of n.sides as Array<Partial<NextSide>>) {
    if (s?.sport !== 'badminton' && s?.sport !== 'cricket') return 'unknown'
    if (typeof s.start !== 'string' || !HHMM.test(s.start)) return 'unknown'
    if (typeof s.end !== 'string' || !HHMM.test(s.end)) return 'unknown'
    sides.push({ sport: s.sport, start: s.start, end: s.end })
  }
  return { date: n.date, start: n.start, end: n.end, sides }
}

/** "6:00 pm", "12:30 pm", and "midnight" for the 24:00 a stream cut at day's end gets. */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (h === 24 || (h === 0 && m === 0)) return 'midnight'
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** "today", "tomorrow", or "Saturday 14 November". `today` is the club-local date. */
export function dayLabel(date: string, today: string): string {
  if (date === today) return 'today'
  if (date === addDays(today, 1)) return 'tomorrow'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${date}T12:00:00Z`))
}

export type NextWords = {
  /** "Next session: today at 6:00 pm." */
  headline: string
  /** One line per sport: "Cricket 6:00 pm – 8:00 pm". */
  lines: string[]
  /** Set when the session is on a later day, which this day's link will not open. */
  newLinkNeeded: boolean
}

/** Null when there is nothing to say — 'unknown' says nothing rather than guess. */
export function nextWords(answer: NextAnswer, today: string): NextWords | null {
  if (answer === 'unknown') return null
  if (answer === null) {
    return { headline: 'No session is scheduled to stream in the next seven days.', lines: [], newLinkNeeded: false }
  }
  const day = dayLabel(answer.date, today)
  const when = day === 'today' || day === 'tomorrow' ? day : `on ${day}`
  return {
    headline: `Next session: ${when} at ${clock(answer.start)}.`,
    lines: answer.sides.map(
      s => `${s.sport === 'cricket' ? 'Cricket' : 'Badminton'} ${clock(s.start)} – ${clock(s.end)}`,
    ),
    newLinkNeeded: answer.date !== today,
  }
}

// ── the impure half ───────────────────────────────────────────────────────────
// A minute: the answer only moves when a booking does, and a car park of refreshing
// phones must not each cost the platform a week of booking reads.
const TTL_MS = 60_000
let cached: { at: number; value: NextAnswer } | null = null

export function forgetNext(): void {
  cached = null
}

/** Never throws: any failure is 'unknown'. */
export async function upcomingStream(
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<NextAnswer> {
  if (cached && now - cached.at < TTL_MS) return cached.value
  let value: NextAnswer = 'unknown'
  try {
    const res = await fetchImpl(NEXT_URL, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    if (res.ok) value = parseNext(await res.json())
  } catch {
    value = 'unknown'
  }
  cached = { at: now, value }
  return value
}
