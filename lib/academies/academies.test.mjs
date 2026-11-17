/* What keeps extonsports.com/academies private, honest and single-shot, 2026-11-16.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   The academy partners' page (orangish-app docs/academy-page.md §4): PBA and CCCA sign in by
   email, see their own court/lane time, extend a running session and book more — every add
   ON ACCOUNT. node:test on the pure modules (session, view, pick, copy), platform.ts with
   global fetch stubbed so no call leaves this machine, the source rules the /my-bookings suite
   holds that path to, and two components rendered with react-dom/server.

   Everything here passes `tsc` when broken: share a cookie with /my-bookings and one sign-in
   signs the other out; let toOverview pass a field through and an event description or a
   stranger's name reaches a partner's phone; read a 503 as "nothing happened" and the next
   press adds the time twice; mint a new request id on a retry and the platform cannot tell it
   is a retry; send a price from the browser and the platform's own amount is no longer the
   only one; forget the relay secret's fail-closed check and the site calls the platform
   unauthenticated. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const S = await import("./session.ts");
const V = await import("./view.ts");
const K = await import("./pick.ts");
const C = await import("./copy.ts");
const MB = await import("../my-bookings/session.ts");
// platform.ts reads its base URL once, at load; the relay secret on every call.
process.env.ORANGISH_API_BASE = "https://platform.test";
delete process.env.EXTON_RELAY_SECRET;
const P = await import("./platform.ts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TZ = "America/New_York";
const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21); // 43, base64url
const C1 = "11111111-1111-4111-8111-111111111111";
const C2 = "22222222-2222-4222-8222-222222222222";
const C3 = "33333333-3333-4333-8333-333333333333";
const C4 = "44444444-4444-4444-8444-444444444444";
const RID = "0f8fad5b-d9cb-469f-a165-70867728950e";

/* ── fixtures: PBA on Mon 16 Nov 2026 at 9:05 PM EST (the mockup's screen 2) ─────────────
   Court labels are the PLATFORM's real shape — the bare number, "1" for BADMINTON 1
   (orangish-app lib/academy-rules.ts courtLabelOf; its route test pins label '1'). The first
   fixtures fed "Court 1", the spec example's shape, and so no test saw the page print "1 2 3"
   over its grid (2026-11-16 review). */

const PBA_EMAIL = "partner@example.com"; // any address: the page shows what the platform sends (D2). No real partner address in this public repo.
function pbaOverview(over = {}) {
  return {
    partner: { key: "pba", name: "Philadelphia Badminton", sport: "Badminton", unit: "court", email: PBA_EMAIL, billing: "weekly invoice" },
    club: { name: "Exton Sports Center", timezone: TZ, phone: "(484) 252-2523" },
    now: "2026-11-17T02:05:00Z",
    today: "2026-11-16",
    windowDays: 14,
    rates: [{ use: "coaching", centsPerHour: 3000 }, { use: "open_play", centsPerHour: 2500 }],
    extend: [
      {
        parentEnd: "2026-11-17T02:30:00Z", // 9:30 PM
        courtsLabel: "Courts 1–3",
        use: "coaching",
        courts: [
          { courtId: C1, label: "1", freeUntil: "2026-11-17T04:00:00Z", options: [{ minutes: 30, ok: true }, { minutes: 60, ok: true }] },
          { courtId: C2, label: "2", freeUntil: null, options: [{ minutes: 30, ok: false, reason: "booked_from", at: "2026-11-17T02:30:00Z" }, { minutes: 60, ok: false, reason: "booked_from", at: "2026-11-17T02:30:00Z" }] },
          { courtId: C3, label: "3", freeUntil: "2026-11-17T03:00:00Z", options: [{ minutes: 30, ok: true }, { minutes: 60, ok: false, reason: "booked_from", at: "2026-11-17T03:00:00Z" }] },
        ],
      },
    ],
    upcoming: [
      { date: "2026-11-18", items: [
        { start: "2026-11-19T02:30:00Z", end: "2026-11-19T03:30:00Z", courtLabels: ["1"], use: "coaching", label: "Coaching", notBilled: false, addedOn: "2026-11-16" },
        { start: "2026-11-18T22:30:00Z", end: "2026-11-19T02:30:00Z", courtLabels: ["1", "2", "3"], use: "coaching", label: "Coaching", notBilled: false, addedOn: null },
      ] },
      { date: "2026-11-16", items: [
        { start: "2026-11-16T22:30:00Z", end: "2026-11-17T02:30:00Z", courtLabels: ["1", "2", "3"], use: "coaching", label: "Coaching", notBilled: false, addedOn: null },
      ] },
      { date: "2026-11-24", items: [
        { start: "2026-11-24T23:00:00Z", end: "2026-11-25T02:00:00Z", courtLabels: ["1", "2", "3"], use: "open_play", label: "Open play", notBilled: false, addedOn: null },
      ] },
    ],
    ...over,
  };
}

/** A day of 3 courts, 4:00–10:00 PM club-local on Sat 21 Nov 2026 (EST, UTC−5): 12 rows. */
function dayJson(states = {}, over = {}) {
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(Date.UTC(2026, 10, 21, 21, 0) + i * 30 * 60_000).toISOString();
    slots.push({ start, cells: [C1, C2, C3].map((courtId, c) => ({ courtId, state: states[`${i},${c}`] ?? "free" })) });
  }
  return { date: "2026-11-21", courts: [{ id: C1, label: "1" }, { id: C2, label: "2" }, { id: C3, label: "3" }], slots, ...over };
}
const day = (states, over) => V.toDay(dayJson(states, over), "2026-11-21");

/** CCCA after its season: what the platform's overview sends once today > 2027-03-31 —
 *  lib/academy-rules.ts overviewRates gives `centsPerHour: null`, and every extend option is
 *  refused 'season_end'. */
function cccaAfterSeason(over = {}) {
  const base = pbaOverview();
  return {
    ...base,
    partner: { key: "ccca", name: "Chester County Cricket Academy", sport: "Cricket", unit: "lane", email: "lanes@example.com", billing: "fortnightly statement" },
    now: "2027-04-03T16:00:00Z",
    today: "2027-04-03",
    lastDate: "2027-04-17",
    rates: [{ use: null, centsPerHour: null }],
    extend: [],
    upcoming: [
      { date: "2027-04-03", items: [
        { start: "2027-04-03T16:00:00Z", end: "2027-04-03T18:00:00Z", courtLabels: ["1", "2", "3"], use: null, label: null, notBilled: false, addedOn: null },
      ] },
    ],
    ...over,
  };
}

/* ══ session ══════════════════════════════════════════════════════════════════ */

test("own cookie names — never the guest's __Host-exton_mb ones", () => {
  assert.equal(S.ACADEMY_COOKIE, "__Host-exton_ac");
  assert.equal(S.ACADEMY_LINK_COOKIE, "__Host-exton_ac_link");
  for (const n of [S.ACADEMY_COOKIE, S.ACADEMY_LINK_COOKIE]) {
    assert.ok(n.startsWith("__Host-"));
    assert.notEqual(n, MB.DEVICE_COOKIE);
    assert.notEqual(n, MB.LINK_COOKIE);
    assert.ok(!n.startsWith("__Host-exton_mb"));
  }
});

test("academyCookie: httpOnly, Secure, Lax, Path=/, NO domain; life = the platform's, capped at 30 days", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  const c = S.academyCookie(TOKEN, "2026-12-16T12:00:00Z", now);
  assert.equal(c.name, "__Host-exton_ac");
  assert.equal(c.value, TOKEN);
  assert.deepEqual(c.options, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  assert.equal("domain" in c.options, false);
  // A platform that said 90 days (the guest scope's) still gets 30 here (D1).
  assert.equal(S.academyCookie(TOKEN, "2027-02-14T12:00:00Z", now).options.maxAge, S.ACADEMY_MAX_AGE_S);
  assert.equal(S.ACADEMY_MAX_AGE_S, 30 * 86400);
  assert.equal(S.academyCookie(TOKEN, "2026-11-16T13:00:00Z", now).options.maxAge, 3600);
  assert.equal(S.academyCookie(TOKEN, "2026-11-01T00:00:00Z", now).options.maxAge, 0);
});

test("academyCookie / academyLinkCookie THROW on a bad token or date, rather than defaulting", () => {
  assert.throws(() => S.academyCookie("short", "2026-12-16T12:00:00Z"));
  assert.throws(() => S.academyCookie(TOKEN, "not a date"));
  assert.throws(() => S.academyCookie(TOKEN, undefined));
  assert.throws(() => S.academyLinkCookie("x".repeat(44)));
  const l = S.academyLinkCookie(TOKEN);
  assert.equal(l.name, "__Host-exton_ac_link");
  assert.equal(l.options.maxAge, 1800);
  const gone = S.clearedCookie(S.ACADEMY_COOKIE);
  assert.deepEqual(gone, { name: "__Host-exton_ac", value: "", options: { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 } });
});

/* ══ the overview allow-list ══════════════════════════════════════════════════ */

test("toOverview: a well-formed PBA answer comes through, upcoming sorted by date and time", () => {
  const v = V.toOverview(pbaOverview());
  assert.ok(v);
  assert.deepEqual(v.partner, { key: "pba", name: "Philadelphia Badminton", sport: "Badminton", unit: "court", email: PBA_EMAIL, billing: "weekly invoice" });
  assert.deepEqual(v.club, { name: "Exton Sports Center", timezone: TZ, phone: "(484) 252-2523" });
  assert.equal(v.extend.length, 1);
  assert.equal(v.extend[0].courts.length, 3);
  assert.deepEqual(v.upcoming.map((d) => d.date), ["2026-11-16", "2026-11-18", "2026-11-24"]);
  assert.deepEqual(v.upcoming[1].items.map((i) => i.start), ["2026-11-18T22:30:00Z", "2026-11-19T02:30:00Z"]);
  assert.equal(v.regularUntil, null);
});

test("toOverview: planted fields never reach a page — not at the top, not in a row, not in a court", () => {
  const raw = pbaOverview({ token: TOKEN, profileId: C4, holder: "someone@example.com" });
  raw.partner.profileId = C4;
  raw.partner.role = "club_admin";
  raw.club.secret = "x";
  raw.extend[0].courts[0].holder = "Someone Else";
  raw.extend[0].courts[0].options[0].price = 1;
  raw.upcoming[0].items[0].description = "ADDITIONAL HOUR — NOT a Committed Hour. Booked by PBA";
  raw.upcoming[0].items[0].holder = "other@example.com";
  const v = V.toOverview(raw);
  const s = JSON.stringify(v);
  for (const planted of [TOKEN, C4, "club_admin", "Someone Else", "ADDITIONAL HOUR", "other@example.com", "someone@example.com", '"price"', '"secret"']) {
    assert.ok(!s.includes(planted), planted);
  }
  // The ONE address on the page is the partner's own.
  assert.deepEqual(s.match(/[^\s"@]+@[^\s"@]+/g), [PBA_EMAIL]);
});

test("toOverview: an Upcoming label outside the closed set is dropped (never an event description), the row kept", () => {
  const raw = pbaOverview();
  raw.upcoming[1].items[0].label = "Philadelphia Badminton — Syam's private session notes";
  const v = V.toOverview(raw);
  const today = v.upcoming.find((d) => d.date === "2026-11-16");
  assert.equal(today.items.length, 1);
  assert.equal(today.items[0].label, null);
  assert.deepEqual([...V.UPCOMING_LABELS], ["Coaching", "Open play", "Only Girls – Free Coaching"]);
});

test("toOverview: a bad top level is null (=> 'can't show your page'), NEVER an empty page", () => {
  const bad = [
    null, [], "x", {},
    pbaOverview({ partner: undefined }),
    pbaOverview({ partner: { ...pbaOverview().partner, key: "other" } }),
    pbaOverview({ partner: { ...pbaOverview().partner, unit: "field" } }),
    pbaOverview({ partner: { ...pbaOverview().partner, email: "not an address" } }),
    pbaOverview({ club: { name: "Exton", timezone: "Mars/Olympus_Mons" } }),
    pbaOverview({ club: { name: "Exton", timezone: "EST; drop table" } }),
    pbaOverview({ now: "yesterday" }),
    pbaOverview({ today: "2026-02-30" }),
    pbaOverview({ windowDays: 0 }),
    pbaOverview({ rates: [] }),
    pbaOverview({ rates: [{ use: "squash", centsPerHour: 3000 }] }),
    pbaOverview({ rates: [{ use: "coaching", centsPerHour: -1 }] }),
    pbaOverview({ extend: undefined }),
    pbaOverview({ upcoming: undefined }),
    pbaOverview({ upcoming: {} }),
  ];
  for (const b of bad) assert.equal(V.toOverview(b), null, JSON.stringify(b)?.slice(0, 120));
});

test("toOverview: CCCA after its season (centsPerHour null) is a PAGE, not an outage — Upcoming stays, no figure anywhere", () => {
  // 2026-11-16 review: the null was refused and the whole page said "We can't show your
  // academy page right now" from 1 Apr 2027, hiding CCCA's own upcoming lanes.
  const v = V.toOverview(cccaAfterSeason());
  assert.ok(v, "the post-season overview is accepted");
  assert.deepEqual(v.rates, [{ use: null, centsPerHour: null }]);
  assert.deepEqual(v.upcoming.map((d) => d.date), ["2027-04-03"]);
  assert.equal(K.rateFor(v.rates, null), null, "no rate to build a summary, a confirm line or a button from");
  assert.deepEqual(K.usesOf(v.rates), []);
  assert.equal(C.billingLine("lane", v.rates, "fortnightly statement"), "Lane time goes on your fortnightly statement. Nothing is charged to a card.");
  assert.equal(C.choiceForUse("coaching", null), "Coaching");
  // Still refused: a missing figure, a string, a zero — those are broken answers, not "unpriced".
  for (const bad of [{ use: null }, { use: null, centsPerHour: "4000" }, { use: null, centsPerHour: 0 }]) {
    assert.equal(V.toOverview(cccaAfterSeason({ rates: [bad] })), null, JSON.stringify(bad));
  }
});

test("toOverview: an extend group with one bad court is dropped WHOLE; the others stay", () => {
  const raw = pbaOverview();
  const second = structuredClone(raw.extend[0]);
  second.parentEnd = "2026-11-17T03:00:00Z";
  second.courts[1].courtId = "not-a-uuid";
  raw.extend.push(second);
  assert.equal(V.toOverview(raw).extend.length, 1);
  const dupe = pbaOverview();
  dupe.extend[0].courts[0].options = [{ minutes: 30, ok: true }, { minutes: 30, ok: true }];
  assert.equal(V.toOverview(dupe).extend.length, 0);
  const odd = pbaOverview();
  odd.extend[0].courts[0].options = [{ minutes: 45, ok: true }];
  assert.equal(V.toOverview(odd).extend.length, 0);
});

test("toOverview: a refused option keeps only a known reason; an ok option never carries one", () => {
  const raw = pbaOverview();
  raw.extend[0].courts[1].options[0].reason = "because_reasons";
  raw.extend[0].courts[0].options[0].reason = "booked_from";
  const g = V.toOverview(raw).extend[0];
  assert.deepEqual(g.courts[1].options[0], { minutes: 30, ok: false, reason: null, at: "2026-11-17T02:30:00Z" });
  assert.deepEqual(g.courts[0].options[0], { minutes: 30, ok: true, reason: null, at: null });
});

test("toOverview: malformed Upcoming rows are dropped, an emptied day goes, regularUntil only when real", () => {
  const raw = pbaOverview({ regularUntil: "2027-03-31" });
  raw.upcoming[2].items[0].end = raw.upcoming[2].items[0].start; // zero length
  raw.upcoming[0].items[1].notBilled = "no";
  const v = V.toOverview(raw);
  assert.deepEqual(v.upcoming.map((d) => d.date), ["2026-11-16", "2026-11-18"]);
  assert.equal(v.upcoming[1].items.length, 1);
  assert.equal(v.regularUntil, "2027-03-31");
  assert.equal(V.toOverview(pbaOverview({ regularUntil: "31 March" })).regularUntil, null);
});

/* ══ the day grid ═════════════════════════════════════════════════════════════ */

test("toDay: five states only — an unknown or missing cell is 'closed', a taken cell says nothing about who", () => {
  const raw = dayJson({ "0,0": "yours", "0,1": "taken", "0,2": "past" });
  raw.slots[0].cells[1].holder = "Someone Else";
  raw.slots[0].cells[1].bookingId = C4;
  raw.slots[1].cells[0].state = "reserved_for_vip";
  raw.slots[2].cells = raw.slots[2].cells.slice(0, 2);
  raw.slots[3].cells.push({ courtId: C4, state: "free" });
  const d = V.toDay(raw, "2026-11-21");
  assert.deepEqual(d.slots[0].cells, ["yours", "taken", "past"]);
  assert.deepEqual(d.slots[1].cells, ["closed", "free", "free"]);
  assert.deepEqual(d.slots[2].cells, ["free", "free", "closed"]);
  assert.deepEqual(d.slots[3].cells, ["free", "free", "free"]);
  assert.ok(!JSON.stringify(d).includes("Someone Else") && !JSON.stringify(d).includes(C4));
});

test("toDay: the day's own rates when sent (PBA's §4.6 rise inside the window), null when not, the whole day refused when broken", () => {
  // 2026-11-16 review: on 2027-12-21 the overview's (today's) $30.00 priced a Mon 3 Jan 2028
  // pick the platform bills at $30.90. A day that carries its rates is priced from them.
  assert.equal(day().rates, null, "a platform that sends no day rates: the page falls back to the overview's");
  const jan = V.toDay(dayJson({}, { rates: [{ use: "coaching", centsPerHour: 3090 }, { use: "open_play", centsPerHour: 2575 }] }), "2026-11-21");
  assert.deepEqual(jan.rates, [{ use: "coaching", centsPerHour: 3090 }, { use: "open_play", centsPerHour: 2575 }]);
  const overview = V.toOverview(pbaOverview()).rates;
  assert.equal(K.ratesForDay(overview, jan), jan.rates);
  assert.equal(K.ratesForDay(overview, day()), overview);
  assert.equal(K.ratesForDay(overview, null), overview);
  const rate = K.rateFor(K.ratesForDay(overview, jan), "coaching");
  assert.equal(C.confirmLine(K.amountCents(rate.centsPerHour, 60, 1)), "This adds $30.90 to your account. It can't be cancelled here.");
  assert.equal(C.confirmLine(K.amountCents(rate.centsPerHour, 120, 2)), "This adds $123.60 to your account. It can't be cancelled here.");
  // A CCCA day past the season: no figure, so no price for that day.
  const late = V.toDay(dayJson({}, { rates: [{ use: null, centsPerHour: null }] }), "2026-11-21");
  assert.equal(K.rateFor(K.ratesForDay([{ use: null, centsPerHour: 4000 }], late), null), null);
  // Present but broken is not "absent": the overview's figure could be the wrong one for this day.
  for (const bad of [[], [{ use: "coaching", centsPerHour: -5 }], "3090", [{ use: "squash", centsPerHour: 3000 }]]) {
    assert.equal(V.toDay(dayJson({}, { rates: bad }), "2026-11-21"), null, JSON.stringify(bad));
  }
  // The site's route carries them through, round-tripped.
  assert.deepEqual(V.fromSiteDay(200, wire({ status: "ok", day: jan }), "2026-11-21"), { status: "ok", day: jan });
  const broken = wire({ status: "ok", day: jan });
  broken.day.rates = [{ use: "coaching" }];
  assert.deepEqual(V.fromSiteDay(200, broken, "2026-11-21"), { status: "unavailable" });
});

test("toDay: an answer for another day, a repeated court or slot, or too many rows is null", () => {
  assert.equal(V.toDay(dayJson(), "2026-11-22"), null);
  assert.equal(V.toDay(dayJson({}, { courts: [{ id: C1, label: "Court 1" }, { id: C1, label: "Court 1" }] }), "2026-11-21"), null);
  const dup = dayJson();
  dup.slots[1].start = dup.slots[0].start;
  assert.equal(V.toDay(dup, "2026-11-21"), null);
  const long = dayJson();
  long.slots = Array.from({ length: 51 }, (_, i) => ({ ...long.slots[0], start: new Date(Date.UTC(2026, 10, 21, 5) + i * 1800_000).toISOString() }));
  assert.equal(V.toDay(long, "2026-11-21"), null);
  assert.equal(V.toDay(null, "2026-11-21"), null);
});

/* ══ the write's answers ══════════════════════════════════════════════════════ */

const DONE = {
  results: [
    { courtId: C1, ok: true, start: "2026-11-17T02:30:00Z", end: "2026-11-17T03:30:00Z", amountCents: 3000 },
    { courtId: C2, ok: false, reason: "taken" },
  ],
  totalCents: 3000,
  emailed: true,
};

test("toAddView: a clean 200 is done; a 200 that fails the allow-list is UNKNOWN, never 'nothing happened'", () => {
  assert.deepEqual(V.toAddView(200, DONE), { status: "done", ...DONE });
  for (const bad of [null, {}, { ...DONE, emailed: "yes" }, { ...DONE, totalCents: -1 }, { ...DONE, results: [] },
    { ...DONE, results: [{ courtId: "x", ok: true }] }, { ...DONE, results: [{ courtId: C1, ok: true, start: "2026-11-17T02:30:00Z" }] }]) {
    assert.deepEqual(V.toAddView(200, bad), { status: "unknown" }, JSON.stringify(bad));
  }
  // A per-court reason that is not a plain key is 'other', not passed through.
  const odd = V.toAddView(200, { ...DONE, results: [{ courtId: C1, ok: false, reason: "<b>no</b>" }] });
  assert.equal(odd.results[0].reason, "other");
});

test("toAddView: 422 names its reason; the rest of the statuses, one by one; a 503 or a timeout is in doubt", () => {
  for (const r of V.REFUSE_REASONS) assert.deepEqual(V.toAddView(422, { error: "refused", reason: r }), { status: "refused", reason: r });
  assert.deepEqual(V.toAddView(422, { error: "refused", reason: "new_rule" }), { status: "refused", reason: null });
  assert.deepEqual(V.toAddView(400, { error: "bad_request" }), { status: "bad_request" });
  assert.deepEqual(V.toAddView(401, {}), { status: "signed_out" });
  assert.deepEqual(V.toAddView(404, {}), { status: "off" });
  assert.deepEqual(V.toAddView(429, {}), { status: "slow_down" });
  for (const s of [0, 500, 502, 503, 504, 409]) assert.deepEqual(V.toAddView(s, null), { status: "unknown" }, String(s));
  assert.deepEqual([...V.REFUSE_REASONS].sort(),
    ["bad_use", "closed", "daily_cap", "midnight", "not_extendable", "not_yours", "past", "season_end", "window"]);
});

test("fromSiteAdd: this site's 200 carries the status (re-checked); its own 400/403 nothing sent; 429 a limit; the rest in doubt", () => {
  assert.deepEqual(V.fromSiteAdd(200, { status: "done", ...DONE }), { status: "done", ...DONE });
  assert.deepEqual(V.fromSiteAdd(200, { status: "done", results: "all of them" }), { status: "unknown" });
  assert.deepEqual(V.fromSiteAdd(200, { status: "refused", reason: "daily_cap" }), { status: "refused", reason: "daily_cap" });
  assert.deepEqual(V.fromSiteAdd(200, { status: "signed_out" }), { status: "signed_out" });
  assert.deepEqual(V.fromSiteAdd(200, { status: "added_twice" }), { status: "unknown" });
  assert.deepEqual(V.fromSiteAdd(400, null), { status: "bad_request" });
  assert.deepEqual(V.fromSiteAdd(403, null), { status: "bad_request" });
  assert.deepEqual(V.fromSiteAdd(429, null), { status: "slow_down" });
  assert.deepEqual(V.fromSiteAdd(0, null), { status: "unknown" });
  assert.deepEqual(V.fromSiteAdd(504, null), { status: "unknown" });
});

test("keepRequestId: ONLY a doubt keeps the id for the retry; every definite answer drops it", () => {
  assert.equal(V.keepRequestId({ status: "unknown" }), true);
  assert.equal(V.keepRequestId({ status: "slow_down" }), true);
  for (const s of ["done", "refused", "bad_request", "signed_out", "off"]) assert.equal(V.keepRequestId({ status: s }), false, s);
});

test("academyRedeemRefusal: ONLY 'invalid' spends the parked link", () => {
  assert.deepEqual(V.academyRedeemRefusal("invalid"), { status: 400, body: { error: "invalid" }, clearLink: true });
  assert.deepEqual(V.academyRedeemRefusal("slow_down"), { status: 429, body: { error: "slow_down" }, clearLink: false });
  assert.deepEqual(V.academyRedeemRefusal("off"), { status: 404, body: { error: "off" }, clearLink: false });
  assert.deepEqual(V.academyRedeemRefusal("try_again"), { status: 503, body: { error: "try_again" }, clearLink: false });
});

/** What /api/academies/day actually puts on the wire: academyDay's DayResult, through JSON. */
const wire = (v) => JSON.parse(JSON.stringify(v));

test("fromSiteDay reads the ROUTE's shape — the grid the platform sent, round-tripped, comes back cell for cell", () => {
  // 2026-11-16: the first version re-parsed this with the platform-shape parser, found no
  // {courtId, state} cells, and closed the whole grid. Only a render caught it.
  const asked = "2026-11-21";
  const fromPlatform = V.toDay(dayJson({ "0,0": "yours", "1,1": "taken", "2,2": "past" }), asked);
  const ok = V.fromSiteDay(200, wire({ status: "ok", day: fromPlatform }), asked);
  assert.deepEqual(ok, { status: "ok", day: fromPlatform });
  assert.deepEqual(ok.day.slots[0].cells, ["yours", "free", "free"]);
  assert.equal(K.windowStart(ok.day), 0);
  // The platform's own shape is NOT the route's: fed straight in, it is refused, not "all closed".
  assert.deepEqual(V.fromSiteDay(200, { status: "ok", day: dayJson() }, asked), { status: "unavailable" });
  const odd = wire({ status: "ok", day: fromPlatform });
  odd.day.slots[3].cells[1] = "mine_now";
  assert.equal(V.fromSiteDay(200, odd, asked).day.slots[3].cells[1], "closed");
  const short = wire({ status: "ok", day: fromPlatform });
  short.day.slots[3].cells.pop();
  assert.deepEqual(V.fromSiteDay(200, short, asked), { status: "unavailable" });
});

test("fromSiteAdd reads the ROUTE's shape too: academyAdd's 'done', round-tripped", () => {
  const done = V.toAddView(200, DONE);
  assert.deepEqual(V.fromSiteAdd(200, wire(done)), done);
  const refused = V.toAddView(422, { error: "refused", reason: "window" });
  assert.deepEqual(V.fromSiteAdd(200, wire(refused)), refused);
});

test("fromSiteDay: only a checked grid for the asked day is a grid", () => {
  const ok = V.fromSiteDay(200, wire({ status: "ok", day: V.toDay(dayJson(), "2026-11-21") }), "2026-11-21");
  assert.equal(ok.status, "ok");
  assert.equal(ok.day.slots.length, 12);
  assert.deepEqual(V.fromSiteDay(200, wire({ status: "ok", day: V.toDay(dayJson(), "2026-11-21") }), "2026-11-22"), { status: "unavailable" });
  assert.deepEqual(V.fromSiteDay(200, { status: "signed_out" }, "2026-11-21"), { status: "signed_out" });
  assert.deepEqual(V.fromSiteDay(200, { status: "off" }, "2026-11-21"), { status: "off" });
  assert.deepEqual(V.fromSiteDay(429, null, "2026-11-21"), { status: "unavailable" });
  assert.deepEqual(V.fromSiteDay(0, null, "2026-11-21"), { status: "unavailable" });
});

/* ══ club-local time ══════════════════════════════════════════════════════════ */

test("club-local clock and ranges, as the mockup writes them", () => {
  assert.equal(V.clockText("2026-11-17T02:30:00Z", TZ), "9:30 PM");
  assert.deepEqual(V.localParts("2026-11-17T02:30:00Z", TZ), { ymd: "2026-11-16", minutes: 21 * 60 + 30 });
  assert.equal(V.localHm("2026-11-17T02:30:00Z", TZ), "21:30");
  assert.equal(V.rangeText("2026-11-16T22:30:00Z", "2026-11-17T02:30:00Z", TZ), "5:30–9:30 PM");
  assert.equal(V.rangeText("2026-11-21T15:00:00Z", "2026-11-21T17:00:00Z", TZ), "10:00 AM–12:00 PM");
  assert.equal(V.rangeText("2026-11-17T04:00:00Z", "2026-11-17T05:00:00Z", TZ), "11:00 PM–12:00 AM");
  assert.equal(V.localHm("2026-11-17T05:00:00Z", TZ), "00:00");
  assert.equal(V.clockText("not a time", TZ), "");
});

test("DST: 6:00 PM club-local either side of 2026-11-01 and 2027-03-14, and the doubled 1:30 AM", () => {
  assert.equal(V.localHm("2026-10-31T22:00:00Z", TZ), "18:00"); // EDT, UTC−4
  assert.equal(V.localHm("2026-11-01T23:00:00Z", TZ), "18:00"); // EST, UTC−5
  assert.equal(V.localHm("2026-11-01T05:30:00Z", TZ), "01:30"); // the first 1:30 AM
  assert.equal(V.localHm("2026-11-01T06:30:00Z", TZ), "01:30"); // the second
  assert.equal(V.localHm("2027-03-13T23:00:00Z", TZ), "18:00");
  assert.equal(V.localHm("2027-03-14T22:00:00Z", TZ), "18:00");
  assert.equal(V.localParts("2027-03-14T07:30:00Z", TZ).minutes, 3 * 60 + 30); // 2:30 AM never happens
});

test("dates: 'Mon 16 Nov', 'Today · …', 'Added 16 Nov', and fifteen day chips — today to today + 14 — that cross a month", () => {
  assert.equal(V.dayShort("2026-11-16"), "Mon 16 Nov");
  assert.equal(C.dayHeading("2026-11-16", "2026-11-16"), "Today · Mon 16 Nov");
  assert.equal(C.dayHeading("2026-11-17", "2026-11-16"), "Tue 17 Nov");
  assert.equal(C.addedTag("2026-11-16"), "Added 16 Nov");
  assert.deepEqual(V.dayChip("2026-11-21"), { weekday: "Sat", day: "21" });
  // D5 and the platform's bookWindow: today … today + 14, BOTH ends (2026-11-16 review: the
  // first version stopped at today + 13 and never offered the last bookable day).
  const d = V.bookDates("2026-11-20", 30);
  assert.equal(d.length, 15, "D5: two weeks ahead, never the public's 30 days");
  assert.equal(d[0], "2026-11-20");
  assert.equal(d[14], "2026-12-04");
  // What the platform actually sends: windowDays 14 and lastDate = today + 14.
  const live = V.bookDates("2026-11-16", 14, "2026-11-30");
  assert.equal(live.length, 15);
  assert.equal(live.at(-1), "2026-11-30");
  // Either bound narrows; neither widens past 14 days ahead.
  assert.equal(V.bookDates("2026-11-20", 7).length, 8);
  assert.equal(V.bookDates("2026-11-16", 14, "2026-11-25").at(-1), "2026-11-25");
  assert.equal(V.bookDates("2026-11-16", 14, "2027-01-01").length, 15);
  assert.equal(V.bookDates("2026-11-16", 14, "2026-11-01").length, 15, "a last date before today is ignored");
  assert.deepEqual(V.bookDates("2026-11-20", 0), ["2026-11-20"]);
  assert.equal(V.addDays("2026-12-31", 1), "2027-01-01");
});

test("toOverview: lastDate comes through when it is a real date on or after today, else null", () => {
  assert.equal(V.toOverview(pbaOverview({ lastDate: "2026-11-30" })).lastDate, "2026-11-30");
  assert.equal(V.toOverview(pbaOverview()).lastDate, null);
  assert.equal(V.toOverview(pbaOverview({ lastDate: "2026-11-15" })).lastDate, null);
  assert.equal(V.toOverview(pbaOverview({ lastDate: "30 Nov" })).lastDate, null);
});

test("courtsText: 'Court 2', 'Courts 1 and 2', 'Courts 1–3', 'Courts 1, 3 and 4' — two courts always read as two", () => {
  assert.equal(V.courtsText("court", ["Court 2"]), "Court 2");
  assert.equal(V.courtsText("court", ["Court 2", "Court 1"]), "Courts 1 and 2");
  assert.equal(V.courtsText("court", ["1", "2", "3"]), "Courts 1–3");
  assert.equal(V.courtsText("lane", ["1", "3", "4"]), "Lanes 1, 3 and 4");
  assert.equal(V.courtsText("lane", ["1", "2", "3", "5"]), "Lanes 1–3 and 5");
  assert.equal(V.courtsText("court", ["Court 1"], true), "court 1");
  assert.equal(V.courtsText("lane", ["Lane 1", "Lane 2"], true), "lanes 1 and 2");
  assert.equal(V.courtsText("court", ["Centre", "Court 2"]), "Centre, Court 2");
});

test("courtName: the platform's bare '2' prints as 'Court 2' / 'Lane 2' — and a 'Court 2' label stays 'Court 2'", () => {
  assert.equal(V.courtName("court", "2"), "Court 2");
  assert.equal(V.courtName("lane", "3"), "Lane 3");
  assert.equal(V.courtName("court", "Court 2"), "Court 2");
  assert.equal(V.courtName("court", "Centre"), "Centre");
  // §4's own sentence, from the platform's real label.
  assert.equal(C.resultLine(DONE.results[1], V.courtName("court", "2"), TZ), "Court 2 was just booked — nothing added for it");
});

test("source rule: no court label reaches a page bare — the grid, the extend rows and the result lines name it", () => {
  // 2026-11-16 review: headers "1 2 3", rows "1", "2 was just booked". Each label a card prints
  // or hands to the result lines goes through courtName (or labelOf, which is courtName).
  for (const f of ["app/academies/_components/BookMore.tsx", "app/academies/_components/ExtendCard.tsx"]) {
    const src = code(read(f));
    assert.doesNotMatch(src, /\{\s*[\w.[\]]+\.label\s*\}/, `${f}: a label printed as a JSX child`);
    assert.doesNotMatch(src, /\$\{\s*[\w.[\]]+\.label\s*\}/, `${f}: a label printed in a template`);
    assert.doesNotMatch(src, /\[[\w.[\]]+\.id, [\w.[\]]+\.label\]/, `${f}: a raw label in the result-line map`);
  }
  assert.match(code(read("app/academies/_components/ExtendCard.tsx")), /const labelOf = \(id: string\) => courtName\(/);
});

test("splitWeek: the first seven days show; the rest wait behind 'Show the next 7 days'", () => {
  const v = V.toOverview(pbaOverview());
  const { first, later } = V.splitWeek(v.upcoming, v.today);
  assert.deepEqual(first.map((d) => d.date), ["2026-11-16", "2026-11-18"]);
  assert.deepEqual(later.map((d) => d.date), ["2026-11-24"]);
});

/* ══ picking ══════════════════════════════════════════════════════════════════ */

test("tapCell: start a run, stretch it, add the same rows on another court", () => {
  const d = day();
  let p = K.tapCell(d, null, 1, 4); // Court 2, 6:00 PM
  assert.deepEqual(p, { courts: [1], from: 4, to: 5 });
  p = K.tapCell(d, p, 1, 5);
  assert.deepEqual(p, { courts: [1], from: 4, to: 6 });
  p = K.tapCell(d, p, 0, 5);
  assert.deepEqual(p, { courts: [0, 1], from: 4, to: 6 });
  p = K.tapCell(d, p, 0, 3); // stretch both courts upwards
  assert.deepEqual(p, { courts: [0, 1], from: 3, to: 6 });
});

test("tapCell: never more than 2 hours or 3 courts, never over a taken half-hour — those start afresh", () => {
  const d = day({ "6,2": "taken" });
  let p = { courts: [1], from: 2, to: 6 };
  assert.deepEqual(K.tapCell(d, p, 1, 6), { courts: [1], from: 6, to: 7 }, "a fifth half-hour starts a new pick");
  p = { courts: [1], from: 5, to: 7 };
  assert.deepEqual(K.tapCell(d, p, 2, 5), { courts: [2], from: 5, to: 6 }, "court 3 is taken at 7:00, so it cannot join 6:30–7:30");
  const four = V.toDay({ ...dayJson(), courts: [...dayJson().courts, { id: C4, label: "4" }],
    slots: dayJson().slots.map((s) => ({ ...s, cells: [...s.cells, { courtId: C4, state: "free" }] })) }, "2026-11-21");
  p = { courts: [0, 1, 2], from: 4, to: 5 };
  assert.deepEqual(K.tapCell(four, p, 3, 4), { courts: [3], from: 4, to: 5 }, "a fourth court starts afresh (D5: 1–3)");
});

test("tapCell: yours, taken and past half-hours change nothing", () => {
  const d = day({ "0,0": "yours", "0,1": "taken", "0,2": "past" });
  const p = { courts: [1], from: 4, to: 5 };
  for (const c of [0, 1, 2]) assert.equal(K.tapCell(d, p, c, 0), p);
  assert.equal(K.tapCell(d, null, 0, 0), null);
});

test("tapCell: untapping trims the end tapped, cuts after a middle cell, and drops a one-row court", () => {
  const d = day();
  assert.deepEqual(K.tapCell(d, { courts: [1], from: 2, to: 6 }, 1, 2), { courts: [1], from: 3, to: 6 });
  assert.deepEqual(K.tapCell(d, { courts: [1], from: 2, to: 6 }, 1, 5), { courts: [1], from: 2, to: 5 });
  assert.deepEqual(K.tapCell(d, { courts: [1], from: 2, to: 6 }, 1, 3), { courts: [1], from: 2, to: 4 });
  assert.deepEqual(K.tapCell(d, { courts: [0, 1], from: 2, to: 3 }, 0, 2), { courts: [1], from: 2, to: 3 });
  assert.equal(K.tapCell(d, { courts: [1], from: 2, to: 3 }, 1, 2), null);
});

test("a run never jumps a gap in opening hours", () => {
  const raw = dayJson();
  raw.slots.splice(5, 2); // 6:30 and 7:00 are not offered at all
  const d = V.toDay(raw, "2026-11-21");
  assert.equal(K.contiguous(d, 4, 6), false);
  assert.deepEqual(K.tapCell(d, { courts: [0], from: 4, to: 5 }, 0, 5), { courts: [0], from: 5, to: 6 });
});

test("stillFits: a pick a refresh has made untrue is dropped, never sent", () => {
  const p = { courts: [0, 1], from: 4, to: 6 };
  assert.deepEqual(K.stillFits(day(), p), p);
  assert.equal(K.stillFits(day({ "5,1": "taken" }), p), null);
  assert.equal(K.stillFits(day(), { courts: [5], from: 4, to: 5 }), null);
  assert.equal(K.stillFits(day(), null), null);
});

test("windowStart: a little before the partner's own next half-hour, else the first free one", () => {
  const long = (states) => {
    const raw = dayJson(states);
    raw.slots = Array.from({ length: 30 }, (_, i) => ({
      start: new Date(Date.UTC(2026, 10, 21, 12) + i * 1800_000).toISOString(),
      cells: [C1, C2, C3].map((courtId, c) => ({ courtId, state: states[`${i},${c}`] ?? "taken" })),
    }));
    return V.toDay(raw, "2026-11-21");
  };
  assert.equal(K.windowStart(long({ "14,0": "yours", "20,1": "free" })), 12);
  assert.equal(K.windowStart(long({ "9,2": "free" })), 9);
  assert.equal(K.windowStart(long({ "29,0": "yours" })), 30 - K.WINDOW_ROWS);
  assert.equal(K.windowStart(day()), 0); // all free: from the top
  assert.equal(K.windowStart(day({ "10,0": "yours" })), 4); // 12 rows, window 8: clamped to the last eight
});

test("tapExtend: one length per press — switching moves the other courts where free, and drops them where not", () => {
  const g = V.toOverview(pbaOverview()).extend[0];
  let p = K.tapExtend(g, null, C1, 60);
  assert.deepEqual(p, { minutes: 60, courtIds: [C1] });
  assert.equal(K.tapExtend(g, p, C2, 30), p, "court 2 is booked from 9:30: its chips do nothing");
  p = K.tapExtend(g, p, C3, 30); // court 3 has only +30
  assert.deepEqual(p, { minutes: 30, courtIds: [C1, C3] });
  const up = K.tapExtend(g, p, C1, 60);
  assert.deepEqual(up, { minutes: 60, courtIds: [C1] });
  assert.deepEqual(K.droppedCourts(p, up), [C3]);
  assert.equal(K.tapExtend(g, up, C1, 60), null, "tapping the picked chip again unpicks it");
});

test("money preview: the platform's rates × minutes × courts, rounded per court; PBA by use, CCCA its one rate", () => {
  const v = V.toOverview(pbaOverview());
  assert.deepEqual(K.usesOf(v.rates), ["coaching", "open_play"]);
  assert.equal(K.rateFor(v.rates, "open_play").centsPerHour, 2500);
  assert.equal(K.rateFor(v.rates, null), null);
  assert.equal(K.amountCents(3000, 60, 1), 3000);
  assert.equal(K.amountCents(2500, 30, 3), 3750);
  assert.equal(K.amountCents(4000, 90, 2), 12000);
  assert.equal(K.amountCents(3090, 30, 2), 3090);
  assert.deepEqual(K.usesOf([{ use: null, centsPerHour: 4000 }]), []);
});

test("bookBody: §3.3's keys, the club-local date and start, minutes from the run, use only for PBA, never a price", () => {
  const d = day();
  const p = { courts: [0, 1], from: 4, to: 6 };
  const b = K.bookBody(d, p, TZ, RID, "pba", "open_play");
  assert.deepEqual(b, { requestId: RID, kind: "book", date: "2026-11-21", start: "18:00", minutes: 60, courtIds: [C1, C2], use: "open_play" });
  assert.deepEqual(Object.keys(K.bookBody(d, p, TZ, RID, "ccca", "coaching")).sort(), ["courtIds", "date", "kind", "minutes", "requestId", "start"]);
  assert.equal(K.bookBody(day({ "5,0": "taken" }), p, TZ, RID, "pba", "coaching"), null);
});

test("extendBody: the session's end, club-local, is the date and the start; a refused length is never sent", () => {
  const g = V.toOverview(pbaOverview()).extend[0];
  assert.deepEqual(K.extendBody(g, { minutes: 30, courtIds: [C1, C3] }, TZ, RID, "pba", "coaching"),
    { requestId: RID, kind: "extend", date: "2026-11-16", start: "21:30", minutes: 30, courtIds: [C1, C3], use: "coaching" });
  assert.equal(K.extendBody(g, { minutes: 60, courtIds: [C1, C3] }, TZ, RID, "pba", "coaching"), null);
  assert.equal(K.extendBody(g, { minutes: 60, courtIds: [] }, TZ, RID, "pba", "coaching"), null);
});

test("REQUEST_ID_RE takes what crypto.randomUUID() makes", () => {
  for (let i = 0; i < 20; i++) assert.match(crypto.randomUUID(), K.REQUEST_ID_RE);
  assert.doesNotMatch("not-a-uuid", K.REQUEST_ID_RE);
});

/* ══ the words ════════════════════════════════════════════════════════════════ */

test("the sign-in answer is ONE sentence for every address, and says 30 days (D1)", () => {
  assert.equal(typeof C.ACADEMY_COPY.sent, "string");
  assert.ok(C.ACADEMY_COPY.sent.startsWith("If this address is on our academy list, a sign-in link is on its way."));
  assert.match(C.ACADEMY_COPY.sent, /30 days/);
  assert.doesNotMatch(C.ACADEMY_COPY.sent, /90/);
  // The panel shows ACADEMY_COPY.sent on any 200 and builds nothing from the typed address.
  const panel = code(read("app/academies/_components/RequestPanel.tsx"));
  assert.match(panel, /\{ACADEMY_COPY\.sent\}/);
  // The typed address only refills its own field and goes to the code form; it is never text.
  const rest = panel.replace("defaultValue={email}", "").replace("<CodeForm email={email} />", "");
  assert.doesNotMatch(rest, /\{email\}|\$\{email\}/);
});

test("the confirm line, the cancel line (and CCCA's 48 hours), PBA's discretion line — word for word", () => {
  assert.equal(C.confirmLine(3000), "This adds $30.00 to your account. It can't be cancelled here.");
  const join = (l) => l.before + l.email + l.after;
  assert.equal(join(C.cancelLine("pba")), "To cancel or change any of this, email Aniket at aniket@extonsports.com.");
  assert.equal(join(C.cancelLine("ccca")),
    "To cancel or change any of this, email Aniket at aniket@extonsports.com (48 hours' notice to release lane time — your agreement §3.4).");
  assert.equal(C.ACADEMY_COPY.discretion, "Extra court time is subject to availability. Exton may decline or withdraw it.");
  assert.equal(C.kicker("Exton Sports Center"), "Exton Sports Center · Academy page");
});

test("the billing line: PBA's weekly invoice, CCCA's fortnightly statement at $40, never a card", () => {
  const v = V.toOverview(pbaOverview());
  assert.equal(C.billingLine("court", v.rates, "weekly invoice"),
    "Prices are your agreement's additional-hour rates. Nothing is charged to a card; it all goes on your weekly invoice.");
  assert.equal(C.billingLine("lane", [{ use: null, centsPerHour: 4000 }], "fortnightly statement"),
    "Lane time is at your agreement's $40 a lane-hour and goes on your fortnightly statement. Nothing is charged to a card.");
});

test("summaries and buttons, as the mockup shows them", () => {
  const rate = { use: "coaching", centsPerHour: 3000 };
  assert.deepEqual(C.extendSummary("court", ["Court 1"], "2026-11-17T03:30:00Z", 60, 3000, "weekly invoice", rate, TZ), {
    head: "Court 1 to 10:30 PM", hours: "1 court-hour", money: "$30.00, added to your weekly invoice at your coaching rate",
  });
  assert.deepEqual(C.extendSummary("lane", ["Lane 1", "Lane 2"], "2026-11-17T02:00:00Z", 60, 8000, "fortnightly statement", { use: null, centsPerHour: 4000 }, TZ), {
    head: "Lanes 1 and 2 to 9:00 PM", hours: "2 lane-hours", money: "$80.00, added to your fortnightly statement at $40 a lane-hour",
  });
  assert.deepEqual(C.bookSummary("court", ["Court 2"], "2026-11-21", "6:00–7:00 PM", "coaching", 60, 3000, "weekly invoice"), {
    head: "Court 2 · Sat 21 Nov · 6:00–7:00 PM · Coaching", tail: "1 court-hour · $30.00, added to your weekly invoice",
  });
  assert.deepEqual(C.bookSummary("lane", ["Lane 3"], "2026-11-21", "12:00–1:00 PM", null, 60, 4000, "fortnightly statement"), {
    head: "Lane 3 · Sat 21 Nov · 12:00–1:00 PM", tail: "1 lane-hour · $40.00, added to your fortnightly statement",
  });
  assert.equal(C.extendButton("court", ["Court 1"]), "Extend court 1");
  assert.equal(C.extendButton("lane", ["Lane 1", "Lane 2"]), "Extend lanes 1 and 2");
  assert.equal(C.bookButton("court", ["Court 2"]), "Book court 2");
  assert.equal(C.bookHeading("lane"), "Book more lanes");
  assert.equal(C.upcomingHeading("court"), "Your upcoming court time");
  assert.equal(C.choiceForUse("coaching", 3000), "Coaching · $30");
  assert.equal(C.choiceForUse("open_play", 2500), "Open play · $25");
  assert.deepEqual([30, 60, 90, 120, 180].map((m) => C.unitHours("court", m)),
    ["½ court-hour", "1 court-hour", "1½ court-hours", "2 court-hours", "3 court-hours"]);
});

test("the extend card's words: headline, session, notes for free and refused courts", () => {
  const v = V.toOverview(pbaOverview());
  const g = v.extend[0];
  assert.deepEqual(C.extendHeadline(g, "court", v.now, TZ), { tag: "On now", text: "Courts 1–3 · until 9:30 PM" });
  assert.deepEqual(C.extendHeadline(g, "court", "2026-11-17T02:35:00Z", TZ), { tag: "Just ended", text: "Courts 1–3 · ended 9:30 PM" });
  assert.equal(C.sessionSub("pba", "court", "coaching"), "Coaching session");
  assert.equal(C.sessionSub("ccca", "lane", null), "Your lane time");
  assert.equal(C.extendNote(g.courts[0], TZ), "Free until 11:00 PM");
  assert.equal(C.extendNote(g.courts[1], TZ), "Booked from 9:30 PM — can't extend");
  assert.equal(C.extendNote(g.courts[2], TZ), "Free until 10:00 PM");
  assert.equal(C.extendNote({ ...g.courts[1], options: [{ minutes: 30, ok: false, reason: "midnight", at: null }] }, TZ), "Can't run past midnight");
  assert.equal(C.extendNote({ ...g.courts[1], options: [{ minutes: 30, ok: false, reason: null, at: null }] }, TZ), "Can't extend");
  assert.equal(C.droppedNote("court", ["Court 3"], 60), "Court 3 isn't free for +1 hour, so it's no longer picked.");
});

test("after a press: per-court lines, then the total — 'added' only where the platform said ok", () => {
  assert.equal(C.resultLine(DONE.results[0], "Court 1", TZ), "Court 1: added, 9:30–10:30 PM · $30.00");
  assert.equal(C.resultLine(DONE.results[1], "Court 2", TZ), "Court 2 was just booked — nothing added for it");
  assert.equal(C.resultLine({ courtId: C2, ok: false, reason: "other" }, "Lane 2", TZ), "Lane 2 couldn't be added — nothing added for it");
  assert.equal(C.resultTotal({ status: "done", ...DONE }), "$30.00 added to your account. We've emailed you a confirmation.");
  assert.match(C.resultTotal({ status: "done", ...DONE, emailed: false }), /didn't go out/);
  assert.equal(C.resultTotal({ status: "done", results: [DONE.results[1]], totalCents: 0, emailed: false }), "Nothing was added.");
});

test("every other answer is one sentence: refusals say nothing was added; doubts say press again, it won't add twice", () => {
  for (const reason of [...V.REFUSE_REASONS, null]) {
    const m = C.addMessage({ status: "refused", reason });
    assert.ok(m.endsWith("Nothing was added."), m);
  }
  for (const status of ["bad_request", "signed_out", "off"]) assert.match(C.addMessage({ status }), /nothing was added/i, status);
  for (const status of ["unknown", "slow_down"]) assert.match(C.addMessage({ status }), /won't add the time twice/, status);
  for (const status of ["bad_request", "signed_out", "off", "unknown", "slow_down"]) {
    assert.doesNotMatch(C.addMessage({ status }), /added to your account/, status);
  }
});

test("Upcoming words: courts then label, the regular-hours line with a year only when it differs", () => {
  assert.equal(C.upcomingWhat("court", ["1", "2", "3"], "Coaching", "coaching"), "Courts 1–3 · Coaching");
  assert.equal(C.upcomingWhat("lane", ["1"], "Only Girls – Free Coaching", null), "Lane 1 · Only Girls – Free Coaching");
  assert.equal(C.upcomingWhat("lane", ["1", "2", "3"], null, null), "Lanes 1–3");
  assert.equal(C.regularUntilLine("2027-03-31", "2026-11-16"), "Your regular hours continue to Wed 31 Mar 2027.");
  assert.equal(C.regularUntilLine("2026-12-20", "2026-11-16"), "Your regular hours continue to Sun 20 Dec.");
});

/* ══ the relay to the platform ════════════════════════════════════════════════ */

const SECRET = "s".repeat(20) + "+/=" + "Z".repeat(20);
const IP = "203.0.113.7";

function stubFetch(respond) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers) });
    return respond(String(url), init);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}
const reply = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function withSecret(value, fn) {
  const before = process.env.EXTON_RELAY_SECRET;
  if (value === undefined) delete process.env.EXTON_RELAY_SECRET;
  else process.env.EXTON_RELAY_SECRET = value;
  try {
    return await fn();
  } finally {
    if (before === undefined) delete process.env.EXTON_RELAY_SECRET;
    else process.env.EXTON_RELAY_SECRET = before;
  }
}
const ADD = { requestId: RID, kind: "book", date: "2026-11-21", start: "18:00", minutes: 60, courtIds: [C2], use: "coaching" };

async function callAll(ip = IP) {
  return {
    request: await P.requestAcademyLink(PBA_EMAIL, ip),
    link: await P.redeemAcademy({ link: TOKEN }, ip),
    code: await P.redeemAcademy({ email: PBA_EMAIL, code: "012345" }, ip),
    overview: await P.academyOverview(TOKEN, ip),
    day: await P.academyDay(TOKEN, "2026-11-21", ip),
    add: await P.academyAdd(ADD, TOKEN, ip),
    signOut: await P.academySignOut(TOKEN, ip),
  };
}

test("relay secret unset, blank, short or malformed: NO call is made, and every answer is 'platform down'", async () => {
  for (const v of [undefined, "", "   ", "x".repeat(31), "with a space " + "x".repeat(40)]) {
    const f = stubFetch(() => reply(200, {}));
    try {
      const r = await withSecret(v, () => callAll());
      assert.equal(f.calls.length, 0, JSON.stringify(v));
      assert.deepEqual(r, {
        request: "try_again",
        link: { ok: false, error: "try_again" },
        code: { ok: false, error: "try_again" },
        overview: { kind: "unavailable" },
        day: { status: "unavailable" },
        add: { status: "bad_request" },
        signOut: undefined,
      });
    } finally {
      f.restore();
    }
  }
});

test("with the secret: every call carries it and the IP, none a browser cookie; the bearer only where a phone acts", async () => {
  const f = stubFetch((url) => {
    if (url.endsWith("/request")) return reply(202, { ok: true });
    if (url.endsWith("/redeem")) return reply(400, { error: "invalid" });
    if (url.endsWith("/overview")) return reply(401, {});
    if (url.includes("/day?")) return reply(404, {});
    if (url.endsWith("/add")) return reply(503, {});
    return reply(200, { ok: true });
  });
  try {
    const r = await withSecret(SECRET, () => callAll());
    assert.equal(r.request, "ok");
    assert.deepEqual(r.overview, { kind: "signed_out" });
    assert.deepEqual(r.day, { status: "off" });
    assert.deepEqual(r.add, { status: "unknown" }, "a 503 on the write is in doubt");
    assert.equal(f.calls.length, 7);
    for (const c of f.calls) {
      assert.match(c.url, /^https:\/\/platform\.test\/api\/public\/academy\//);
      assert.equal(c.headers.get(P.RELAY_SECRET_HEADER), SECRET, c.url);
      assert.equal(c.headers.get(P.CLIENT_IP_HEADER), IP, c.url);
      assert.equal(c.headers.get("cookie"), null);
      assert.equal(c.init.cache, "no-store");
      assert.equal(String(c.init.body ?? "").includes(SECRET), false);
      assert.equal(String(c.init.body ?? "").includes(TOKEN), c.url.endsWith("/redeem") && String(c.init.body).includes('"link"'));
    }
    assert.equal(P.RELAY_SECRET_HEADER, "x-exton-relay-secret");
    assert.equal(P.CLIENT_IP_HEADER, "x-exton-client-ip");
    const bearer = f.calls.filter((c) => c.headers.get("authorization") === `Bearer ${TOKEN}`).map((c) => c.url.replace("https://platform.test", ""));
    assert.deepEqual(bearer, [
      "/api/public/academy/overview",
      "/api/public/academy/day?date=2026-11-21",
      "/api/public/academy/add",
      "/api/public/academy/sign-out",
    ]);
    const body = (suffix) => JSON.parse(f.calls.find((c) => c.url.endsWith(suffix)).init.body);
    assert.deepEqual(body("/request"), { club: "exton-sports", scope: "academy", email: PBA_EMAIL });
    assert.deepEqual(f.calls.filter((c) => c.url.endsWith("/redeem")).map((c) => JSON.parse(c.init.body)), [
      { club: "exton-sports", scope: "academy", link: TOKEN },
      { club: "exton-sports", scope: "academy", email: PBA_EMAIL, code: "012345" },
    ]);
    assert.deepEqual(body("/add"), ADD);
    assert.equal(f.calls.find((c) => c.url.includes("/overview")).init.method, undefined, "overview is a GET");
  } finally {
    f.restore();
  }
});

test("academyAdd sends §3.3's keys and NOTHING else — a price or a partner handed to it stays here", async () => {
  const f = stubFetch(() => reply(200, DONE));
  try {
    const planted = { ...ADD, amountCents: 1, price: 0, partner: "ccca", hirer: C4, title: "x" };
    const v = await withSecret(SECRET, () => P.academyAdd(planted, TOKEN, IP));
    assert.equal(v.status, "done");
    assert.deepEqual(Object.keys(JSON.parse(f.calls[0].init.body)).sort(), ["courtIds", "date", "kind", "minutes", "requestId", "start", "use"]);
  } finally {
    f.restore();
  }
});

test("academyAdd: a body this site would not send is NOT sent (bad_request); an extension may start off the half-hour", async () => {
  const bad = [
    { ...ADD, requestId: "1" },
    { ...ADD, kind: "cancel" },
    { ...ADD, date: "2026-02-30" },
    { ...ADD, start: "18:15" },
    { ...ADD, minutes: 150 },
    { ...ADD, kind: "extend", minutes: 90 },
    { ...ADD, courtIds: [] },
    { ...ADD, courtIds: [C1, C2, C3, C4] },
    { ...ADD, courtIds: [C1, C1] },
    { ...ADD, courtIds: ["court-1"] },
    { ...ADD, use: "free" },
  ];
  for (const b of bad) {
    const f = stubFetch(() => reply(200, DONE));
    try {
      assert.deepEqual(await withSecret(SECRET, () => P.academyAdd(b, TOKEN, IP)), { status: "bad_request" }, JSON.stringify(b));
      assert.equal(f.calls.length, 0, JSON.stringify(b));
    } finally {
      f.restore();
    }
  }
  const f = stubFetch(() => reply(200, DONE));
  try {
    await withSecret(SECRET, () => P.academyAdd({ ...ADD, kind: "extend", start: "21:45", minutes: 30 }, TOKEN, IP));
    assert.equal(f.calls.length, 1);
    assert.deepEqual(await withSecret(SECRET, () => P.academyAdd(ADD, "not-a-token", IP)), { status: "signed_out" });
    assert.equal(f.calls.length, 1);
  } finally {
    f.restore();
  }
});

async function answer(fn, status, body) {
  const f = stubFetch(() => (status === "throw" ? Promise.reject(new TypeError("fetch failed")) : reply(status, body)));
  try {
    return await withSecret(SECRET, fn);
  } finally {
    f.restore();
  }
}

test("requestAcademyLink: 202 and any per-address 429 read as everyone's sentence; 'busy' is said honestly; 404 is 'off'", async () => {
  const go = () => P.requestAcademyLink(PBA_EMAIL, IP);
  assert.equal(await answer(go, 202, { ok: true }), "ok");
  assert.equal(await answer(go, 429, { error: "rate_limited" }), "ok");
  assert.equal(await answer(go, 429, { error: "busy" }), "try_again");
  assert.equal(await answer(go, 400, { error: "bad_email" }), "bad_email");
  assert.equal(await answer(go, 404, { error: "not_available" }), "off");
  assert.equal(await answer(go, 503, {}), "try_again");
  assert.equal(await answer(go, 403, {}), "try_again");
  assert.equal(await answer(go, "throw"), "try_again");
});

test("redeemAcademy: only a 400 that says 'invalid' is invalid; a 429 is slow_down; a bad 200 is try_again", async () => {
  const go = () => P.redeemAcademy({ link: TOKEN }, IP);
  assert.deepEqual(await answer(go, 200, { deviceToken: TOKEN, expiresAt: "2026-12-16T12:00:00Z" }), { ok: true, deviceToken: TOKEN, expiresAt: "2026-12-16T12:00:00Z" });
  assert.deepEqual(await answer(go, 200, { deviceToken: "short", expiresAt: "2026-12-16T12:00:00Z" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(go, 200, { deviceToken: TOKEN }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(go, 400, { error: "invalid" }), { ok: false, error: "invalid" });
  assert.deepEqual(await answer(go, 400, { error: "bad_request" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(go, 429, {}), { ok: false, error: "slow_down" });
  assert.deepEqual(await answer(go, 404, {}), { ok: false, error: "off" });
  assert.deepEqual(await answer(go, "throw"), { ok: false, error: "try_again" });
});

test("academyOverview: ok only through the allow-list; a refused relay, an outage or a bad body is never 'signed out' or empty", async () => {
  const go = () => P.academyOverview(TOKEN, IP);
  assert.equal((await answer(go, 200, pbaOverview())).kind, "ok");
  assert.deepEqual(await answer(go, 200, { partner: {} }), { kind: "unavailable" });
  assert.deepEqual(await answer(go, 503, {}), { kind: "unavailable" });
  assert.deepEqual(await answer(go, 403, {}), { kind: "unavailable" });
  assert.deepEqual(await answer(go, "throw"), { kind: "unavailable" });
  assert.deepEqual(await answer(go, 401, {}), { kind: "signed_out" });
  assert.deepEqual(await answer(go, 404, {}), { kind: "off" });
});

test("academyDay / academyAdd: a timeout is 'unavailable' for the grid and 'unknown' for the write", async () => {
  assert.deepEqual(await answer(() => P.academyDay(TOKEN, "2026-11-21", IP), "throw"), { status: "unavailable" });
  assert.equal((await answer(() => P.academyDay(TOKEN, "2026-11-21", IP), 200, dayJson())).status, "ok");
  assert.deepEqual(await answer(() => P.academyAdd(ADD, TOKEN, IP), "throw"), { status: "unknown" });
  assert.deepEqual(await answer(() => P.academyAdd(ADD, TOKEN, IP), 422, { error: "refused", reason: "daily_cap" }), { status: "refused", reason: "daily_cap" });
});

test("academyDay: the platform's 422 'window' is 'stale' (a page open past midnight), and the route's answer reads back as it", async () => {
  // 2026-11-16 review: it was 'unavailable', and "Try again" re-asked for the refused date forever.
  const go = () => P.academyDay(TOKEN, "2026-11-15", IP);
  assert.deepEqual(await answer(go, 422, { error: "refused", reason: "window" }), { status: "stale" });
  assert.deepEqual(await answer(go, 422, { error: "refused", reason: "something_new" }), { status: "unavailable" });
  assert.deepEqual(await answer(go, 422, null), { status: "unavailable" });
  assert.deepEqual(V.fromSiteDay(200, wire({ status: "stale" }), "2026-11-15"), { status: "stale" });
  // BookMore asks AcademyView for a new overview once per stale answer; AcademyView remounts it
  // on the new day (a refresh alone keeps the old chosen date — Next 16 keeps client state).
  const view = code(read("app/academies/_components/AcademyView.tsx"));
  assert.match(view, /<BookMore key=\{view\.today\} [^>]*onStale=\{onStale\}/);
  assert.match(view, /function onStale\(\) \{\s*router\.refresh\(\);\s*\}/);
  const book = code(read("app/academies/_components/BookMore.tsx"));
  assert.match(book, /staleAsked\.current === loaded\.key\) return;\s*staleAsked\.current = loaded\.key;\s*onStale\(\);/);
});

/* ══ the source rules (the /my-bookings suite's, for this path) ═══════════════ */

const read = (p) => readFileSync(join(ROOT, p), "utf8");
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
/** Code with comments removed — what can reach a page, roughly. Keeps "https://". */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const rel = (f) => f.slice(ROOT.length + 1).split(sep).join("/");
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const appAndLib = () =>
  [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))].filter((f) => SOURCE_EXT.test(f) && !/\.test\.mjs$/.test(f));
const PAGES = () => walk(join(ROOT, "app", "academies"));
const ROUTES = ["request", "verify", "open", "forget", "day", "add"];

const PAGE_PATHS = ["/academies", "/academies/link", "/academies/open"];

test("private: SiteChrome, robots, next.config headers, the layout's metadata — and no sitemap entry", () => {
  assert.match(read("app/components/SiteChrome.tsx"), /PRIVATE_PATHS = \[[^\]]*"\/academies"/);
  const robots = read("app/robots.ts");
  for (const p of ["/academies$", "/academies/link", "/academies/open"]) assert.ok(robots.includes(`'${p}'`), p);
  assert.doesNotMatch(read("app/sitemap.ts"), /academ/);
  const cfg = code(read("next.config.ts"));
  for (const src of [...PAGE_PATHS, "/api/academies/:path*"]) {
    assert.ok(cfg.includes(`{ source: '${src}', headers: MY_BOOKINGS_HEADERS }`), src);
  }
  const layout = code(read("app/academies/layout.tsx"));
  assert.ok(layout.includes("robots: { index: false, follow: false }"));
  assert.ok(layout.includes('referrer: "no-referrer"'));
  assert.ok(layout.includes(`title: { absolute: "${C.ACADEMY_COPY.title} · Exton Sports Center" }`), "the <title> is the heading plus the club");
});

test("the CCCA images in public/academies stay public: no private header, no robots rule, no page route reaches them", () => {
  // public/academies/ccca-*.png are on the home page, the calendar and the wall TVs. A
  // '/academies/:path*' header rule would make them no-store + noindex, and a bare
  // 'Disallow: /academies' is a prefix that blocks them (2026-11-16, found while building this).
  const assets = readdirSync(join(ROOT, "public", "academies")).map((n) => `/academies/${n}`);
  assert.ok(assets.includes("/academies/ccca-shield.png"));
  const cfg = code(read("next.config.ts"));
  const sources = [...cfg.matchAll(/source: '([^']+)'/g)].map((m) => m[1]).filter((x) => x.includes("academies"));
  for (const src of sources) assert.ok(!/:path|\*|\(/.test(src) || src.startsWith("/api/academies/"), `header source ${src} is a wildcard over /academies`);
  const disallow = /disallow: \[([^\]]*)\]/.exec(code(read("app/robots.ts")))[1];
  const rules = [...disallow.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
  const blocks = (rule, path) => (rule.endsWith("$") ? path === rule.slice(0, -1) : path.startsWith(rule));
  for (const a of assets) for (const r of rules) assert.ok(!blocks(r, a), `robots rule ${r} blocks ${a}`);
  // And the pages ARE blocked.
  for (const p of PAGE_PATHS) assert.ok(rules.some((r) => blocks(r, p)), `robots does not block ${p}`);
  // No page segment under app/academies shares a name with an asset.
  for (const a of assets) assert.equal(existsSync(join(ROOT, "app", ...a.split("/").filter(Boolean))), false, a);
});

test("not linked from any nav: no string outside the path names one of its pages", () => {
  const own = (f) => /^(app\/academies|app\/api\/academies|lib\/academies)\//.test(rel(f));
  const link = /["'`]\/academies(?:\/(?:link|open))?(?:[?#][^"'`]*)?["'`]/;
  for (const f of appAndLib()) {
    if (own(f) || ["app/components/SiteChrome.tsx", "app/robots.ts"].includes(rel(f))) continue;
    assert.doesNotMatch(code(readFileSync(f, "utf8")), link, rel(f));
  }
});

test("route modules export only route fields; exactly the six API routes and the link route", () => {
  const routes = [...walk(join(ROOT, "app", "api", "academies")), ...PAGES()].filter((f) => /[\\/]route\.ts$/.test(f)).map(rel).sort();
  assert.deepEqual(routes, [
    "app/academies/link/route.ts",
    ...ROUTES.map((r) => `app/api/academies/${r}/route.ts`).sort(),
  ]);
  for (const f of routes) {
    const names = [...read(f).matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1]);
    for (const n of names) assert.ok(["runtime", "dynamic", "maxDuration", "GET", "POST"].includes(n), `${f}: ${n}`);
  }
});

test("every API route refuses cross-site first, then runs its OWN per-IP limit before the platform, and forwards the IP", () => {
  for (const name of ROUTES) {
    const src = code(read(`app/api/academies/${name}/route.ts`));
    const cross = src.indexOf("refuseCrossSite(req)");
    const limit = src.indexOf("hit(`ac-");
    const call = src.search(/\b(requestAcademyLink|redeemAcademy|academyDay|academyAdd|academySignOut)\(/);
    assert.ok(cross > 0 && cross < limit, `${name}: the same-origin check is not first`);
    assert.ok(limit > 0, `${name}: no per-IP hit()`);
    assert.ok(call > limit, `${name}: the platform is called before the limit`);
    assert.match(src, /\b(requestAcademyLink|redeemAcademy|academyDay|academyAdd|academySignOut)\([^)]*\bip\)/, `${name}: the IP is not forwarded`);
    assert.doesNotMatch(src, /hit\(`(req|verify|open|forget|cancel|pack-book):/, `${name}: shares a /my-bookings limiter key`);
  }
  assert.match(code(read("app/academies/page.tsx")), /academyOverview\(token, clientIpOf\(await headers\(\)\)\)/);
});

test("WHO is the cookie, never the body: no route reads a token, partner, price or hirer from a request", () => {
  for (const name of ROUTES) {
    const src = code(read(`app/api/academies/${name}/route.ts`));
    assert.doesNotMatch(src, /body\.(token|deviceToken|partner|profileId|price|amount\w*|cents\w*|hirer|title|name)\b/, name);
  }
  for (const name of ["day", "add"]) assert.match(code(read(`app/api/academies/${name}/route.ts`)), /await readAcademyToken\(\)/, name);
  // The write is rebuilt key by key from the body: §3.3's seven, nothing passed through whole.
  assert.match(code(read("app/api/academies/add/route.ts")),
    /const add: AddBody = \{ requestId: body\.requestId, kind, date: body\.date, start: body\.start, minutes: body\.minutes, courtIds \}/);
});

test("open and verify: a refused sign-in through academyRedeemRefusal; the replaced token revoked after the new one", () => {
  for (const name of ["open", "verify"]) {
    const src = code(read(`app/api/academies/${name}/route.ts`));
    assert.match(src, /academyRedeemRefusal\(r\.error\)/, name);
    const previous = src.indexOf("const previous = await readAcademyToken()");
    const redeemAt = src.search(/\bredeemAcademy\(\{/);
    const revoke = src.indexOf("if (stale) await academySignOut(stale, ip)");
    assert.ok(previous > 0 && previous < redeemAt && revoke > redeemAt, name);
    assert.match(src, /academyCookie\(r\.deviceToken, r\.expiresAt\)/, name);
  }
  assert.match(code(read("app/api/academies/open/route.ts")), /clearLink \? clearCookie\(res, ACADEMY_LINK_COOKIE\) : res/);
  assert.match(code(read("app/academies/_components/OpenButton.tsx")), /r\.status === 429 \? "slow"/);
  // The link route parks and redirects; it calls nobody.
  const link = code(read("app/academies/link/route.ts"));
  assert.doesNotMatch(link, /redeemAcademy|fetch\(/);
  assert.match(link, /NextResponse\.redirect\(new URL\('\/academies\/open', req\.url\), 303\)/);
});

test("platform.ts: the only reader of the relay secret on this path, imported only by its routes and the server page", () => {
  const readers = appAndLib().filter((f) => /EXTON_RELAY_SECRET/.test(code(readFileSync(f, "utf8")))).map(rel).sort();
  assert.deepEqual(readers, ["lib/academies/platform.ts", "lib/my-bookings/platform.ts"]);
  // By the "@/" alias, or by any relative path that ends in academies/platform (or ./platform
  // from inside lib/academies).
  const importsIt = (f) => {
    const src = readFileSync(f, "utf8");
    return /from\s+["']@\/lib\/academies\/platform["']/.test(src)
      || /from\s+["'](?:\.\.\/)+(?:lib\/)?academies\/platform["']/.test(src)
      || (rel(f).startsWith("lib/academies/") && /from\s+["']\.\/platform["']/.test(src));
  };
  const importers = appAndLib().filter(importsIt).map(rel).sort();
  assert.deepEqual(importers, ["app/academies/page.tsx", ...ROUTES.map((r) => `app/api/academies/${r}/route.ts`)].sort());
  for (const f of importers) assert.doesNotMatch(read(f), /^\s*["']use client["']/m, f);
});

test("own cookies: nothing on this path names a /my-bookings cookie", () => {
  const files = [...PAGES(), ...walk(join(ROOT, "app", "api", "academies")), ...walk(join(ROOT, "lib", "academies"))].filter((f) => SOURCE_EXT.test(f) && !/\.test\.mjs$/.test(f));
  assert.ok(files.length >= 20);
  for (const f of files) {
    const src = code(readFileSync(f, "utf8"));
    assert.doesNotMatch(src, /__Host-exton_mb|\bDEVICE_COOKIE\b|\bLINK_COOKIE\b|readDeviceToken|readLinkToken/, rel(f));
  }
});

test("the request id: minted by crypto.randomUUID per press, kept only for a retry after a doubt", () => {
  const src = code(read("app/academies/_components/useAdd.ts"));
  assert.match(src, /const requestId = id\.current \?\? crypto\.randomUUID\(\);/);
  assert.match(src, /if \(!keepRequestId\(v\)\) id\.current = null;/);
  assert.match(src, /function reset\(\) \{\s*id\.current = null;/);
  // Both cards press the same one route; nothing else on the path writes.
  const writers = PAGES().filter((f) => /\/api\/academies\/add/.test(code(readFileSync(f, "utf8")))).map(rel);
  assert.deepEqual(writers, ["app/academies/_components/useAdd.ts"]);
});

test("the extend card shows only for what the platform listed; inputs are 16px (no iOS zoom)", () => {
  const view = code(read("app/academies/_components/AcademyView.tsx"));
  assert.match(view, /\{view\.extend\.map\(\(g\) => \(/);
  assert.equal(view.match(/<ExtendCard /g)?.length, 1, "one ExtendCard, inside the map over view.extend");
  const UI = read("app/my-bookings/_components/ui.ts");
  assert.match(UI, /export const INPUT =\s*"[^"]*text-\[16px\]/);
  for (const f of PAGES().filter((p) => p.endsWith(".tsx"))) {
    for (const m of code(readFileSync(f, "utf8")).matchAll(/<input[\s\S]*?\/>/g)) {
      if (/name="company"/.test(m[0])) continue; // the hidden honeypot
      assert.match(m[0], /className=\{(INPUT|`\$\{INPUT\})/, `${rel(f)}: an input without the 16px INPUT class`);
    }
  }
});

test("every text-white/NN on these pages is a step the light theme remaps", () => {
  const css = read("app/globals.css");
  const remapped = new Set([...css.matchAll(/\[data-theme="light"\] \.text-white\\\/(\d+)\s/g)].map((m) => m[1]));
  for (const f of PAGES()) {
    for (const m of code(readFileSync(f, "utf8")).matchAll(/(?<![:\w-])text-white\/(\d+)/g)) {
      assert.ok(remapped.has(m[1]), `${rel(f)}: text-white/${m[1]} is not remapped for the light theme`);
    }
  }
  // The stylesheet paints with theme tokens; its own --ac-* greens are redefined for light.
  const sheet = read("app/academies/_components/academies.module.css");
  assert.match(sheet, /:global\(:root\[data-theme="light"\]\) \.page \{/);
});

test("no Orangish address or brand on the partner's pages, beyond the credit pill", () => {
  const files = [...PAGES(), join(ROOT, "lib", "academies", "copy.ts")];
  for (const f of files) {
    const left = code(readFileSync(f, "utf8"))
      .replace(/import OrangishPill from "\.\.\/components\/OrangishPill";/g, "")
      .replace(/<OrangishPill \/>/g, "");
    assert.doesNotMatch(left, /orangish/i, rel(f));
  }
});

test("no partner address is written into this PUBLIC repo's code — the page shows the one the platform sends", () => {
  const files = [...PAGES(), ...walk(join(ROOT, "app", "api", "academies")), ...walk(join(ROOT, "lib", "academies"))]
    .filter((f) => SOURCE_EXT.test(f) && !/\.test\.mjs$/.test(f));
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /philadelphiabadminton|zopesac/i, rel(f));
  }
});

test("npm test runs this file", () => {
  assert.ok(JSON.parse(read("package.json")).scripts.test.split(/\s+/).includes("lib/academies/academies.test.mjs"));
});

/* ══ rendered (react-dom/server; the /my-bookings suite's loader) ═════════════
   Upcoming and the extend card, from the fixture above, with the project's own TypeScript
   compiling the .tsx (JSX out, types dropped). A CSS module loads as a proxy whose every class
   is its own name, so the markup can be read. Nothing is pressed and nothing is posted. */

const ts = (await import("typescript")).default;
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? "";
    let base = null;
    if (specifier.startsWith("@/")) base = join(ROOT, specifier.slice(2));
    else if (/^\.{1,2}\//.test(specifier) && /\.tsx?(\?|$)/.test(parent) && /[\\/]app[\\/]/.test(fileURLToPath(parent))) {
      base = fileURLToPath(new URL(specifier, parent));
    }
    if (base) {
      for (const ext of ["", ".tsx", ".ts"]) {
        if (existsSync(base + ext) && statSync(base + ext).isFile()) return { url: pathToFileURL(base + ext).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.module\.css$/.test(url)) {
      return { format: "module", source: "export default new Proxy({}, { get: (_, k) => String(k) });", shortCircuit: true };
    }
    if (!/\.tsx(\?|$)/.test(url)) return nextLoad(url, context);
    const file = fileURLToPath(url);
    const out = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  },
});

const textOf = (html) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

test("rendered: Upcoming — today first, the Added tag, the second week behind its button, the regular-hours line", async () => {
  const { default: Upcoming } = await import("../../app/academies/_components/Upcoming.tsx");
  const view = V.toOverview(pbaOverview({ regularUntil: "2027-03-31" }));
  const t = textOf(renderToStaticMarkup(createElement(Upcoming, { view })));
  assert.ok(t.startsWith("Your upcoming court time Today · Mon 16 Nov 5:30–9:30 PM Courts 1–3 · Coaching"), t);
  assert.ok(t.includes("Wed 18 Nov 5:30–9:30 PM Courts 1–3 · Coaching 9:30–10:30 PM Court 1 · Coaching Added 16 Nov"), t);
  assert.ok(!t.includes("Tue 24 Nov"), "the second week waits");
  assert.ok(t.includes("Show the next 7 days"));
  assert.ok(t.endsWith("Your regular hours continue to Wed 31 Mar 2027."), t);
  const empty = textOf(renderToStaticMarkup(createElement(Upcoming, { view: { ...view, upcoming: [], regularUntil: null } })));
  assert.equal(empty, "Your upcoming court time No court time booked in the next 14 days.");
});

test("rendered: the extend card — refused chips disabled with their reason, the use switch for PBA, no button before a pick", async () => {
  const { default: ExtendCard } = await import("../../app/academies/_components/ExtendCard.tsx");
  const view = V.toOverview(pbaOverview());
  const add = { busy: false, outcome: null, submit: async () => ({ status: "unknown" }), reset: () => {} };
  const html = renderToStaticMarkup(createElement(ExtendCard, { group: view.extend[0], view, add }));
  const t = textOf(html);
  assert.ok(t.startsWith("On now Courts 1–3 · until 9:30 PM Coaching session Coaching · $30 Open play · $25 Extend Court 1 +30 min +1 hour Free until 11:00 PM"), t);
  assert.ok(t.includes("Court 2 +30 min +1 hour Booked from 9:30 PM — can't extend"));
  const chips = [...html.matchAll(/<button type="button" class="chip text-mono"( disabled="")? aria-pressed="false">([^<]+)<\/button>/g)]
    .map((m) => `${m[2]}${m[1] ? " (off)" : ""}`);
  assert.deepEqual(chips, ["+30 min", "+1 hour", "+30 min (off)", "+1 hour (off)", "+30 min", "+1 hour (off)"]);
  assert.ok(!t.includes("This adds"), "no confirm line and no button until something is picked");
  const ccca = { ...view, partner: { ...view.partner, key: "ccca", unit: "lane", name: "Chester County Cricket Academy" }, rates: [{ use: null, centsPerHour: 4000 }] };
  const c = textOf(renderToStaticMarkup(createElement(ExtendCard, { group: { ...view.extend[0], courtsLabel: null, use: null }, view: ccca, add })));
  assert.ok(c.startsWith("On now Lanes 1–3 · until 9:30 PM Your lane time Extend Lane 1 +30 min"), c);
  // The platform's bare "1" never reaches the row as "1" (2026-11-16 review).
  assert.doesNotMatch(html, /class="courtName">\d+</);
});

test("rendered: Book more — fifteen day chips to today + 14, the use switch's prices, and no figure-less button", async () => {
  const { default: BookMore } = await import("../../app/academies/_components/BookMore.tsx");
  const add = { busy: false, outcome: null, submit: async () => ({ status: "unknown" }), reset: () => {} };
  const props = (view) => ({ view, refreshKey: 0, add, onStale: () => {} });
  const pba = V.toOverview(pbaOverview({ lastDate: "2026-11-30" }));
  const html = renderToStaticMarkup(createElement(BookMore, props(pba)));
  const chips = [...html.matchAll(/<span class="d1 text-mono">(\w+)<\/span><span class="d2">(\d+)<\/span>/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.equal(chips.length, 15);
  assert.equal(chips[0], "Mon 16");
  assert.equal(chips.at(-1), "Mon 30", "the last bookable day is offered");
  const t = textOf(html);
  assert.ok(t.includes("Coaching · $30 Open play · $25"), t);
  assert.ok(!t.includes("can't price"), t);
  // CCCA after its season: the chips and the page are there; a line says why nothing can be added.
  const late = V.toOverview(cccaAfterSeason());
  const c = textOf(renderToStaticMarkup(createElement(BookMore, props(late))));
  assert.ok(c.startsWith("Book more lanes"), c);
  assert.ok(c.includes("This page can't price extra lane time on this day, so it can't add any. Email Aniket to book it."), c);
  assert.ok(!c.includes("This adds"), c);
});

test("rendered: Upcoming for CCCA after its season — its own lanes, not an outage", async () => {
  const { default: Upcoming } = await import("../../app/academies/_components/Upcoming.tsx");
  const t = textOf(renderToStaticMarkup(createElement(Upcoming, { view: V.toOverview(cccaAfterSeason()) })));
  assert.equal(t, "Your upcoming lane time Today · Sat 3 Apr 12:00–2:00 PM Lanes 1–3");
});
