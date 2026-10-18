/* What keeps CCCA's free girls' hour named, and nobody else's hour named, 2026-10-15.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test on this one file; see package.json)

   This repo has no test runner and must not grow one for this: node_modules here is
   shared between checkouts. So this is node:test, run on the .ts sources directly —
   Node strips the types itself — with nothing installed and nothing compiled.

   Why it is committed rather than left in a session scratchpad: every invariant
   below passes `tsc` when broken. Generalise the "different sessions" rule in
   joinSessions and 9-10 silently becomes a "9 AM - 12 PM" CCCA block on /board and
   /calendar, the one hour the owner asked to see named. Drop `org === "ccca"` from
   sessionOf and a mislabelled block can print the free girls' label over somebody's
   own hire. Loosen the relay's allow-list and a name reaches a public page. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

/* The sources import the way the Next bundler resolves, not the way Node does:
   extensionless relative paths to .ts files ("../../lib/opening"), and
   "next/server", a package with no exports map. Retry just those two shapes. Must
   be registered before the sources load, so they are imported dynamically below. */
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

const L = await import("./board-lib.ts");

const base = { date: "2026-10-24", courtId: "c1", kind: "booking" };
const who = "Chester County Cricket Academy";
const free = { ...base, from: 540, to: 600, org: "ccca", who, session: "free-girls-class" };
const junior = { ...base, from: 600, to: 720, org: "ccca", who, session: "junior-coaching" };

test("the label is the owner's exact words, in their case", () => {
  assert.equal(L.SESSION_TEXT["free-girls-class"], "Only Girls – Free Coaching");
});

test("sessionOf: the free word is accepted on an hour keyed to CCCA", () => {
  assert.equal(L.sessionOf(free), "free-girls-class");
});

test("sessionOf: the free word is refused without org 'ccca', whatever `who` says", () => {
  assert.equal(L.sessionOf({ ...free, org: undefined }), null);
  assert.equal(L.sessionOf({ ...free, org: "sera" }), null);
  // A holder string that reads like the label must not confer it either.
  assert.equal(L.sessionOf({ ...free, org: undefined, who: "Only Girls – Free Coaching" }), null);
});

test("sessionOf: the two older words pass as before, unknown words do not", () => {
  assert.equal(L.sessionOf(junior), "junior-coaching");
  assert.equal(L.sessionOf({ ...junior, session: "open-play" }), "open-play");
  assert.equal(L.sessionOf({ ...junior, session: "something-new" }), null);
  assert.equal(L.sessionOf({ ...junior, session: undefined }), null);
});

test("joinSessions keeps the free hour apart from CCCA's own hours, in either order", () => {
  const after = L.joinSessions([junior, free]);
  assert.deepEqual(after.map((b) => [b.from, b.to, b.session]), [
    [540, 600, "free-girls-class"],
    [600, 720, "junior-coaching"],
  ]);
  const before = { ...junior, from: 480, to: 540 };
  const lead = L.joinSessions([free, before]);
  assert.deepEqual(lead.map((b) => [b.from, b.to, b.session]), [
    [480, 540, "junior-coaching"],
    [540, 600, "free-girls-class"],
  ]);
});

test("joinSessions still joins a partner's junior coaching into its open play", () => {
  const p = { ...base, kind: "programme", org: "philadelphia-badminton", who: "Philadelphia Badminton" };
  const j = L.joinSessions([
    { ...p, from: 1050, to: 1170, session: "junior-coaching" },
    { ...p, from: 1170, to: 1290, session: "open-play" },
  ]);
  assert.equal(j.length, 1);
  assert.deepEqual([j[0].from, j[0].to, j[0].session], [1050, 1290, undefined]);
});

test("joinSessions never joins two members' back-to-back hours", () => {
  const a = { ...base, from: 600, to: 660, who: "A" };
  const b = { ...base, from: 660, to: 720, who: "B" };
  assert.equal(L.joinSessions([a, b]).length, 2);
});

test("boardLabel: the free hour prints the label, exact case", () => {
  assert.equal(L.boardLabel(free), "Only Girls – Free Coaching");
});

test("boardLabel: CCCA's regular hours still print CCCA", () => {
  assert.equal(L.boardLabel(junior), "CHESTER COUNTY CRICKET ACADEMY");
});

test("boardLabel: the free word without org 'ccca' falls back to the plain holder", () => {
  assert.equal(L.boardLabel({ ...free, org: undefined, who: "Rohitha K" }), "ROHITHA K");
  assert.equal(L.boardLabel({ ...free, org: undefined, who: undefined }), "PRIVATE");
});

test("holderLabel is unchanged for the free hour (reception reads it for the lockup)", () => {
  assert.equal(L.holderLabel(free), "CHESTER COUNTY CRICKET ACADEMY");
});

/* The public relay, against a stubbed upstream: no network. The allow-list is the
   guard for everything above it, since the site never reads a name. */
test("/api/court-slots passes only the fixed words and never forwards `who`", async (t) => {
  const upstream = {
    timeZone: "America/New_York",
    days: ["2026-10-24"],
    courts: [{ id: "c1", sport: "Cricket", sportId: "s", name: "CRICKET 1", label: "1" }],
    blocks: [
      { ...base, from: 540, to: 600, org: "ccca", who, session: "free-girls-class" },
      { ...base, from: 600, to: 720, org: "ccca", session: "junior-coaching" },
      // The label typed as text, and an unknown word: both dropped.
      { ...base, from: 720, to: 780, session: "Only Girls – Free Coaching" },
      { ...base, from: 780, to: 840, session: "vip" },
    ],
  };
  let asked = "";
  t.mock.method(globalThis, "fetch", async (url) => {
    asked = String(url);
    return { ok: true, json: async () => upstream };
  });

  const R = await import("../api/court-slots/route.ts");
  const res = await R.GET(new Request("https://extonsports.com/api/court-slots?days=7"));
  const body = await res.json();

  assert.match(asked, /[?&]sessions=1(&|$)/);
  assert.deepEqual(body.blocks.map((b) => b.session ?? null), ["free-girls-class", "junior-coaching", null, null]);
  assert.deepEqual(body.blocks.map((b) => b.org ?? null), ["ccca", "ccca", null, null]);
  assert.ok(body.blocks.every((b) => !("who" in b)), "who is never forwarded");
});

/* The public relay and the lights (2026-10-18, "Add there too"): the schedule only,
   and only when asked. The bridge's report and any override never pass. */
test("/api/court-slots forwards the lights SCHEDULE only when asked, and never the bridge", async (t) => {
  const grid = { timeZone: "America/New_York", days: ["2026-10-18"], courts: [], blocks: [] };
  const lightsUp = {
    sports: ["badminton"],
    now: "2026-10-18T14:00:00.000Z",
    windows: [{ zone: "badminton", on_at: "2026-10-18T19:45:00.000Z", off_at: "2026-10-18T22:15:00.000Z", extra: 1 }],
    bridge: { reported_at: "2026-10-18T13:59:50.000Z", zones: [{ zone: "badminton", on: true, override: { on: true, until: "2026-10-18T20:00:00Z" } }] },
  };
  let upstream = { ...grid, lights: lightsUp };
  const asked = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    asked.push(String(url));
    return { ok: true, json: async () => upstream };
  });
  const R = await import("../api/court-slots/route.ts");

  // Unasked (/calendar, /board): not requested upstream, not forwarded even if sent.
  const plain = await (await R.GET(new Request("https://extonsports.com/api/court-slots?days=7"))).json();
  assert.doesNotMatch(asked.at(-1), /lights=1/);
  assert.equal("lights" in plain, false);

  // Asked: requested upstream; windows only, bridge null, no override anywhere.
  const withL = await (await R.GET(new Request("https://extonsports.com/api/court-slots?lights=1"))).json();
  assert.match(asked.at(-1), /[?&]lights=1(&|$)/);
  assert.deepEqual(withL.lights, {
    sports: ["badminton"],
    now: "2026-10-18T14:00:00.000Z",
    windows: [{ zone: "badminton", on_at: "2026-10-18T19:45:00.000Z", off_at: "2026-10-18T22:15:00.000Z" }],
    bridge: null,
  });
  assert.equal(JSON.stringify(withL).includes("override"), false);

  // ⛔ One unreadable window withholds them all; no lights upstream means none here.
  upstream = { ...grid, lights: { ...lightsUp, windows: [...lightsUp.windows, { zone: "badminton", on_at: "soon", off_at: "later" }] } };
  assert.equal("lights" in (await (await R.GET(new Request("https://extonsports.com/api/court-slots?lights=1"))).json()), false);
  upstream = grid;
  assert.equal("lights" in (await (await R.GET(new Request("https://extonsports.com/api/court-slots?lights=1"))).json()), false);
});

/* UP NEXT on the reception screen (2026-10-16): what moves up out of the list when
   no court in a sport is in use. Wrong in either direction is visible from the desk:
   a booking shown twice (big AND first in AFTER THAT), or a simultaneous one left
   under AFTER THAT as if it started later. */
test("splitUpNext: nothing on court — the earliest start moves up, the rest follow", () => {
  const a = { date: "2026-10-16", from: 1020, to: 1080, who: "A" };
  const b = { date: "2026-10-16", from: 1260, to: 1320, who: "B" };
  const c = { date: "2026-10-17", from: 540, to: 660, who: "C" };
  const { upNext, rest } = L.splitUpNext([], [a, b, c], 2);
  assert.deepEqual(upNext.map((e) => e.who), ["A"]);
  assert.deepEqual(rest.map((e) => e.who), ["B", "C"]);
});

test("splitUpNext: two starting together both move up; a third stays first in the list", () => {
  const at5 = (who) => ({ date: "2026-10-16", from: 1020, to: 1080, who });
  const later = { date: "2026-10-16", from: 1080, to: 1200, who: "D" };
  const two = L.splitUpNext([], [at5("A"), at5("B"), later], 2);
  assert.deepEqual(two.upNext.map((e) => e.who), ["A", "B"]);
  assert.deepEqual(two.rest.map((e) => e.who), ["D"]);
  const three = L.splitUpNext([], [at5("A"), at5("B"), at5("C"), later], 2);
  assert.deepEqual(three.upNext.map((e) => e.who), ["A", "B"]);
  assert.deepEqual(three.rest.map((e) => e.who), ["C", "D"]);
});

test("splitUpNext: the earliest by date then time, even if the input is not sorted", () => {
  const tomorrow = { date: "2026-10-17", from: 420, to: 480, who: "T" };
  const tonight = { date: "2026-10-16", from: 1260, to: 1320, who: "N" };
  const { upNext, rest } = L.splitUpNext([], [tomorrow, tonight], 2);
  assert.deepEqual(upNext.map((e) => e.who), ["N"]);
  assert.deepEqual(rest.map((e) => e.who), ["T"]);
});

test("splitUpNext: someone on court, or nothing ahead — no UP NEXT, list untouched", () => {
  const a = { date: "2026-10-16", from: 1020, to: 1080, who: "A" };
  const live = L.splitUpNext([{ who: "on court" }], [a], 2);
  assert.deepEqual(live.upNext, []);
  assert.deepEqual(live.rest, [a]);
  const empty = L.splitUpNext([], [], 2);
  assert.deepEqual(empty, { upNext: [], rest: [] });
});

/* /board's rows (2026-10-16): the middle column is ON NOW or UP NEXT, the last is
   the booking after it. Wrong here is a vestibule screen that says a court is in
   use when it is not, or skips a booking between two columns. */
test("courtRow: someone on court — ON NOW, then the next booking", () => {
  const court = { id: "c1", sport: "Badminton", sportId: "s", name: "BADMINTON 1", label: "1" };
  const b = (date, from, to, who) => ({ date, courtId: "c1", from, to, kind: "booking", who });
  const blocks = [b("2026-10-16", 600, 720, "A"), b("2026-10-16", 1020, 1080, "B"), b("2026-10-17", 540, 600, "C")];
  const r = L.courtRow(court, blocks, "2026-10-16", "2026-10-17", 660);
  assert.equal(r.first.who, "A");
  assert.equal(r.firstIsNow, true);
  assert.equal(r.then.who, "B");
  assert.equal(r.thenIsTomorrow, false);
});

test("courtRow: court free — UP NEXT is the first booking ahead, AFTER THAT the one after", () => {
  const court = { id: "c1", sport: "Squash", sportId: "s", name: "SQUASH 1", label: "1" };
  const b = (date, from, to, who) => ({ date, courtId: "c1", from, to, kind: "booking", who });
  // Unsorted on purpose, with one already over and one beyond tomorrow.
  const blocks = [b("2026-10-17", 600, 660, "T2"), b("2026-10-16", 480, 540, "OVER"), b("2026-10-18", 540, 600, "LATER"), b("2026-10-17", 540, 600, "T1")];
  const r = L.courtRow(court, blocks, "2026-10-16", "2026-10-17", 690);
  assert.equal(r.first.who, "T1");
  assert.equal(r.firstIsNow, false);
  assert.equal(r.firstIsTomorrow, true);
  assert.equal(r.then.who, "T2");
  assert.equal(r.thenIsTomorrow, true);
});

test("courtRow: a booking starting this minute is ON NOW; nothing in the window is OPEN", () => {
  const court = { id: "c1", sport: "Cricket", sportId: "s", name: "CRICKET 1", label: "1" };
  const starts = { date: "2026-10-16", courtId: "c1", from: 1020, to: 1080, kind: "booking", who: "S" };
  const r = L.courtRow(court, [starts], "2026-10-16", "2026-10-17", 1020);
  assert.equal(r.firstIsNow, true);
  assert.equal(r.first.who, "S");
  assert.equal(r.then, null);
  const empty = L.courtRow(court, [], "2026-10-16", "2026-10-17", 1020);
  assert.equal(empty.first, null);
  assert.equal(empty.then, null);
  // No tomorrow in the payload's day list: only today counts.
  const t = { date: "2026-10-17", courtId: "c1", from: 540, to: 600, kind: "booking", who: "T" };
  assert.equal(L.courtRow(court, [t], "2026-10-16", undefined, 1200).first, null);
});

/* The lights chip on the reception screen (2026-10-18): which of the four states a
   sport's title shows. Wrong here is a lobby screen saying LIGHTS ON over a dark
   court, or a countdown to the end of a window that does not end. */
const T0 = Date.parse("2026-10-18T22:00:00.000Z");
const MIN = 60_000;
const iso = (ms) => new Date(ms).toISOString();
const win = (zone, on, off) => ({ zone, on_at: iso(T0 + on * MIN), off_at: iso(T0 + off * MIN) });
const lights = (windows, bridge = null, sports = ["badminton"]) => ({ sports, now: iso(T0), windows, bridge });
const report = (zones, ageMin = 0.5) => ({ reported_at: iso(T0 - ageMin * MIN), zones });
const zoneOn = (on, override = null) => ({ zone: "badminton", on, override });

test("lightChip: nothing without `lights`, or for a sport whose lights are not automated", () => {
  assert.equal(L.lightChip("Badminton", undefined, T0), null);
  assert.equal(L.lightChip("Squash", lights([win("squash", -10, 60)]), T0), null);
  assert.equal(L.lightChip("Cricket", lights([]), T0), null);
});

test("lightChip: always shown for an automated sport, LIGHTS OFF when nothing is near", () => {
  assert.deepEqual(L.lightChip("Badminton", lights([]), T0), { kind: "off" });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 31, 90)]), T0), { kind: "off" });
});

test("lightChip: the calendar alone — on, then the last 15 minutes count down, rounded up", () => {
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 16)]), T0), { kind: "on" });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 15)]), T0), { kind: "offIn", min: 15 });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 7.5)]), T0), { kind: "offIn", min: 8 });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 0.1)]), T0), { kind: "offIn", min: 1 });
  // off_at is exclusive: at the instant it ends the window is over.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 0)]), T0), { kind: "off" });
});

test("lightChip: the calendar alone — LIGHTS ON IN n MIN inside half an hour, rounded up", () => {
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 30, 90)]), T0), { kind: "onIn", min: 30 });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 11 + 10 / 60, 90)]), T0), { kind: "onIn", min: 12 });
  // The earliest window ahead, whatever order the feed sends them in.
  const two = lights([win("badminton", 200, 260), win("badminton", 20, 80)]);
  assert.deepEqual(L.lightChip("Badminton", two, T0), { kind: "onIn", min: 20 });
});

test("lightChip: another zone's windows never light this one; the sport name is matched in any case", () => {
  assert.deepEqual(L.lightChip("Badminton", lights([win("squash", -10, 60)], null, ["badminton", "squash"]), T0), { kind: "off" });
  assert.deepEqual(L.lightChip("BADMINTON", lights([win("badminton", -10, 60)]), T0), { kind: "on" });
});

test("lightChip: overlapping windows that arrive unmerged do not count down to the first one's end", () => {
  const l = lights([win("badminton", -60, 10), win("badminton", 5, 120)]);
  assert.deepEqual(L.lightChip("Badminton", l, T0), { kind: "on" });
  const touching = lights([win("badminton", -60, 10), win("badminton", 10, 120)]);
  assert.deepEqual(L.lightChip("Badminton", touching, T0), { kind: "on" });
});

test("lightChip: a fresh report's belief beats the calendar, both ways", () => {
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 60)], report([zoneOn(false)])), T0), { kind: "off" });
  assert.deepEqual(L.lightChip("Badminton", lights([], report([zoneOn(true)])), T0), { kind: "on" });
  // Believed off, with a window opening soon: still says when they come on.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 20, 90)], report([zoneOn(false)])), T0), { kind: "onIn", min: 20 });
  // Believed on inside a window that is ending: the countdown still shows.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 9)], report([zoneOn(true)])), T0), { kind: "offIn", min: 9 });
});

test("lightChip: a report with no belief (null), or no entry for the zone, leaves it to the calendar", () => {
  const sched = [win("badminton", -30, 60)];
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([zoneOn(null)])), T0), { kind: "on" });
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([])), T0), { kind: "on" });
});

test("lightChip: a stale report (over 3 min) is ignored; exactly 3 min is still fresh", () => {
  const sched = [win("badminton", -30, 60)];
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([zoneOn(false)], 3.01)), T0), { kind: "on" });
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([zoneOn(false)], 3)), T0), { kind: "off" });
});

test("lightChip: for 2 minutes after a window opens or closes, the calendar beats the report", () => {
  // Opened 1 min ago; the newest report still says off.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -1, 60)], report([zoneOn(false)])), T0), { kind: "on" });
  // Closed 1 min ago; the newest report still says on.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -60, -1)], report([zoneOn(true)])), T0), { kind: "off" });
  // Past the 2 minutes, the report decides again.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -2.5, 60)], report([zoneOn(false)])), T0), { kind: "off" });
});

/* 2026-10-18 review: the 2-minute rule counts on the TV's clock, so a poll that
   failed or ran slow near a transition left the TV holding a report from BEFORE it,
   still fresh after the 2 minutes ran out — and the chip flashed the old state. */
test("lightChip: a report stamped too soon after a transition to have seen it is ignored", () => {
  // Opened 2.5 min ago; the newest report was made 10 s BEFORE it opened.
  const early = 2.5 + 10 / 60;
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -2.5, 60)], report([zoneOn(false)], early)), T0), { kind: "on" });
  // Closed 2.5 min ago; the newest report was made 10 s before it closed.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -60, -2.5)], report([zoneOn(true)], early)), T0), { kind: "off" });
  // Made 30 s after the opening: still inside the bridge's 45 s to act, still ignored.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -2.5, 60)], report([zoneOn(false)], 2)), T0), { kind: "on" });
  // Made exactly 45 s after it: the bridge has had its pass, so the report decides.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -2.5, 60)], report([zoneOn(false)], 1.75)), T0), { kind: "off" });
  // A transition still ahead is not one a report could have missed.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", -30, 20)], report([zoneOn(false)], 2.9)), T0), { kind: "off" });
});

test("lightChip: a live override on a fresh report decides, on or off, with no countdown", () => {
  const until = iso(T0 + 120 * MIN);
  // Forced off inside a window that is about to end: LIGHTS OFF, not a countdown.
  const ending = [win("badminton", -30, 5)];
  assert.deepEqual(L.lightChip("Badminton", lights(ending, report([zoneOn(null, { on: false, until })])), T0), { kind: "off" });
  assert.deepEqual(L.lightChip("Badminton", lights(ending, report([zoneOn(false, { on: false, until })])), T0), { kind: "off" });
  // Forced on inside the same window: LIGHTS ON, not LIGHTS OFF IN 5 MIN.
  assert.deepEqual(L.lightChip("Badminton", lights(ending, report([zoneOn(true, { on: true, until })])), T0), { kind: "on" });
  // Forced on with nothing booked, and with a window about to open.
  assert.deepEqual(L.lightChip("Badminton", lights([], report([zoneOn(null, { on: true, until })])), T0), { kind: "on" });
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 5, 60)], report([zoneOn(true, { on: true, until })])), T0), { kind: "on" });
});

/* 2026-10-18 review: an override the bridge has not managed to send is a staff
   wish, not the state of the room. The report's own belief wins when they differ. */
test("lightChip: an override the report's belief contradicts gives way to the belief, still with no countdown", () => {
  const until = iso(T0 + 120 * MIN);
  const ending = [win("badminton", -30, 5)];
  // Forced off, but the bridge last sent ON: LIGHTS ON (not a countdown either).
  assert.deepEqual(L.lightChip("Badminton", lights(ending, report([zoneOn(true, { on: false, until })])), T0), { kind: "on" });
  // Forced on with nothing booked, but the bridge last sent OFF: LIGHTS OFF.
  assert.deepEqual(L.lightChip("Badminton", lights([], report([zoneOn(false, { on: true, until })])), T0), { kind: "off" });
  // Forced on, last sent OFF, a window opening soon: still the belief, not ON IN n MIN.
  assert.deepEqual(L.lightChip("Badminton", lights([win("badminton", 5, 60)], report([zoneOn(false, { on: true, until })])), T0), { kind: "off" });
});

test("lightChip: an override is ignored when it has run out, or when the report is stale", () => {
  const sched = [win("badminton", -30, 60)];
  const past = { on: false, until: iso(T0 - 10 * MIN) };
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([zoneOn(true, past)])), T0), { kind: "on" });
  const live = { on: false, until: iso(T0 + 60 * MIN) };
  assert.deepEqual(L.lightChip("Badminton", lights(sched, report([zoneOn(false, live)], 5)), T0), { kind: "on" });
});

test("lightChip: for 2 minutes after an override runs out, the calendar beats the report", () => {
  // Forced on until a minute ago, nothing booked; the newest report still believes on.
  const justEnded = { on: true, until: iso(T0 - 1 * MIN) };
  assert.deepEqual(L.lightChip("Badminton", lights([], report([zoneOn(true, justEnded)])), T0), { kind: "off" });
});

test("lightChip: malformed `lights` never throws", () => {
  const bad = [
    { sports: "badminton" },
    { sports: ["badminton"], windows: "x", bridge: { reported_at: "nope", zones: "x" } },
    { sports: ["badminton", 7], windows: [null, { zone: "badminton", on_at: "x", off_at: "y" }], bridge: { reported_at: iso(T0), zones: [null, { zone: 3 }] } },
    { sports: ["badminton"], windows: [win("badminton", 10, -10)], bridge: { reported_at: iso(T0), zones: [zoneOn(true, { on: "yes", until: iso(T0 + MIN) })] } },
  ];
  assert.equal(L.lightChip("Badminton", bad[0], T0), null);
  assert.deepEqual(L.lightChip("Badminton", bad[1], T0), { kind: "off" });
  assert.deepEqual(L.lightChip("Badminton", bad[2], T0), { kind: "off" });
  // A non-boolean override is no override; the belief stands.
  assert.deepEqual(L.lightChip("Badminton", bad[3], T0), { kind: "on" });
});

/* The public page draws no chip because its feed never carries `lights` (2026-10-18):
   the windows and the bridge's report are TV-only, behind the board token. If the
   relay ever forwards the upstream wholesale, that stops being true silently. */
test("/api/court-slots never forwards `lights`", async (t) => {
  const upstream = {
    timeZone: "America/New_York",
    days: ["2026-10-18"],
    courts: [{ id: "c1", sport: "Badminton", sportId: "s", name: "BADMINTON 1", label: "1" }],
    blocks: [],
    lights: lights([win("badminton", -10, 60)], report([zoneOn(true)])),
  };
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => upstream }));
  const R = await import("../api/court-slots/route.ts");
  const body = await (await R.GET(new Request("https://extonsports.com/api/court-slots"))).json();
  assert.equal(body.courts.length, 1);
  assert.ok(!("lights" in body), "lights is never forwarded");
});
