// The faces the badminton TV's extend panel is measured in (orangish-app docs/court-extend.md
// §10.9). Each is a frozen clock, the blocks the board draws on the left, and the `extend` the
// platform would send — in the §7.3 schema, as lib/court-extend-offers.ts buildFeed writes it.
//
// The six T−7 faces are the 2026-11-02 fit check's (mockups/tvb.mjs, same names, same blocks,
// same prices); the rest are the faces §10.9 says were never measured: red from the end to the
// close, PAYMENT IN PROGRESS, the move face before payment and MOVE TO COURT 3 after it, and the
// contract's AGREED RATE.

export const B1 = '966f0e16-352d-4d08-9ab2-7bd89f3e6026'
export const B2 = '94c9d73e-4e4f-4673-8ba6-02d7b80f60c2'
export const B3 = 'be58cf03-6fa8-4539-a323-be7008c44b85'
const SPORT = 'badminton-sport'
export const COURTS = [
  { id: B1, sport: 'Badminton', sportId: SPORT, name: 'BADMINTON 1', label: '1' },
  { id: B2, sport: 'Badminton', sportId: SPORT, name: 'BADMINTON 2', label: '2' },
  { id: B3, sport: 'Badminton', sportId: SPORT, name: 'BADMINTON 3', label: '3' },
]

const m = (h, mm = 0) => h * 60 + mm
// Club-local wall time → instant. November 2026 is EST (UTC−5) throughout.
const at = (day, min) => { const [y, mo, d] = day.split('-').map(Number); return Date.UTC(y, mo - 1, d, 5, 0) + min * 60_000 }
// Names off, as the badminton TV is keyed (Q12): a private hire carries no holder, so it reads PRIVATE.
const bk = (day, court, from, to) => ({ date: day, courtId: court, from, to, kind: 'booking' })
const pba = (day, court, from, to) => ({ date: day, courtId: court, from, to, kind: 'programme', org: 'philadelphia-badminton', session: 'junior-coaching', who: 'Philadelphia Badminton' })
const SUN = '2026-11-08', WED = '2026-11-11', FRI = '2026-11-13'
const pbaSun = [B1, B2, B3].map((c) => pba(SUN, c, m(16), m(18)))

/** A length as the platform sends it: totals[i] = per × (i + 1), every court costing the same. */
const len = (per, max, extra = {}) => ({ per, max, ...extra })
/** One offer: its courts, end, lengths and anything else that differs. */
const off = (courts, end, m30, m60, extra = {}) => ({ courts, end, m30, m60, ...extra })

const one = (extra = {}) => off([B2], m(14), len(2250, 1), len(4500, 1), extra)
const three = (extra = {}) => off([B1, B2, B3], m(14), len(2250, 3), len(4500, 2, { why: 'Court 1 booked at 2:30 PM' }), extra)
const two = (extra = [{}, {}]) => [
  off([B1], m(14), len(2250, 1), len(4500, 1), extra[0]),
  off([B2, B3], m(14), len(2250, 2), len(4500, 2), extra[1]),
]
const threeG = (extra = [{}, {}, {}]) => [B1, B2, B3].map((c, i) => off([c], m(14), len(2250, 1), len(4500, 1), extra[i]))
const mv = (from, to) => ({ moves: [{ from, to }] })
const contract = { basis: 'contract' }
const paying = { state: 'paying' }

const oneBlocks = [bk(SUN, B1, m(12, 30), m(15)), bk(SUN, B2, m(13), m(14)), ...pbaSun]
const threeBlocks = [bk(SUN, B1, m(13), m(14)), bk(SUN, B2, m(13), m(14)), bk(SUN, B3, m(13), m(14)), bk(SUN, B1, m(14, 30), m(15, 30)), ...pbaSun]
const twoBlocks = [bk(SUN, B1, m(13), m(14)), bk(SUN, B2, m(12, 30), m(14)), bk(SUN, B3, m(12, 30), m(14)), ...pbaSun]
const threeGBlocks = [bk(SUN, B1, m(13), m(14)), bk(SUN, B2, m(12), m(14)), bk(SUN, B3, m(12, 30), m(14)), ...pbaSun]
// The move: Court 2 is booked from the end by somebody else, Court 3 is free.
const moveBlocks = [bk(SUN, B1, m(12, 30), m(15)), bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14), m(15)), ...pbaSun]
const move60Blocks = [bk(SUN, B1, m(12, 30), m(15)), bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14, 30), m(15, 30)), ...pbaSun]
const twoMoveBlocks = [bk(SUN, B1, m(13), m(14)), bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14), m(15)), ...pbaSun]

const T7 = [13, 53], T2 = [14, 2]

/** name → { day, clock [h, mm], blocks, offers, moves?, measured? } */
export const SCENARIOS = {
  // ── The six measured on 2026-11-02 (tvb.mjs) ───────────────────────────────
  one: { day: SUN, clock: T7, blocks: oneBlocks, offers: [one()] },
  three: { day: SUN, clock: T7, blocks: threeBlocks, offers: [three()] },
  // Weekday, across the 5 PM peak edge: 4:30–5:00 $20 a court; 4:30–5:30 $20 + $22.50.
  edge: { day: WED, clock: [16, 23], blocks: [bk(WED, B1, m(15, 30), m(16, 30)), bk(WED, B2, m(15, 30), m(16, 30))], offers: [off([B1, B2], m(16, 30), len(2000, 2), len(4250, 2))] },
  // Longest strings: three courts, 10 PM, two-digit hours.
  late: { day: FRI, clock: [21, 53], blocks: [B1, B2, B3].map((c) => bk(FRI, c, m(20, 30), m(22))), offers: [off([B1, B2, B3], m(22), len(2000, 3), len(4000, 3))] },
  twoGroups: { day: SUN, clock: T7, blocks: twoBlocks, offers: two() },
  threeGroups: { day: SUN, clock: T7, blocks: threeGBlocks, offers: threeG() },

  // ── Red, from the end to the close (T+2) ───────────────────────────────────
  oneRed: { day: SUN, clock: T2, blocks: oneBlocks, offers: [one()] },
  threeRed: { day: SUN, clock: T2, blocks: threeBlocks, offers: [three()] },
  lateRed: { day: FRI, clock: [22, 2], blocks: [B1, B2, B3].map((c) => bk(FRI, c, m(20, 30), m(22))), offers: [off([B1, B2, B3], m(22), len(2000, 3), len(4000, 3))] },
  twoGroupsRed: { day: SUN, clock: T2, blocks: twoBlocks, offers: two() },
  threeGroupsRed: { day: SUN, clock: T2, blocks: threeGBlocks, offers: threeG() },

  // ── PAYMENT IN PROGRESS, codes still up ────────────────────────────────────
  onePaying: { day: SUN, clock: T7, blocks: oneBlocks, offers: [one(paying)] },
  onePayingEnded: { day: SUN, clock: T2, blocks: oneBlocks, offers: [one(paying)] },
  threePaying: { day: SUN, clock: T7, blocks: threeBlocks, offers: [three(paying)] },
  twoGroupsPaying: { day: SUN, clock: T2, blocks: twoBlocks, offers: two([{}, paying]) },
  threeGroupsPaying: { day: SUN, clock: T7, blocks: threeGBlocks, offers: threeG([{}, paying, {}]) },

  // ── The move, before payment (Q20) ─────────────────────────────────────────
  oneMove: { day: SUN, clock: T7, blocks: moveBlocks, offers: [one({ m30: len(2250, 1, mv(B2, B3)), m60: len(4500, 1, mv(B2, B3)) })] },
  oneMoveRed: { day: SUN, clock: T2, blocks: moveBlocks, offers: [one({ m30: len(2250, 1, mv(B2, B3)), m60: len(4500, 1, mv(B2, B3)) })] },
  oneMoveHour: { day: SUN, clock: T7, blocks: move60Blocks, offers: [one({ m60: len(4500, 1, mv(B2, B3)) })] },
  threeMove: { day: SUN, clock: T7, blocks: [bk(SUN, B1, m(13), m(14)), bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14), m(15)), ...pbaSun], offers: [off([B1, B2], m(14), len(2250, 2, mv(B2, B3)), len(4500, 2, mv(B2, B3)))] },
  twoGroupsMove: { day: SUN, clock: T7, blocks: twoMoveBlocks, offers: [off([B1], m(14), len(2250, 1), len(4500, 1)), off([B2], m(14), len(2250, 1, mv(B2, B3)), len(4500, 1, mv(B2, B3)))] },

  // ── After payment: MOVE TO COURT 3 on the left, no offer (§9e E4) ─────────
  // Court 2's group paid to carry on on Court 3; the next group is on Court 2.
  movedPaid: { day: SUN, clock: T2, blocks: [bk(SUN, B1, m(12, 30), m(15)), bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14), m(15)), bk(SUN, B3, m(14), m(15)), ...pbaSun], offers: [], moves: [{ date: SUN, at: m(14), from: B2, to: B3 }] },
  // The same with nothing else on, so the entries are drawn big.
  movedPaidBig: { day: SUN, clock: T2, blocks: [bk(SUN, B2, m(13), m(14)), bk(SUN, B2, m(14), m(15)), ...pbaSun], offers: [], moves: [{ date: SUN, at: m(14), from: B2, to: B3 }] },

  // ── A contract (Q4): AGREED RATE ───────────────────────────────────────────
  oneContract: { day: SUN, clock: T7, blocks: oneBlocks, offers: [one({ ...contract, m30: len(1500, 1), m60: len(3000, 1) })] },
  oneContractRed: { day: SUN, clock: T2, blocks: oneBlocks, offers: [one({ ...contract, m30: len(1500, 1), m60: len(3000, 1) })] },
  threeContract: { day: SUN, clock: T7, blocks: threeBlocks, offers: [three(contract)] },
  twoGroupsContract: { day: SUN, clock: T7, blocks: twoBlocks, offers: two([contract, {}]) },
  threeGroupsContract: { day: SUN, clock: T7, blocks: threeGBlocks, offers: threeG([{}, {}, contract]) },
}

/** The instant a scenario's clock reads. */
export const instantOf = (s) => at(s.day, s.clock[0] * 60 + s.clock[1])

/**
 * The court-board answer for a scenario, with `extend` built the way the platform builds it:
 * the layout picked from the offers (pickLayout), codes per length or one per offer, totals
 * from the per-court price, window end − 10 … end + 5. `qrFor(text)` is the platform's
 * encoder (see fit.mjs). Returns the payload and the code texts the panel should show.
 */
export function payload(name, s, qrFor) {
  const now = instantOf(s)
  const layout = s.offers.length >= 3 ? 'cards-one-code' : s.offers.length === 2 ? 'cards' : (s.offers[0]?.courts.length ?? 0) > 1 ? 'multi' : 'one'
  const texts = []
  let n = 0
  const code = () => {
    // Deterministic 8-character codes from the alphabet, per scenario and offer.
    const A = '0123456789abcdefghjkmnpqrstvwxyz'
    let h = 2166136261
    for (const ch of `${name}:${n++}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
    let s = ''
    for (let i = 0; i < 8; i++) { s += A[h & 31]; h = Math.imul(h ^ (h >>> 5), 2654435761) >>> 0 }
    return s
  }
  const keyOf = (i) => `${'abcdefghjkmn'.slice(0, 11)}${'0123456789'[i]}`
  const offers = s.offers.map((o, i) => {
    const c = code()
    const url = (L) => `https://app.orangish.io/x/${c}${L ? `/${L}` : ''}`
    const endsAt = at(s.day, o.end)
    const length = (l, L) => {
      const q = layout === 'cards-one-code' ? null : qrFor(url(L))
      if (q) texts.push(url(L))
      return {
        available: true, maxCourts: l.max, perCourt: l.per,
        totals: Array.from({ length: l.max }, (_, k) => l.per * (k + 1)),
        moves: l.moves ?? [], why: l.why ?? null, qr: q,
      }
    }
    const qr = layout === 'cards-one-code' ? qrFor(url()) : null
    if (qr) texts.push(url())
    return {
      key: keyOf(i), layout, state: o.state ?? 'open', date: s.day, end: o.end,
      endsAt: new Date(endsAt).toISOString(), opensAt: new Date(endsAt - 600_000).toISOString(), closesAt: new Date(endsAt + 300_000).toISOString(),
      basis: o.basis ?? 'published', courts: o.courts, qr,
      lengths: { m30: length(o.m30, 30), m60: length(o.m60, 60) },
    }
  })
  return {
    texts,
    body: {
      timeZone: 'America/New_York',
      days: [s.day],
      courts: COURTS,
      blocks: s.blocks,
      lights: { sports: ['badminton'], now: new Date(now).toISOString(), windows: [], bridge: { reported_at: new Date(now).toISOString(), zones: [{ zone: 'badminton', on: true, override: null }] } },
      extend: { now: new Date(now).toISOString(), offers, moves: s.moves ?? [] },
    },
  }
}
