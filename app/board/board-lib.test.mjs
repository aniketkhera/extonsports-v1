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
