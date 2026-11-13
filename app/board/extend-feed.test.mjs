/* The badminton TV's extend offers (extend-feed.ts), 2026-11-03.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; Node strips the types itself)

   The platform builds `extend` (orangish-app lib/court-extend-offers.ts; the schema is
   docs/court-extend.md §7.3) and the TV only checks and draws it. Every rule below
   passes tsc when broken, and each failure is the kind nobody sees until a player does:
   a price the server never quoted, a code drawn after its window, a panel from an
   answer three minutes old, a red TIME IS UP over someone who is paying, a contract
   rate printed on the wall. So: the validator accepts exactly the schema and drops a
   malformed offer; `extend` is never carried over; nothing is drawn outside
   opensAt..closesAt, or when stale or skewed; and the words are the approved ones. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

/* extensionless relative imports, the way the Next bundler resolves them (see
   board-lib.test.mjs). */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? ".ts" : ".js"), context);
    }
  },
});

const X = await import("./extend-feed.ts");
const REAL = JSON.parse(readFileSync(new URL("./extend-qr.fixture.json", import.meta.url), "utf8"));

const B1 = "966f0e16-352d-4d08-9ab2-7bd89f3e6026";
const B2 = "94c9d73e-4e4f-4673-8ba6-02d7b80f60c2";
const B3 = "be58cf03-6fa8-4539-a323-be7008c44b85";
const L1 = "0c2d6a55-0000-4000-8000-00000000c1c1"; // a cricket lane
const COURTS = [
  { id: B1, sport: "Badminton", sportId: "s-b", name: "BADMINTON 1", label: "1" },
  { id: B2, sport: "Badminton", sportId: "s-b", name: "BADMINTON 2", label: "2" },
  { id: B3, sport: "Badminton", sportId: "s-b", name: "BADMINTON 3", label: "3" },
  { id: L1, sport: "Cricket", sportId: "s-c", name: "LANE 1", label: "1" },
];
const LABEL = { [B1]: "1", [B2]: "2", [B3]: "3", [L1]: "1" };
const labelOf = (id) => LABEL[id] ?? "";

/* Sunday 2026-11-08, after the clocks went back: EST, UTC-5. A booking 1-2 PM. */
const T = Date.parse("2026-11-08T19:00:00.000Z");
const MIN = 60_000;
const iso = (ms) => new Date(ms).toISOString();
const qr = { size: 33, d: REAL.qr.d };
const len = (per, max, extra = {}) => ({
  available: true, maxCourts: max, perCourt: per,
  totals: Array.from({ length: max }, (_, i) => per * (i + 1)),
  moves: [], why: null, qr, ...extra,
});
/** An offer exactly as the platform's buildFeed writes one: every key, in its order. */
const offer = (over = {}) => ({
  key: "abcdefgh0123", layout: "one", state: "open", date: "2026-11-08", end: 840,
  endsAt: iso(T), opensAt: iso(T - 10 * MIN), closesAt: iso(T + 5 * MIN),
  basis: "published", courts: [B2], qr: null,
  lengths: { m30: len(2250, 1), m60: len(4500, 1) },
  ...over,
});
const feed = (offers, over = {}) => ({ now: iso(T - 7 * MIN), offers, moves: [], ...over });
const parse = (raw, at = T - 7 * MIN) => X.parseExtend(raw, COURTS, at);
const one = (o) => parse(feed([o]))?.offers ?? [];

test("the schema as the platform writes it is accepted, and read as instants", () => {
  const v = parse(feed([offer()]));
  assert.equal(v.offers.length, 1);
  const o = v.offers[0];
  assert.equal(o.key, "abcdefgh0123");
  assert.equal(o.endsAt, T);
  assert.equal(o.opensAt, T - 10 * MIN);
  assert.equal(o.closesAt, T + 5 * MIN);
  assert.deepEqual(o.lengths.m60.totals, [4500]);
  assert.equal(v.serverNow, T - 7 * MIN);
  assert.equal(v.receivedAt, T - 7 * MIN);
});

test("a real code from the platform's encoder passes; any other geometry does not", () => {
  assert.deepEqual(X.parseQr(REAL.qr), REAL.qr);
  assert.equal(X.parseQr({ ...REAL.qr, size: 29 }), null, "29 is the bare modules, not the measured 33");
  assert.equal(X.parseQr({ ...REAL.qr, size: 37 }), null, "version 4 or a 4-module quiet zone: never measured");
  assert.equal(X.parseQr({ size: 33, d: "" }), null);
  assert.equal(X.parseQr({ size: 33, d: `${REAL.qr.d}"/><script>` }), null, "only path letters, digits, spaces and minus");
  assert.equal(X.parseQr({ size: 33, d: "M2 2h1v1h-1z".repeat(700) }), null, "over 8,000 characters");
  assert.equal(X.parseQr({ size: "33", d: REAL.qr.d }), null);
});

test("a malformed offer is dropped — and only that one", () => {
  const bad = [
    { key: "ABCDEFGH0123" },                          // upper case is not the server's key
    { key: "abcdefgh012i" },                          // i is not Crockford
    { key: "abcdefgh01" },
    { layout: "grid" },
    { state: "held" },
    { basis: "member" },
    { date: "2026-11-09" },                           // not the date of endsAt in club time
    { end: 870 },                                     // not the minute of endsAt
    { opensAt: iso(T - 12 * MIN) },                   // the window is end − 10 … end + 5
    { closesAt: iso(T + 10 * MIN) },
    { endsAt: "tomorrow" },
    { courts: [] },
    { courts: ["not-a-court"] },                      // labelled from the payload's courts only
    { courts: [B2, B3] },                             // 'one' is one court
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), perCourt: 4400 } } },          // totals[0] is not perCourt
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), totals: [4500, 9000] } } },    // length is not maxCourts
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), maxCourts: 2, totals: [4500, 9000] } } }, // more than its courts
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), perCourt: 45.5, totals: [45.5] } } },     // cents are integers
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), qr: null } } },              // a two-code layout needs its code
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), qr: { size: 29, d: "M0 0h1v1h-1z" } } } },
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), why: "x".repeat(61) } } },
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), moves: [{ from: B1, to: B3 }] } } }, // from a court not in the offer
    { lengths: { m30: len(2250, 1), m60: { ...len(4500, 1), moves: [{ from: B2, to: "elsewhere" }] } } },
    { lengths: { m30: len(2250, 1) } },
  ];
  for (const b of bad) {
    const good = offer({ key: "good00000000", courts: [B1] });
    const v = parse(feed([offer(b), good], { offers: [offer(b), good] }));
    // Two 'one' offers would be over the layout's count — so test each alone as well.
    assert.deepEqual(one(offer(b)), [], `dropped: ${JSON.stringify(b).slice(0, 80)}`);
    assert.ok(v.offers.length <= 1);
  }
  // …and the good one beside a bad one in a two-card answer survives.
  const card = (over) => offer({ layout: "cards", ...over });
  const v = parse(feed([card({ key: "aaaaaaaaaaaa", state: "held" }), card({ key: "bbbbbbbbbbbb", courts: [B1] })]));
  assert.deepEqual(v.offers.map((o) => o.key), ["bbbbbbbbbbbb"]);
});

test("'cards-one-code' carries one code per offer, and none per length", () => {
  const o = offer({ layout: "cards-one-code", qr, lengths: { m30: len(2250, 1, { qr: null }), m60: len(4500, 1, { qr: null }) } });
  assert.equal(one(o).length, 1);
  assert.deepEqual(one({ ...o, qr: null }), [], "no offer-level code: nothing to scan");
});

/** A length that is not for sale, EXACTLY as the platform's lengthFeed writes it (orangish-app
 *  lib/court-extend-offers.ts): available false, maxCourts 0, perCourt null, totals [],
 *  moves from no plan, the plan's reason, and no code. */
const gone = (why = "Court 1 booked at 2:30 PM") => ({ available: false, maxCourts: 0, perCourt: null, totals: [], moves: [], why, qr: null });

test("a committed offer left with one length is kept, so the second scan and the open Checkout stay (Q15, Q8)", () => {
  // The approved mock-up's case: B2 + B3 paid for the hour; B1 is booked at 2:30, so only its 30 min is left.
  for (const state of ["open", "paying"]) {
    const o1 = offer({ state, courts: [B1], lengths: { m30: len(2250, 1), m60: gone() } });
    const [o] = one(o1);
    assert.ok(o, state);
    assert.deepEqual(o.lengths.m60, { available: false, maxCourts: 0, perCourt: null, totals: [], moves: [], why: "Court 1 booked at 2:30 PM", qr: null });
    assert.equal(X.drawnOffers(parse(feed([o1])), T - 7 * MIN, false).length, 1, `${state}: drawn`);
  }
  // Either length may be the one left.
  assert.equal(one(offer({ lengths: { m30: gone("Court 2 booked at 2:00 PM"), m60: len(4500, 1) } })).length, 1);
  // In 'cards-one-code' too, where the lengths never carry a code.
  assert.equal(one(offer({ layout: "cards-one-code", qr, lengths: { m30: len(2250, 1, { qr: null }), m60: gone() } })).length, 1);
});

test("…but only in exactly that shape, and never with nothing left for sale", () => {
  const bad = [
    { ...gone(), maxCourts: 1 },
    { ...gone(), perCourt: 4500 },
    { ...gone(), perCourt: 0 },
    { ...gone(), totals: [4500] },
    { ...gone(), qr },                                // a code for a length nobody can buy
    { ...gone(), moves: [{ from: B2, to: B3 }] },
    { ...gone(), why: null },
    { ...gone(), why: "" },
    { ...gone(), why: "x".repeat(61) },
    { ...gone(), available: "false" },
    { ...gone(), available: undefined },
  ];
  for (const m60 of bad) assert.deepEqual(one(offer({ lengths: { m30: len(2250, 1), m60 } })), [], JSON.stringify(m60).slice(0, 90));
  assert.deepEqual(one(offer({ lengths: { m30: gone(), m60: gone() } })), [], "both unavailable: no offer");
});

test("offers that disagree on layout, or more than the layout was measured for, draw no panel", () => {
  const a = offer({ key: "aaaaaaaaaaaa", layout: "cards", courts: [B1] });
  const b = offer({ key: "bbbbbbbbbbbb", layout: "cards-one-code", courts: [B2], qr, lengths: { m30: len(2250, 1, { qr: null }), m60: len(4500, 1, { qr: null }) } });
  assert.deepEqual(parse(feed([a, b])).offers, []);
  // Two 'one' offers: 'one' was measured with one.
  assert.deepEqual(parse(feed([offer({ key: "aaaaaaaaaaaa", courts: [B1] }), offer({ key: "bbbbbbbbbbbb" })])).offers, []);
  // More than three, whatever they are: three courts cannot make four.
  const c = (k, court) => offer({ key: k, layout: "cards-one-code", courts: [court], qr, lengths: { m30: len(2250, 1, { qr: null }), m60: len(4500, 1, { qr: null }) } });
  assert.equal(parse(feed([c("aaaaaaaaaaaa", B1), c("bbbbbbbbbbbb", B2), c("cccccccccccc", B3)])).offers.length, 3);
  assert.deepEqual(parse(feed([c("aaaaaaaaaaaa", B1), c("bbbbbbbbbbbb", B2), c("cccccccccccc", B3), c("dddddddddddd", B3)])).offers, []);
  // One court in two offers at the same end, or one key twice: not a real answer.
  assert.deepEqual(parse(feed([c("aaaaaaaaaaaa", B1), c("bbbbbbbbbbbb", B1)])).offers, []);
  assert.deepEqual(parse(feed([c("aaaaaaaaaaaa", B1), c("aaaaaaaaaaaa", B2)])).offers, []);
});

test("no `extend`, or not the shape, is no offers — never the last answer's", () => {
  assert.equal(parse(undefined), null);
  assert.equal(parse(null), null);
  assert.equal(parse({ offers: [] }), null);
  assert.equal(parse({ now: "x", offers: [], moves: [] }), null);
  assert.equal(parse([]), null);
  // The hook reads `extend` from each answer or not at all: no carry like the lights'.
  const src = readFileSync(new URL("../reception/ReceptionBoard.tsx", import.meta.url), "utf8");
  const sets = [...src.matchAll(/setExt\(([^)]*)\)/g)].map((m) => m[1]);
  assert.deepEqual(sets, ["view"], "the only write is this answer's parse");
  assert.match(src, /const view = key \? parseExtend\(body\.extend, body\.courts, at\) : null;/);
});

test("midnight: the booking's own date with end 1440", () => {
  const E = Date.parse("2026-11-13T05:00:00.000Z"); // Fri 13 Nov 24:00 EST = Sat 00:00
  const o = offer({ date: "2026-11-12", end: 1440, endsAt: iso(E), opensAt: iso(E - 10 * MIN), closesAt: iso(E + 5 * MIN) });
  assert.equal(one(o).length, 1);
  assert.deepEqual(one({ ...o, date: "2026-11-13" }), [], "the next date's 0 is not how the platform writes it");
});

test("drawn only inside opensAt..closesAt, and only from a fresh, unskewed answer", () => {
  /** Drawn at `ms`, from an answer that has just arrived. */
  const at = (ms, stale = false) => X.drawnOffers(parse(feed([offer()], { now: iso(ms) }), ms), ms, stale).length;
  // The server sends it up to 12 min out; the TV draws from 10.
  assert.equal(at(T - 10 * MIN - 1), 0);
  assert.equal(at(T - 10 * MIN), 1);
  assert.equal(at(T), 1, "held past the end, red");
  assert.equal(at(T + 5 * MIN - 1), 1);
  assert.equal(at(T + 5 * MIN), 0, "gone at closesAt, even from an answer still in date");
  assert.equal(at(T - 9 * MIN, true), 0, "a failed poll: stale");

  // The last good poll must be at most 90 s old.
  const fresh = parse(feed([offer()], { now: iso(T - 5 * MIN) }), T - 5 * MIN);
  assert.equal(X.drawnOffers(fresh, T - 5 * MIN + 90_000, false).length, 1);
  assert.equal(X.drawnOffers(fresh, T - 5 * MIN + 90_001, false).length, 0);

  // This TV's clock within 60 s of the server's when the answer came, either way.
  const skew = (d) => X.drawnOffers(parse(feed([offer()], { now: iso(T - 5 * MIN) }), T - 5 * MIN + d), T - 5 * MIN + d, false).length;
  assert.equal(skew(60_000), 1);
  assert.equal(skew(-60_000), 1);
  assert.equal(skew(60_001), 0);
  assert.equal(skew(-60_001), 0);
  assert.deepEqual(X.drawnOffers(null, T, false), []);
});

test("the badminton TV's poll goes on after a request that never answers (review of PR #171)", async () => {
  // A fetch that settles only by being aborted — what a stalled request looks like.
  let calls = 0, failures = 0;
  const load = async (signal) => {
    calls++;
    try {
      await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    } catch { failures++; } // load's own catch: the hook sets stale here
  };
  const stop = X.pollLoop({ load, delay: () => 5, timeoutMs: 30 });
  await new Promise((r) => setTimeout(r, 400));
  stop();
  const after = calls;
  assert.ok(calls >= 4, `polled ${calls} times`);
  assert.ok(failures >= calls - 1, "every stalled poll ended in load's catch");
  await new Promise((r) => setTimeout(r, 120));
  assert.ok(calls <= after + 1, "and it stops when told");
  // A load that throws does not end the chain either.
  let n = 0;
  const stop2 = X.pollLoop({ load: async () => { n++; throw new Error("boom"); }, delay: () => 5, timeoutMs: 30 });
  await new Promise((r) => setTimeout(r, 100));
  stop2();
  assert.ok(n >= 3, `threw ${n} times and went on`);
  // The hook's chain is this one, with the limit, and its fetch takes the signal.
  const src = readFileSync(new URL("../reception/ReceptionBoard.tsx", import.meta.url), "utf8");
  assert.match(src, /const stop = pollLoop\(\{ load, delay: \(\) => \(fast \? EXTEND_FAST_POLL_MS : 60_000\) \}\);/);
  assert.match(src, /await fetch\(url, signal \? \{ \.\.\.init, signal \} : init\)/);
  assert.ok(X.EXTEND_POLL_TIMEOUT_MS < 60_000, "under the 60 s pace");
});

test("an offer is matched to its ON NOW entry by date, end and a court — never by holder", () => {
  const [o] = one(offer());
  assert.equal(X.offerForEntry([o], { date: "2026-11-08", to: 840, courts: ["2"] }, labelOf), o);
  assert.equal(X.offerForEntry([o], { date: "2026-11-08", to: 840, courts: ["1", "2"] }, labelOf), o);
  assert.equal(X.offerForEntry([o], { date: "2026-11-08", to: 840, courts: ["3"] }, labelOf), null);
  assert.equal(X.offerForEntry([o], { date: "2026-11-08", to: 870, courts: ["2"] }, labelOf), null);
  assert.equal(X.offerForEntry([o], { date: "2026-11-09", to: 840, courts: ["2"] }, labelOf), null);
});

test("one sport's panel never draws another sport's offer", () => {
  const v = parse(feed([offer()], { moves: [{ date: "2026-11-08", at: 840, from: B2, to: B3 }, { date: "2026-11-08", at: 840, from: L1, to: B3 }] }));
  const bad = X.forSport(v, new Set([B1, B3]));
  assert.deepEqual(bad.offers, []);
  const ok = X.forSport(v, new Set([B1, B2, B3]));
  assert.equal(ok.offers.length, 1);
  assert.deepEqual(ok.moves.map((m) => m.from), [B2]);
});

/* ── The words ──────────────────────────────────────────────────────────────── */

const face = (offers, now, raw = feed(offers, { now: iso(now) })) => X.panelFace(X.drawnOffers(parse(raw, now), now, false), now, labelOf);

test("money and times read as on the mock-ups", () => {
  assert.equal(X.money(2250), "$22.50");
  assert.equal(X.money(4500), "$45");
  assert.equal(X.money(12000), "$120");
  assert.equal(X.hm(840), "2:00");
  assert.equal(X.hm(1440), "12:00");
  assert.equal(X.spanA(840, 870), "2:00 – 2:30 PM");
  assert.equal(X.spanA(690, 750), "11:30 AM – 12:30 PM");
  assert.equal(X.spanA(1410, 1470), "11:30 PM – 12:30 AM");
  assert.equal(X.spanTight(1320, 1380), "10:00–11:00");
});

test("one court, T−7: the approved face", () => {
  const f = face([offer()], T - 7 * MIN);
  assert.equal(f.layout, "one");
  assert.equal(f.tone, "orange");
  assert.equal(f.chip, "COURT 2");
  assert.equal(f.h1, "BOOKING ENDS IN 7 MIN");
  assert.equal(f.h2.text, "Do you wish to extend?");
  assert.deepEqual(f.tiles.map((t) => [t.what, t.when, t.price]), [
    ["EXTEND 30 MIN", "2:00 – 2:30 PM", "$22.50"],
    ["EXTEND 1 HOUR", "2:00 – 3:00 PM", "$45"],
  ]);
  assert.equal(f.foot, "Scan with your phone camera · pay by card · stay on Court 2");
});

test("minutes are rounded up and never 0; at the end it turns red and holds to end + 5", () => {
  assert.equal(face([offer()], T - 10 * MIN).h1, "BOOKING ENDS IN 10 MIN");
  assert.equal(face([offer()], T - 9 * MIN - 59_000).h1, "BOOKING ENDS IN 10 MIN");
  assert.equal(face([offer()], T - 1000).h1, "BOOKING ENDS IN 1 MIN");
  const red = face([offer()], T);
  assert.equal(red.tone, "red");
  assert.equal(red.h1, "YOUR TIME IS UP");
  assert.equal(red.h2.text, "Scan now to keep playing · open until 2:05");
  assert.equal(red.foot, "The extension starts at 2:00, when your booking ended");
  assert.equal(X.panelFace([], T, labelOf), null);
});

test("PAYMENT IN PROGRESS keeps the codes and is never red", () => {
  const p = offer({ state: "paying" });
  const before = face([p], T - 7 * MIN);
  assert.equal(before.h2.text, "PAYMENT IN PROGRESS");
  assert.equal(before.tiles.length, 2, "the codes stay (Q8)");
  const after = face([p], T + 2 * MIN);
  assert.equal(after.tone, "orange", "red only for an OPEN offer past its end");
  assert.equal(after.h2.text, "PAYMENT IN PROGRESS");
});

test("the TV never works out a price: every figure is a total the server sent", () => {
  // Totals that are not n × perCourt (the server's to send), to prove they are read.
  const o = offer({
    layout: "multi", courts: [B1, B2, B3],
    lengths: { m30: len(2250, 3, { totals: [2250, 4400, 6600] }), m60: len(4500, 2, { totals: [4500, 8800], why: "Court 1 booked at 2:30 PM" }) },
  });
  const f = face([o], T - 7 * MIN);
  assert.equal(f.chip, "COURTS 1 · 2 · 3");
  assert.equal(f.h1, "END IN 7 MIN");
  assert.deepEqual(f.heads, ["30 MIN · 2:00–2:30", "1 HOUR · 2:00–3:00"]);
  assert.deepEqual(f.rows.map((r) => [r.n, ...r.cells.map((c) => c.price ?? c.why)]), [
    ["1 court", "$22.50", "$45"],
    ["2 courts", "$44", "$88"],
    ["3 courts", "$66", "Court 1 booked at 2:30 PM"],
  ]);
  assert.deepEqual(f.codes.map((c) => [c.what, ...c.lines]), [
    ["30 MIN", "up to 3 courts", "pick on phone"],
    ["1 HOUR", "up to 2 courts", "pick on phone"],
  ]);
  // A dash, not the reason again, in a second row past the max.
  const o2 = offer({ layout: "multi", courts: [B1, B2, B3], lengths: { m30: len(2250, 3), m60: len(4500, 1, { why: "Court 1 booked at 2:30 PM" }) } });
  assert.deepEqual(face([o2], T - 7 * MIN).rows.map((r) => r.cells[1].price ?? r.cells[1].why), ["$45", "Court 1 booked at 2:30 PM", "—"]);
});

test("a contract (Q4): AGREED RATE on the wall, no figure anywhere", () => {
  const forms = [
    offer({ basis: "contract", lengths: { m30: len(1500, 1), m60: len(3000, 1) } }),
    offer({ basis: "contract", layout: "multi", courts: [B1, B2], lengths: { m30: len(1500, 2), m60: len(3000, 2) } }),
  ];
  for (const o of forms) {
    const f = face([o], T - 7 * MIN);
    assert.doesNotMatch(JSON.stringify(f), /\$\d/, `${o.layout}: no dollar figure`);
    assert.match(JSON.stringify(f), /AGREED RATE/);
  }
  const card = (k, court, basis) => offer({ key: k, layout: "cards", courts: [court], basis, lengths: { m30: len(1500, 1), m60: len(3000, 1) } });
  const f = face([card("aaaaaaaaaaaa", B1, "contract"), card("bbbbbbbbbbbb", B2, "published")], T - 7 * MIN);
  assert.deepEqual(f.cards.map((c) => c.opts.map((o) => o.price)), [["AGREED RATE", "AGREED RATE"], ["$15", "$30"]]);
});

test("the move face (Q20): the own court is taken from the end, another is free", () => {
  const mv = { moves: [{ from: B2, to: B3 }] };
  const o = offer({ lengths: { m30: len(2250, 1, mv), m60: len(4500, 1, mv) } });
  const f = face([o], T - 7 * MIN);
  assert.equal(f.chip, "COURT 2");
  assert.equal(f.h1, "IS BOOKED FROM 2:00");
  assert.deepEqual([f.h2.text, f.h2.accent, f.h2.tail], ["Keep playing on ", "Court 3", "?"]);
  assert.deepEqual(f.tiles.map((t) => t.what), ["30 MIN · COURT 3", "1 HOUR · COURT 3"]);
  assert.equal(f.foot, "Move to Court 3 at 2:00 so the next players can start on Court 2");
  // Only the hour moves: the ordinary face, with the hour's tile naming its court.
  const half = face([offer({ lengths: { m30: len(2250, 1), m60: len(4500, 1, mv) } })], T - 7 * MIN);
  assert.equal(half.h1, "BOOKING ENDS IN 7 MIN");
  assert.deepEqual(half.tiles.map((t) => t.what), ["EXTEND 30 MIN", "1 HOUR · COURT 3"]);
  // On a card: COURT 2 → 3.
  const card = offer({ layout: "cards", lengths: { m30: len(2250, 1, mv), m60: len(4500, 1, mv) } });
  assert.equal(face([card], T - 7 * MIN).cards[0].name, "COURT 2 → 3");
});

test("one length left: drawn as its reason, with no code and no price, in every layout", () => {
  const why = "Court 1 booked at 2:30 PM";
  for (const state of ["open", "paying"]) {
    const f = face([offer({ state, courts: [B1], lengths: { m30: len(2250, 1), m60: gone(why) } })], T - 7 * MIN);
    assert.deepEqual(f.tiles.map((t) => [t.what, !!t.qr, t.price, t.why]), [["EXTEND 30 MIN", true, "$22.50", null], ["EXTEND 1 HOUR", false, "", why]]);
    assert.equal(f.h2.text, state === "paying" ? "PAYMENT IN PROGRESS" : "Do you wish to extend?");
  }
  const m = face([offer({ layout: "multi", courts: [B1, B2], lengths: { m30: len(2250, 2), m60: gone(why) } })], T - 7 * MIN);
  assert.deepEqual(m.rows.map((r) => r.cells.map((c) => c.price ?? c.why)), [["$22.50", why], ["$45", "—"]]);
  assert.deepEqual(m.codes.map((c) => [c.what, !!c.qr, ...c.lines]), [["30 MIN", true, "up to 2 courts", "pick on phone"], ["1 HOUR", false, why]]);
  const c = face([offer({ key: "aaaaaaaaaaaa", layout: "cards", courts: [B1], lengths: { m30: len(2250, 1), m60: gone(why) } }), offer({ key: "bbbbbbbbbbbb", layout: "cards", courts: [B2] })], T - 7 * MIN);
  assert.deepEqual(c.cards[0].opts.map((o) => [o.what, !!o.qr, o.price, o.why]), [["30 MIN", true, "$22.50", null], ["1 HOUR", false, "", why]]);
  const k = (key, court, lengths, over = {}) => offer({ key, layout: "cards-one-code", courts: [court], qr, lengths, ...over });
  const cc = face([
    k("aaaaaaaaaaaa", B1, { m30: len(2250, 1, { qr: null }), m60: gone(why) }),
    k("bbbbbbbbbbbb", B2, { m30: len(2250, 1, { qr: null }), m60: len(4500, 1, { qr: null }) }),
    k("cccccccccccc", B3, { m30: gone("Court 3 booked at 2:00 PM"), m60: len(4500, 1, { qr: null }) }, { basis: "contract" }),
  ], T - 7 * MIN);
  assert.deepEqual(cc.cards.map((x) => [x.prices, x.line]), [
    [[{ what: "30 MIN", price: "$22.50" }], "scan, then extend 30 min"],
    [[{ what: "30 MIN", price: "$22.50" }, { what: "1 HOUR", price: "$45" }], "scan, then pick 30 min or 1 hour"],
    [null, "scan to see it, then extend 1 hour"],
  ]);
  // Nothing draws a price or a code for the length that is gone.
  const t = face([offer({ courts: [B1], lengths: { m30: len(2250, 1), m60: gone(why) } })], T - 7 * MIN).tiles[1];
  assert.equal(t.qr, null);
  assert.ok(!t.price && !t.when);
});

test("two bookings: a card each; red and paying are said on the card", () => {
  const a = offer({ key: "aaaaaaaaaaaa", layout: "cards", courts: [B1] });
  const b = offer({ key: "bbbbbbbbbbbb", layout: "cards", courts: [B2, B3], lengths: { m30: len(2250, 2), m60: len(4500, 2) } });
  const f = face([a, b], T - 7 * MIN);
  assert.equal(f.h1, "2 BOOKINGS END IN 7 MIN");
  assert.deepEqual(f.cards.map((c) => [c.name, c.small]), [
    ["COURT 1", "ends 2:00 PM"],
    ["COURTS 2 + 3", "ends 2:00 PM · price for 2 courts, pick on phone"],
  ]);
  assert.deepEqual(f.cards[1].opts.map((o) => [o.what, o.price, o.when]), [["30 MIN", "$45", "2:00–2:30"], ["1 HOUR", "$90", "2:00–3:00"]]);
  const late = face([a, { ...b, state: "paying" }], T + MIN);
  assert.equal(late.tone, "red", "one open offer past its end");
  assert.equal(late.h1, "YOUR TIME IS UP");
  assert.deepEqual(late.cards.map((c) => c.small), ["ended 2:00 · open until 2:05", "PAYMENT IN PROGRESS"]);
  // Fewer drawn than the layout counts: the server's layout, the count from what is drawn.
  const b2 = { ...b, end: 870, endsAt: iso(T + 30 * MIN), opensAt: iso(T + 20 * MIN), closesAt: iso(T + 35 * MIN) };
  const few = face([a, b2], T - 7 * MIN);
  assert.equal(few.layout, "cards");
  assert.equal(few.cards.length, 1);
  assert.equal(few.h1, "BOOKING ENDS IN 7 MIN");
});

test("three bookings: one code each, the length picked on the phone", () => {
  const c = (k, court, over = {}) => offer({ key: k, layout: "cards-one-code", courts: [court], qr, lengths: { m30: len(2250, 1, { qr: null }), m60: len(4500, 1, { qr: null }) }, ...over });
  const all = [c("aaaaaaaaaaaa", B1), c("bbbbbbbbbbbb", B2, { state: "paying" }), c("cccccccccccc", B3, { basis: "contract" })];
  const f = face(all, T - 7 * MIN);
  assert.equal(f.h1, "3 BOOKINGS END IN 7 MIN");
  assert.deepEqual(f.cards.map((x) => [x.name, x.small, x.line]), [
    ["COURT 1", "ends 2:00 PM", "scan, then pick 30 min or 1 hour"],
    ["COURT 2", "ends 2:00 PM", "PAYMENT IN PROGRESS"],
    ["COURT 3", "ends 2:00 PM", "scan to see it, then pick 30 min or 1 hour"],
  ]);
  assert.deepEqual(f.cards[0].prices, [{ what: "30 MIN", price: "$22.50" }, { what: "1 HOUR", price: "$45" }]);
  assert.equal(f.cards[2].prices, null);
  const red = face(all, T + MIN);
  assert.equal(red.h1, "YOUR TIME IS UP");
  assert.equal(red.cards[0].small, "ended 2:00 · open until 2:05");
});

test("the music code: badminton TV only, gone with the extend panel, image and URL agree (2026-11-13)", () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const tv = read("../components/TvScreen.tsx");
  // Exactly one screen asks for it.
  assert.equal(tv.match(/\bmusic\b(?= \/>)/g)?.length, 1);
  assert.match(tv, /"cricket-board": \(\) => <SportBoard sport="Cricket" \/>/);
  // No other screen fills the band's slot: only SportBoard and ExtendBand mention MusicQr.
  for (const p of [
    "../reception/ReceptionBoard.tsx", "../vestibule/VestibuleScreen.tsx", "../our-club/OurClubScreen.tsx",
    "../exit/ExitScreen.tsx", "../components/LiveBand.tsx", "../components/ScreenChrome.tsx",
  ]) {
    const src = read(p);
    // JSX use only: ScreenChrome's comment names MusicQr.tsx, which is fine.
    assert.ok(!/<MusicQr\b|\bmusic=\{/.test(src), `${p} must not draw the music code`);
  }
  // SportBoard is all that keeps it off the cricket TV (review, 2026-11-13): off by default,
  // and passed on only from its own `music` prop, on both branches.
  const sport = read("../reception/SportBoard.tsx");
  assert.match(sport, /export default function SportBoard\(\{ sport, extend = false, music = false \}/);
  assert.match(sport, /<ExtendBand p=\{p\} stale=\{stale\} stamp=\{<ScreenStamp style=\{BAND_STAMP\} \/>\} music=\{music\} \/>/);
  assert.match(sport, /: <BookingBand stamp=\{<ScreenStamp style=\{BAND_STAMP\} \/>\} music=\{music \? <MusicQr \/> : undefined\} \/>/);
  assert.equal(sport.match(/<MusicQr \/>/g)?.length, 1);
  // Under `extend` it rides the same `up` that hides the booking QR: never beside the panel.
  const ext = read("../reception/ExtendPanel.tsx");
  assert.match(ext, /<BookingBand showBookQr=\{!up\} stamp=\{stamp\} music=\{music && !up \? <MusicQr \/> : undefined\} \/>/);
  assert.match(ext, /export function ExtendBand\(\{ p, stale, stamp, music = false \}/);
  // The band's default leaves every other screen's markup as it was: the slot is rendered
  // as given, once, between the pill and the booking link, and nothing stands in for it.
  const chrome = read("../components/ScreenChrome.tsx");
  assert.match(chrome, /export function BookingBand\(\{ showBookQr = true, stamp, music \}/);
  assert.equal(chrome.match(/\{music\}/g)?.length, 1);
  assert.match(chrome, /<OrangishPill tv \/>\s*<\/div>\s*\{\/\*[\s\S]*?\*\/\}\s*\{music\}\s*<a\s+href=\{BOOK_URL\}/);
  // The SVG is generated from MUSIC_URL; its <title> carries the URL, so a change to one without the other fails here.
  const url = read("../reception/MusicQr.tsx").match(/export const MUSIC_URL = "([^"]+)";/)?.[1];
  assert.equal(url, "https://extonsports.com/music");
  const svg = read("../../public/reception/music-qr.svg");
  assert.match(svg, new RegExp(`<title>Music at Exton Sports: ${url.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}</title>`));
  assert.match(svg, /viewBox="0 0 37 37"/); // version 3 + 4-module quiet zone, as generated
});

test("the badminton TV alone reads `extend`; the line is FREE AFTER everywhere else (Q19)", () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const tv = read("../components/TvScreen.tsx");
  assert.match(tv, /"badminton-board": \(\) => <SportBoard sport="Badminton" extend music \/>/);
  assert.match(tv, /"cricket-board": \(\) => <SportBoard sport="Cricket" \/>/);
  // Reception and the vestibule never ask for it.
  for (const p of ["../reception/ReceptionBoard.tsx", "../vestibule/VestibuleScreen.tsx"]) {
    for (const m of read(p).matchAll(/useCourtPanels\(\{([^}]*)\}\)/g)) assert.ok(!/extend/.test(m[1]), `${p}: ${m[1]}`);
  }
  const board = read("../reception/ReceptionBoard.tsx");
  // Only the comment that records the change still says it.
  assert.equal(board.match(/EXTEND IN THE APP/g)?.length, 1);
  assert.match(board, /FREE AFTER\$\{showing\.scan \? " · SCAN TO EXTEND →" : ""\}/);
  // `scan` and `move` are set only from this sport's offers, only under `extend`.
  assert.match(board, /const sportExt = extend && ext \? forSport\(ext, ids\) : null;/);
  assert.equal(board.match(/\.scan = true/g)?.length, 1);
  assert.equal(board.match(/\.move = /g)?.length, 1);
  // Q20's words, with the time (§9e E4).
  assert.ok(board.includes('line = `MOVE TO ${noun}${to.length > 1 ? "S" : ""} ${to.join(", ")} AT ${hm(at)}`'), "MOVE TO COURT 3 AT 2:00");
  // …at the compact entry size even in a big entry: the big one ran 45 px past the column (tv-fit movedPaidBig).
  assert.ok(board.includes("tight = true; break;") && board.includes("fontSize: big && !tight ?"), "the move line is drawn compact");
});

test("never green, never a holder: the panel's words carry no name and no colour", () => {
  const src = readFileSync(new URL("../reception/ExtendPanel.tsx", import.meta.url), "utf8");
  const lib = readFileSync(new URL("./extend-feed.ts", import.meta.url), "utf8");
  // assert.ok, not doesNotMatch: a failure would print the whole source.
  assert.ok(!/#79EA92/i.test(src) && !/import[^;]*\bGREEN\b/.test(src), "green on this board means a free court");
  assert.ok(!/dangerouslySetInnerHTML/.test(src), "the code is drawn as a React attribute");
  assert.ok(!/\.who\b/.test(src) && !/\.who\b/.test(lib), "the panel never reads a holder");
});
