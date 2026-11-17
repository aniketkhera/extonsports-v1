// What the platform's academy answers are allowed to become on this site, 2026-11-16
// (orangish-app docs/academy-page.md §3.3, the contract). Pure.
//
// ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH — lib/my-bookings/view.ts's rule. Each answer is copied
// field by field, each one type-checked; anything else the platform sends, today or after it
// grows a field, never reaches a page. A row that fails a check is dropped; a top level that
// fails is null, which the page renders as "can't show your page right now" — NEVER as an
// empty list. An empty Upcoming would tell PBA it has no court time on a night it has three
// courts booked.
//
// Three things this file is stricter about than the contract's shapes alone:
//   • `taken` CARRIES NOTHING (D9): a grid cell is one of five states and nothing else, so
//     no page can say whose a taken court is, whatever the platform sends with it.
//   • Upcoming `label` is a CLOSED SET. An event's description is shown to members on
//     /book/events and must never be rendered here (D9: "Never render event descriptions");
//     a label outside the set is dropped, the row kept.
//   • The partner's address is shown WHOLE — it is their own, on their own signed-in page
//     (mockup: "Signed in on this phone as …"), unlike /my-bookings, which only ever shows a
//     masked one. It is the only address any answer may carry.
//
// Also here: the club-local time and date wording every component uses. Club-local means the
// platform's `club.timezone` (America/New_York at Exton), never the server's or the phone's,
// so a partner reading the page abroad still sees Exton's 6:00 PM.

import { UUID_RE, isEmailShape } from '../my-bookings/guard'

export type Unit = 'court' | 'lane'
export type Use = 'coaching' | 'open_play'
export type PartnerKey = 'pba' | 'ccca'
/**
 * One rate as the platform sends it. `centsPerHour` is NULL when the platform cannot price that
 * time (orangish-app lib/academy-rules.ts overviewRates: CCCA past the last date of its
 * season). That is a page with nothing to sell, not a broken answer: Upcoming still shows, and
 * no summary, confirm line or button is drawn without a figure (2026-11-16 review: rejecting
 * the null took CCCA's whole page down from the day after its season).
 */
export type Rate = { use: Use | null; centsPerHour: number | null }
/** A rate with a figure — the only kind a price preview is ever built from. */
export type PricedRate = { use: Use | null; centsPerHour: number }

/** Why one extend option is refused (§3.3). */
export type ExtendReason = 'booked_from' | 'midnight' | 'closed' | 'season_end' | 'window'
export type ExtendOption = { minutes: 30 | 60; ok: boolean; reason: ExtendReason | null; at: string | null }
export type ExtendCourt = { courtId: string; label: string; freeUntil: string | null; options: ExtendOption[] }
export type ExtendGroup = { parentEnd: string; courtsLabel: string | null; use: Use | null; courts: ExtendCourt[] }

/** The labels Upcoming may print (D9). Anything else from the platform is dropped. */
export const UPCOMING_LABELS = ['Coaching', 'Open play', 'Only Girls – Free Coaching'] as const
export type UpcomingLabel = (typeof UPCOMING_LABELS)[number]
export type UpcomingItem = {
  start: string
  end: string
  courtLabels: string[]
  use: Use | null
  label: UpcomingLabel | null
  notBilled: boolean
  addedOn: string | null
}
export type UpcomingDay = { date: string; items: UpcomingItem[] }

export type OverviewView = {
  partner: { key: PartnerKey; name: string; sport: string; unit: Unit; email: string; billing: string }
  club: { name: string; timezone: string; phone: string | null }
  now: string
  today: string
  /** Days AFTER today that Book more reaches: the platform's window is today … today +
   *  windowDays, both ends included (orangish-app lib/academy-rules.ts bookWindow). */
  windowDays: number
  /** The window's last date as the platform computed it (today + windowDays), or null when
   *  it did not send one. It can narrow the chips, never widen them. */
  lastDate: string | null
  rates: Rate[]
  extend: ExtendGroup[]
  upcoming: UpcomingDay[]
  /** "Your regular hours continue to <date>" (D9). Not in §3.3's example: shown only when the
   *  platform sends it, so a platform without it simply has no such line. */
  regularUntil: string | null
}

export type CellState = 'yours' | 'free' | 'taken' | 'past' | 'closed'
export const CELL_STATES: readonly CellState[] = ['yours', 'free', 'taken', 'past', 'closed']
export type DayCourt = { id: string; label: string }
/** One 30-minute row: its start, and one state per court in `courts` order. */
export type DaySlot = { start: string; cells: CellState[] }
/**
 * `rates` are THAT DAY's, when the platform sends them; null when it does not, and the page
 * then prices from the overview's (today's). The platform charges by the BOOKED date (PBA's
 * licence §4.6: +3% from Mon 2028-01-03 and every first Monday of a January after), and the
 * 14-day window crosses each change, so for two weeks a year today's rate is not the one a
 * later date is billed at (2026-11-16 review).
 */
export type DayView = { date: string; courts: DayCourt[]; slots: DaySlot[]; rates: Rate[] | null }

/** Every whole-request refusal the platform names (§3.3, 422). */
export const REFUSE_REASONS = [
  'window', 'past', 'season_end', 'midnight', 'closed', 'not_yours', 'bad_use', 'daily_cap', 'not_extendable',
] as const
export type RefuseReason = (typeof REFUSE_REASONS)[number]

export type AddRow =
  | { courtId: string; ok: true; start: string; end: string; amountCents: number }
  | { courtId: string; ok: false; reason: string }

/**
 * What a press of Book / Extend came to, as the page renders it. Two families:
 *   • DEFINITE — `done` (the platform's per-court answer), `refused` (422: nothing written),
 *     `bad_request` (400: nothing sent or nothing written), `signed_out`, `off`: the next press
 *     is a new request with a new requestId.
 *   • IN DOUBT — `unknown` (a timeout, a 503, an answer that fails the allow-list) and
 *     `slow_down` (429): the press may or may not have written something, so the page keeps
 *     the SAME requestId for the retry. The platform is idempotent on it (§3.3: "a replay
 *     returns the first answer and sends no second email"), so pressing again can never add
 *     the time twice. A 503 is in doubt, not "nothing happened": per-court writes are
 *     independent, and one may have landed before the database stopped answering.
 */
export type AddView =
  | { status: 'done'; results: AddRow[]; totalCents: number; emailed: boolean }
  | { status: 'refused'; reason: RefuseReason | null }
  | { status: 'bad_request' }
  | { status: 'signed_out' }
  | { status: 'off' }
  | { status: 'slow_down' }
  | { status: 'unknown' }

/**
 * `stale` is the platform's 422 'window' for a day: the page asked for a date that is no longer
 * in the window, which only happens when the page has sat open past club-local midnight (its
 * chips start on yesterday). The page then fetches a new overview so today and the chips move
 * on, instead of re-asking for a refused date behind "Try again" (2026-11-16 review).
 */
export type DayResult =
  | { status: 'ok'; day: DayView }
  | { status: 'signed_out' }
  | { status: 'off' }
  | { status: 'stale' }
  | { status: 'unavailable' }

/* ── small checks (lib/my-bookings/view.ts's, kept local so this file stands alone) ── */

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}
function text(v: unknown, max = 120): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= max ? v : null
}
function iso(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v)) ? v : null
}
function int(v: unknown, lo: number, hi: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null
}
/** A real calendar date, YYYY-MM-DD. '2026-02-30' is not one. */
export function ymdOf(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  const probe = new Date(`${v}T12:00:00Z`)
  return !Number.isNaN(probe.getTime()) && probe.toISOString().slice(0, 10) === v ? v : null
}
function parseUse(v: unknown): Use | null | undefined {
  if (v === null || v === undefined) return null
  return v === 'coaching' || v === 'open_play' ? v : undefined
}
/** A phone is printed into a sentence; only digits and phone punctuation get there. */
function phoneOf(v: unknown): string | null {
  return typeof v === 'string' && /^[0-9+().\- ]{7,32}$/.test(v) ? v : null
}

/** An IANA zone this runtime knows. A zone it does not know would make every time on the
 *  page wrong (or throw), so the whole answer is refused instead. */
export function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !/^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){1,2}$/.test(tz)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/* ── the overview ──────────────────────────────────────────────────────────── */

const EXTEND_REASONS: readonly ExtendReason[] = ['booked_from', 'midnight', 'closed', 'season_end', 'window']

function toOption(raw: unknown): ExtendOption | null {
  const r = obj(raw)
  if (!r) return null
  const minutes = r.minutes === 30 || r.minutes === 60 ? r.minutes : null
  if (minutes === null || typeof r.ok !== 'boolean') return null
  // A refused option whose reason is new to this site keeps reason null: the page then says
  // "can't extend" without a why, rather than dropping the court or offering it.
  const reason = r.ok ? null : EXTEND_REASONS.find((x) => x === r.reason) ?? null
  const at = r.at === null || r.at === undefined ? null : iso(r.at)
  return { minutes, ok: r.ok, reason, at }
}

function toExtendCourt(raw: unknown): ExtendCourt | null {
  const r = obj(raw)
  if (!r) return null
  const courtId = typeof r.courtId === 'string' && UUID_RE.test(r.courtId) ? r.courtId : null
  const label = text(r.label, 40)
  const freeUntil = r.freeUntil === null || r.freeUntil === undefined ? null : iso(r.freeUntil)
  if (!courtId || !label || !Array.isArray(r.options) || r.options.length < 1 || r.options.length > 2) return null
  const options = r.options.map(toOption)
  if (options.some((o) => o === null)) return null
  const opts = options as ExtendOption[]
  if (new Set(opts.map((o) => o.minutes)).size !== opts.length) return null
  return { courtId, label, freeUntil, options: opts.sort((a, b) => a.minutes - b.minutes) }
}

function toExtendGroup(raw: unknown): ExtendGroup | null {
  const r = obj(raw)
  if (!r) return null
  const parentEnd = iso(r.parentEnd)
  const use = parseUse(r.use)
  if (!parentEnd || use === undefined || !Array.isArray(r.courts) || r.courts.length < 1 || r.courts.length > 6) return null
  const courts = r.courts.map(toExtendCourt)
  // A group with one bad court is dropped whole: offering two of its three courts would
  // read as "the third can't be extended", which nobody said.
  if (courts.some((c) => c === null)) return null
  return { parentEnd, courtsLabel: text(r.courtsLabel, 40), use, courts: courts as ExtendCourt[] }
}

function toUpcomingItem(raw: unknown): UpcomingItem | null {
  const r = obj(raw)
  if (!r) return null
  const start = iso(r.start)
  const end = iso(r.end)
  const use = parseUse(r.use)
  if (!start || !end || Date.parse(end) <= Date.parse(start) || use === undefined) return null
  if (!Array.isArray(r.courtLabels) || r.courtLabels.length < 1 || r.courtLabels.length > 10) return null
  const courtLabels = r.courtLabels.map((c) => text(c, 20))
  if (courtLabels.some((c) => c === null)) return null
  if (typeof r.notBilled !== 'boolean') return null
  const addedOn = r.addedOn === null || r.addedOn === undefined ? null : ymdOf(r.addedOn)
  if (addedOn === null && r.addedOn !== null && r.addedOn !== undefined) return null
  const label = UPCOMING_LABELS.find((l) => l === r.label) ?? null
  return { start, end, courtLabels: courtLabels as string[], use, label, notBilled: r.notBilled, addedOn }
}

function toUpcomingDay(raw: unknown): UpcomingDay | null {
  const r = obj(raw)
  if (!r) return null
  const date = ymdOf(r.date)
  if (!date || !Array.isArray(r.items) || r.items.length > 60) return null
  const items = r.items.map(toUpcomingItem).filter((x): x is UpcomingItem => x !== null)
  items.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  return items.length ? { date, items } : null
}

function toRate(raw: unknown): Rate | null {
  const r = obj(raw)
  if (!r) return null
  const use = parseUse(r.use)
  // null is the platform's "can't be priced here" (see Rate); a missing key or any other
  // value is still a broken rate.
  const centsPerHour = r.centsPerHour === null ? null : int(r.centsPerHour, 1, 100_000)
  if (use === undefined || (centsPerHour === null && r.centsPerHour !== null)) return null
  return { use, centsPerHour }
}

/** A rates list (the overview's, or a day's): 1–4 rates, every one well formed, else null. */
function toRates(v: unknown): Rate[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > 4) return null
  const rates = v.map(toRate)
  return rates.some((r) => r === null) ? null : (rates as Rate[])
}

/** GET /overview's 200 → the page's view, or null (=> "can't show your page right now"). */
export function toOverview(json: unknown): OverviewView | null {
  const j = obj(json)
  const p = obj(j?.partner)
  const c = obj(j?.club)
  if (!j || !p || !c) return null

  const key = p.key === 'pba' || p.key === 'ccca' ? p.key : null
  const unit = p.unit === 'court' || p.unit === 'lane' ? p.unit : null
  const name = text(p.name, 80)
  const sport = text(p.sport, 40)
  const email = typeof p.email === 'string' && isEmailShape(p.email) ? p.email : null
  const billing = text(p.billing, 60)
  if (!key || !unit || !name || !sport || !email || !billing) return null

  const clubName = text(c.name, 80)
  if (!clubName || !validTimeZone(c.timezone)) return null

  const now = iso(j.now)
  const today = ymdOf(j.today)
  const windowDays = int(j.windowDays, 1, 60)
  if (!now || !today || windowDays === null) return null

  const rates = toRates(j.rates)
  if (!rates) return null
  // A last date before today is not a window; the chips then follow windowDays alone.
  const last = ymdOf(j.lastDate)

  // Missing extend/upcoming is a broken answer, not an empty one.
  if (!Array.isArray(j.extend) || j.extend.length > 6) return null
  if (!Array.isArray(j.upcoming) || j.upcoming.length > 31) return null
  const extend = j.extend.map(toExtendGroup).filter((g): g is ExtendGroup => g !== null)
  const upcoming = j.upcoming.map(toUpcomingDay).filter((d): d is UpcomingDay => d !== null)
  upcoming.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    partner: { key, name, sport, unit, email, billing },
    club: { name: clubName, timezone: c.timezone as string, phone: phoneOf(c.phone) },
    now,
    today,
    windowDays,
    lastDate: last && last >= today ? last : null,
    rates,
    extend,
    upcoming,
    regularUntil: ymdOf(j.regularUntil),
  }
}

/* ── the day grid ──────────────────────────────────────────────────────────── */

/**
 * GET /day's 200 → the grid, or null. `asked` is the date this site asked for: an answer for
 * another day is not an answer. A cell whose state is new to this site is 'closed' — never
 * tappable — and a missing one too, so a grid can only ever offer what the platform called
 * free.
 */
export function toDay(json: unknown, asked: string): DayView | null {
  const j = obj(json)
  if (!j || ymdOf(j.date) !== asked) return null
  if (!Array.isArray(j.courts) || j.courts.length < 1 || j.courts.length > 6) return null
  const courts: DayCourt[] = []
  for (const raw of j.courts) {
    const r = obj(raw)
    const id = typeof r?.id === 'string' && UUID_RE.test(r.id) ? r.id : null
    const label = text(r?.label, 40)
    if (!id || !label || courts.some((x) => x.id === id)) return null
    courts.push({ id, label })
  }
  // 48 half-hours in a day; 50 on the autumn DST day.
  if (!Array.isArray(j.slots) || j.slots.length > 50) return null
  const slots: DaySlot[] = []
  for (const raw of j.slots) {
    const r = obj(raw)
    const start = iso(r?.start)
    if (!r || !start || !Array.isArray(r.cells)) return null
    const byCourt = new Map<string, CellState>()
    for (const cr of r.cells) {
      const cell = obj(cr)
      if (!cell || typeof cell.courtId !== 'string') continue
      byCourt.set(cell.courtId, CELL_STATES.find((s) => s === cell.state) ?? 'closed')
    }
    slots.push({ start, cells: courts.map((ct) => byCourt.get(ct.id) ?? 'closed') })
  }
  slots.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  for (let i = 1; i < slots.length; i++) if (slots[i].start === slots[i - 1].start) return null
  const rates = dayRatesOf(j.rates)
  if (rates === undefined) return null
  return { date: asked, courts, slots, rates }
}

/**
 * A day's own rates (see DayView): absent is null (a platform that does not send them yet;
 * the page prices from the overview), and present but malformed refuses the whole day —
 * falling back to today's figure there could put the wrong amount in the confirm line.
 */
function dayRatesOf(v: unknown): Rate[] | null | undefined {
  if (v === undefined || v === null) return null
  return toRates(v) ?? undefined
}

/* ── the write ─────────────────────────────────────────────────────────────── */

function toAddRow(raw: unknown): AddRow | null {
  const r = obj(raw)
  if (!r || typeof r.courtId !== 'string' || !UUID_RE.test(r.courtId)) return null
  if (r.ok === true) {
    const start = iso(r.start)
    const end = iso(r.end)
    const amountCents = int(r.amountCents, 0, 10_000_000)
    if (!start || !end || amountCents === null) return null
    return { courtId: r.courtId, ok: true, start, end, amountCents }
  }
  if (r.ok === false) {
    // The reason is a key the copy maps; anything that is not a plain key becomes 'other'.
    const reason = typeof r.reason === 'string' && /^[a-z_]{1,40}$/.test(r.reason) ? r.reason : 'other'
    return { courtId: r.courtId, ok: false, reason }
  }
  return null
}

/**
 * POST /add's answer (status + body) → AddView. Status 0 is "no answer" (a timeout, a
 * network failure): in doubt. A 200 that fails the allow-list is in doubt too — the
 * platform said yes to SOMETHING, and "nothing happened" could be false.
 */
export function toAddView(status: number, json: unknown): AddView {
  const j = obj(json)
  if (status === 200) {
    if (!j || !Array.isArray(j.results) || j.results.length < 1 || j.results.length > 6) return { status: 'unknown' }
    const results = j.results.map(toAddRow)
    const totalCents = int(j.totalCents, 0, 10_000_000)
    if (results.some((r) => r === null) || totalCents === null || typeof j.emailed !== 'boolean') return { status: 'unknown' }
    return { status: 'done', results: results as AddRow[], totalCents, emailed: j.emailed }
  }
  if (status === 422) return { status: 'refused', reason: REFUSE_REASONS.find((r) => r === j?.reason) ?? null }
  if (status === 400) return { status: 'bad_request' }
  if (status === 401) return { status: 'signed_out' }
  if (status === 404) return { status: 'off' }
  if (status === 429) return { status: 'slow_down' }
  return { status: 'unknown' }
}

const ADD_STATUSES: readonly AddView['status'][] = ['done', 'refused', 'bad_request', 'signed_out', 'off', 'slow_down', 'unknown']

/**
 * What the PAGE makes of this site's own /api/academies/add answer. That route answers every
 * platform outcome as 200 {status, …} (already through toAddView); its own refusals are
 * 400/403 (nothing sent: bad_request) and 429 (its per-IP limit: slow_down). Anything else,
 * or no answer at all, is in doubt.
 */
export function fromSiteAdd(httpStatus: number, json: unknown): AddView {
  if (httpStatus === 400 || httpStatus === 403) return { status: 'bad_request' }
  if (httpStatus === 429) return { status: 'slow_down' }
  const j = obj(json)
  if (httpStatus !== 200 || !j) return { status: 'unknown' }
  const s = ADD_STATUSES.find((x) => x === j.status)
  if (!s) return { status: 'unknown' }
  if (s === 'done') {
    const v = toAddView(200, j)
    return v.status === 'done' ? v : { status: 'unknown' }
  }
  if (s === 'refused') return { status: 'refused', reason: REFUSE_REASONS.find((r) => r === j.reason) ?? null }
  return { status: s } as AddView
}

/** Whether the next press must carry the SAME requestId (see AddView). */
export function keepRequestId(v: AddView): boolean {
  return v.status === 'unknown' || v.status === 'slow_down'
}

/**
 * This site's own DayView, as /api/academies/day sends it on (already through toDay), re-checked
 * in ITS shape: one state string per court, in `courts` order. Not toDay again — that reads the
 * PLATFORM's {courtId, state} cells, and fed this shape it found no cell at all and closed the
 * whole grid (2026-11-16, caught on the first render against a mock platform).
 */
function siteDayOf(json: unknown, asked: string): DayView | null {
  const j = obj(json)
  if (!j || ymdOf(j.date) !== asked || !Array.isArray(j.courts) || j.courts.length < 1 || j.courts.length > 6) return null
  const courts: DayCourt[] = []
  for (const raw of j.courts) {
    const r = obj(raw)
    const id = typeof r?.id === 'string' && UUID_RE.test(r.id) ? r.id : null
    const label = text(r?.label, 40)
    if (!id || !label || courts.some((x) => x.id === id)) return null
    courts.push({ id, label })
  }
  if (!Array.isArray(j.slots) || j.slots.length > 50) return null
  const slots: DaySlot[] = []
  for (const raw of j.slots) {
    const r = obj(raw)
    const start = iso(r?.start)
    if (!r || !start || !Array.isArray(r.cells) || r.cells.length !== courts.length) return null
    // A cell that is not a state string is the wrong shape: "can't show free courts", never
    // a grid of closed ones. A string this site does not know is 'closed' (never tappable).
    if (r.cells.some((c) => typeof c !== 'string')) return null
    slots.push({ start, cells: r.cells.map((c) => CELL_STATES.find((s) => s === c) ?? 'closed') })
  }
  const rates = dayRatesOf(j.rates)
  if (rates === undefined) return null
  return { date: asked, courts, slots, rates }
}

/** This site's own /api/academies/day answer → DayResult, re-checked here because the page
 *  must never render a grid it did not check (the route checked it too). */
export function fromSiteDay(httpStatus: number, json: unknown, asked: string): DayResult {
  const j = obj(json)
  if (httpStatus !== 200 || !j) return { status: 'unavailable' }
  if (j.status === 'signed_out' || j.status === 'off' || j.status === 'stale') return { status: j.status }
  if (j.status !== 'ok') return { status: 'unavailable' }
  const day = siteDayOf(j.day, asked)
  return day ? { status: 'ok', day } : { status: 'unavailable' }
}

/* ── sign-in refusals ──────────────────────────────────────────────────────── */

export type AcademyRedeemRefusal = 'invalid' | 'slow_down' | 'off' | 'try_again'

/**
 * What /api/academies/open and /verify answer for a refused sign-in, and whether the parked
 * email link is thrown away. ⛔ ONLY 'invalid' SPENDS THE PARKED LINK — the my-bookings rule
 * (lib/my-bookings/view.ts redeemRefusal, security review 2026-10-20): a limit someone else
 * ran up, or the page being switched off, must not read as "your link has expired".
 */
export function academyRedeemRefusal(e: AcademyRedeemRefusal): {
  status: 400 | 404 | 429 | 503
  body: { error: AcademyRedeemRefusal }
  clearLink: boolean
} {
  if (e === 'invalid') return { status: 400, body: { error: 'invalid' }, clearLink: true }
  if (e === 'slow_down') return { status: 429, body: { error: 'slow_down' }, clearLink: false }
  if (e === 'off') return { status: 404, body: { error: 'off' }, clearLink: false }
  return { status: 503, body: { error: 'try_again' }, clearLink: false }
}

/* ══ CLUB-LOCAL TIME ═══════════════════════════════════════════════════════════
   Every time on the page is an ISO instant from the platform, shown in the club's zone. */

const PARTS = new Map<string, Intl.DateTimeFormat>()
function partsFormat(tz: string): Intl.DateTimeFormat {
  let f = PARTS.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
    PARTS.set(tz, f)
  }
  return f
}

/** An instant → its club-local date and minute of the day, or null. */
export function localParts(isoText: string, tz: string): { ymd: string; minutes: number } | null {
  const t = Date.parse(isoText)
  if (!Number.isFinite(t)) return null
  try {
    const parts = partsFormat(tz).formatToParts(new Date(t))
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    const h = Number(get('hour')) % 24
    const m = Number(get('minute'))
    const ymd = `${get('year')}-${get('month')}-${get('day')}`
    if (!ymdOf(ymd) || !Number.isInteger(h) || !Number.isInteger(m)) return null
    return { ymd, minutes: h * 60 + m }
  } catch {
    return null
  }
}

/** "18:30" — the club-local wall time POST /add takes as `start`. */
export function localHm(isoText: string, tz: string): string | null {
  const p = localParts(isoText, tz)
  return p ? `${String(Math.floor(p.minutes / 60)).padStart(2, '0')}:${String(p.minutes % 60).padStart(2, '0')}` : null
}

function h12(minutes: number): { hm: string; mer: 'AM' | 'PM' } {
  const h = Math.floor(minutes / 60)
  return { hm: `${h % 12 === 0 ? 12 : h % 12}:${String(minutes % 60).padStart(2, '0')}`, mer: h < 12 ? 'AM' : 'PM' }
}

/** "6:30 PM", club-local. "" for an instant that is not one (the sentence then says less). */
export function clockText(isoText: string, tz: string): string {
  const p = localParts(isoText, tz)
  if (!p) return ''
  const c = h12(p.minutes)
  return `${c.hm} ${c.mer}`
}

/** "5:30–9:30 PM", or "10:00 AM–12:00 PM" across noon (the mockup's two forms). */
export function rangeText(startIso: string, endIso: string, tz: string): string {
  const s = localParts(startIso, tz)
  const e = localParts(endIso, tz)
  if (!s || !e) return ''
  const a = h12(s.minutes)
  const b = h12(e.minutes)
  return a.mer === b.mer && s.ymd === e.ymd ? `${a.hm}–${b.hm} ${b.mer}` : `${a.hm} ${a.mer}–${b.hm} ${b.mer}`
}

const WEEKDAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

/** A club-local date → "Mon 16 Nov", formatted at noon UTC so no zone can move it a day. */
export function dayShort(ymd: string): string {
  const d = ymdOf(ymd) ? new Date(`${ymd}T12:00:00Z`) : null
  if (!d) return ''
  return `${WEEKDAY.format(d)} ${d.getUTCDate()} ${MONTH.format(d)}`
}

/** "16 Nov". */
export function dayMonth(ymd: string): string {
  const d = ymdOf(ymd) ? new Date(`${ymd}T12:00:00Z`) : null
  return d ? `${d.getUTCDate()} ${MONTH.format(d)}` : ''
}

/** The day chip's two lines: "Mon" over "16". */
export function dayChip(ymd: string): { weekday: string; day: string } {
  const d = ymdOf(ymd) ? new Date(`${ymd}T12:00:00Z`) : null
  return d ? { weekday: WEEKDAY.format(d), day: String(d.getUTCDate()) } : { weekday: '', day: '' }
}

/** `ymd` plus n calendar days. */
export function addDays(ymd: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return ymd
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n)).toISOString().slice(0, 10)
}

/**
 * The dates "Book more" offers: today through today + 14, BOTH ENDS INCLUDED — fifteen chips
 * (D5: "to today + 14 days"; the public's 30-day window is not theirs). The platform's
 * windowDays counts days AFTER today, as its bookWindow does, and its lastDate is that same
 * last day; either can narrow the chips, neither can widen them past 14. The platform still
 * refuses a date outside its own window ('window').
 *
 * 2026-11-16 review: the first version read windowDays as a count of chips and stopped at
 * today + 13, so partners never saw the last day the platform would book.
 */
export const BOOK_MAX_DAYS = 14
export function bookDates(today: string, windowDays: number, lastDate: string | null = null): string[] {
  let ahead = Math.max(0, Math.min(BOOK_MAX_DAYS, Math.floor(windowDays) || 0))
  if (lastDate && ymdOf(lastDate) && lastDate >= today) {
    const toLast = Math.round((Date.parse(`${lastDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000)
    ahead = Math.min(ahead, toLast)
  }
  return Array.from({ length: ahead + 1 }, (_, i) => addDays(today, i))
}

/* ══ COURT WORDS ═══════════════════════════════════════════════════════════════ */

/** "Court 2" → "2". The platform's labels end in the court's number. */
export function courtNumber(label: string): string | null {
  const m = /(\d+)\s*$/.exec(label)
  return m ? m[1] : null
}

/**
 * Courts, as the mockup writes them: "Court 1", "Courts 1 and 2", "Courts 1–3",
 * "Courts 1, 3 and 4". A run is folded to "1–3" only when it is three or more, so two courts
 * always read as two. Labels with no number are listed as given. `lower` for a button:
 * "Book court 2".
 */
export function courtsText(unit: Unit, labels: string[], lower = false): string {
  const word = (n: number) => {
    const w = n === 1 ? unit : `${unit}s`
    return lower ? w : w[0].toUpperCase() + w.slice(1)
  }
  const nums = labels.map(courtNumber)
  if (labels.length === 0) return ''
  if (nums.some((n) => n === null)) return labels.join(', ')
  const sorted = [...new Set((nums as string[]).map(Number))].sort((a, b) => a - b)
  if (sorted.length === 1) return `${word(1)} ${sorted[0]}`
  const runs: string[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    if (j - i >= 2) runs.push(`${sorted[i]}–${sorted[j]}`)
    else for (let k = i; k <= j; k++) runs.push(String(sorted[k]))
    i = j + 1
  }
  const list = runs.length === 1 ? runs[0] : `${runs.slice(0, -1).join(', ')} and ${runs[runs.length - 1]}`
  return `${word(sorted.length)} ${list}`
}

/**
 * ONE court or lane, as a heading or a result line prints it: "Court 1", "Lane 2".
 *
 * ⛔ Never print a platform court label bare. The platform labels a court by its number alone,
 * "1" for BADMINTON 1 (orangish-app lib/academy-rules.ts courtLabelOf, the boards' rule), in
 * the extend card, the day grid and Upcoming alike, while the spec's example showed "Court 1".
 * Printed as sent, the grid's headers read "1 2 3" and a refusal read "2 was just booked"
 * (2026-11-16 review). courtsText takes both shapes, so this is right whichever arrives.
 */
export function courtName(unit: Unit, label: string): string {
  return courtsText(unit, [label])
}

/** Upcoming splits at a week: the first seven days show, "Show the next 7 days" the rest. */
export function splitWeek(days: UpcomingDay[], today: string): { first: UpcomingDay[]; later: UpcomingDay[] } {
  const cut = addDays(today, 7)
  return { first: days.filter((d) => d.date < cut), later: days.filter((d) => d.date >= cut) }
}
