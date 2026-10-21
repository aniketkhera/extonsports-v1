/* The court 5-pack's contracts on extonsports.com, 2026-10-21 (S1, the foundation).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court 5-pack; design
   §8 and §13 (orangish-app docs/court-packs.md). This file pins what the three parallel
   site pieces build against: the selection cookie and its parser, the `next` allow-list,
   the request key, the app-form links in lib/booking.ts, the allow-lists the platform's
   pack answers pass through (lib/my-bookings/view.ts), the relays (platform.ts) and the
   sentences (copy.ts). Everything here passes `tsc` when broken: let the selection parser
   read an `email` and an address lands in a cookie; pass a platform-sent URL through and a
   planted javascript: link reaches a page; show packs on a quote that is not `match` and
   the page tells a stranger whether an address holds a pack; read a book timeout as "try
   again" and a guest whose credit was already spent books twice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
const C = await import("./copy.ts");
const B = await import("../booking.ts");
process.env.ORANGISH_API_BASE = "https://platform.test";
delete process.env.EXTON_RELAY_SECRET;
const P = await import("./platform.ts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
/** Code with comments removed. Keeps "https://". */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21); // 43, base64url
const UUID = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
const SPORT = "bfff160c-1111-4c2b-9e1f-0a1b2c3d4e5f";
const COURT = "aaaa160c-2222-4c2b-9e1f-0a1b2c3d4e5f";
const APP = "https://app.orangish.io/book-court/exton-sports";

/* ── the selection: ?s&d&t&h&n&c → __Host-exton_pack_sel ─────────────── */

const q = (o) => new URLSearchParams(o);
const GOOD = { s: SPORT, d: "2026-10-25", t: "18:00", h: "1", n: "2" };
const SEL = { sportId: SPORT, date: "2026-10-25", startTime: "18:00", hours: 1, courts: 2, preferCourtId: null };

test("parsePackSelection: the six keys, shape-checked, into the platform's `sel` shape", () => {
  assert.deepEqual(S.parsePackSelection(q(GOOD)), SEL);
  assert.equal(S.parsePackSelection(q({ ...GOOD, c: COURT })).preferCourtId, COURT);
  assert.equal(S.parsePackSelection(q({ ...GOOD, c: "" })).preferCourtId, null);
  assert.equal(S.parsePackSelection(q({ ...GOOD, h: "3", n: "4" })).courts, 4);
});

test("parsePackSelection: a bad shape, a missing key or a repeated key is null", () => {
  const bad = [
    { s: "x" }, { s: "" }, { d: "2026-02-30" }, { d: "26-10-25" }, { d: "2026-10-25T00:00" },
    { t: "6pm" }, { t: "24:00" }, { t: "18:7" }, { t: "18:60" }, { h: "0" }, { h: "4" }, { h: "1.5" },
    { h: "01" }, { n: "0" }, { n: "5" }, { n: "-1" }, { c: "nope" },
  ];
  for (const b of bad) assert.equal(S.parsePackSelection(q({ ...GOOD, ...b })), null, JSON.stringify(b));
  for (const k of ["s", "d", "t", "h", "n"]) {
    const g = { ...GOOD };
    delete g[k];
    assert.equal(S.parsePackSelection(q(g)), null, k);
  }
  const dup = q(GOOD);
  dup.append("s", UUID);
  assert.equal(S.parsePackSelection(dup), null);
});

test("parsePackSelection never reads an email — or anything but the six keys", () => {
  const planted = S.parsePackSelection(q({ ...GOOD, email: "real@person.com", e: "real@person.com", token: TOKEN }));
  assert.deepEqual(planted, SEL);
  assert.equal(JSON.stringify(planted).includes("@"), false);
  assert.doesNotMatch(code(read("lib/my-bookings/session.ts")), /email/i);
});

test("packSelCookie: __Host- name, httpOnly, Secure, Lax, Path=/, NO domain, 30 minutes", () => {
  const c = S.packSelCookie(SEL);
  assert.equal(c.name, "__Host-exton_pack_sel");
  assert.equal(S.PACK_SEL_COOKIE, c.name);
  assert.equal(S.PACK_SEL_MAX_AGE_S, 1800);
  assert.deepEqual(c.options, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 1800 });
  assert.equal("domain" in c.options, false);
  assert.match(c.value, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(S.decodePackSel(c.value), SEL);
  const withCourt = { ...SEL, preferCourtId: COURT };
  assert.deepEqual(S.decodePackSel(S.packSelCookie(withCourt).value), withCourt);
});

test("packSelCookie carries the slot only — no personal data — and throws on a bad selection", () => {
  const c = S.packSelCookie({ ...SEL, preferCourtId: COURT });
  const raw = JSON.parse(Buffer.from(c.value, "base64url").toString("utf8"));
  assert.deepEqual(Object.keys(raw).sort(), ["c", "d", "h", "n", "s", "t"]);
  assert.throws(() => S.packSelCookie({ ...SEL, hours: 9 }));
  assert.throws(() => S.packSelCookie({ ...SEL, sportId: "x" }));
  assert.throws(() => S.packSelCookie(null));
});

test("decodePackSel: a tampered, foreign or oversized cookie is null, re-checked by the same rules", () => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  for (const v of [
    undefined, null, "", "not base64!", "%%%", "A".repeat(600),
    enc({ s: SPORT, d: "2026-10-25", t: "18:00", h: 9, n: 1 }),
    enc({ s: SPORT, d: "2026-10-25", t: "18:00", h: 1, n: 1, email: "real@person.com" }),
    enc([SPORT]), enc("x"), enc(null),
  ]) {
    assert.equal(S.decodePackSel(v), null, String(v).slice(0, 40));
  }
  assert.deepEqual(S.decodePackSel(enc({ s: SPORT, d: "2026-10-25", t: "18:00", h: 1, n: 2 })), SEL);
});

test("mintRequestKey: 16 random bytes as 22 base64url characters, the platform's request_key shape", () => {
  const a = S.mintRequestKey();
  const b = S.mintRequestKey();
  assert.match(a, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(S.REQUEST_KEY_RE.test(a), true);
  assert.notEqual(a, b);
  assert.equal(S.REQUEST_KEY_RE.test("k".repeat(21)), false);
  assert.equal(S.REQUEST_KEY_RE.test("k".repeat(23)), false);
});

test("CHECKOUT_SESSION_RE: the cs_live_/cs_test_ shape and nothing else", () => {
  assert.equal(S.CHECKOUT_SESSION_RE.test("cs_test_a1B2c3"), true);
  assert.equal(S.CHECKOUT_SESSION_RE.test("cs_live_a1B2c3"), true);
  for (const v of ["cs_test_", "pi_123", "cs_test_a1/../x", "cs_prod_abc", " cs_test_abc"]) {
    assert.equal(S.CHECKOUT_SESSION_RE.test(v), false, v);
  }
});

test("nextPathOf: /my-bookings, /my-bookings/pack or /my-bookings?cancel=<uuid>, and nothing else", () => {
  assert.equal(S.nextPathOf("/my-bookings/pack"), "/my-bookings/pack");
  assert.equal(S.nextPathOf("/my-bookings"), "/my-bookings");
  // Integration, 2026-10-21 (S3's ask): the pack email's Cancel link survives a code sign-in.
  assert.equal(S.nextPathOf(`/my-bookings?cancel=${UUID}`), `/my-bookings?cancel=${UUID}`);
  assert.equal(S.nextPathOf(`/my-bookings?cancel=${UUID.toUpperCase()}`), `/my-bookings?cancel=${UUID.toUpperCase()}`);
  for (const v of [undefined, null, "", "/", "https://evil.example/my-bookings", "//evil.example",
    "/my-bookings/pack/../../x", "/my-bookings/pack?x=1", "/my-bookings/link", "/MY-BOOKINGS", 42, {},
    "/my-bookings?cancel=", "/my-bookings?cancel=nope", `/my-bookings?cancel=${UUID}&next=//evil.example`,
    `/my-bookings?cancel=${UUID}#x`, `/my-bookings?cancel=${UUID}x`, `/my-bookings/pack?cancel=${UUID}`,
    `https://evil.example/my-bookings?cancel=${UUID}`, `//evil.example/my-bookings?cancel=${UUID}`,
    `/my-bookings?cancel=${UUID}/../x`, `/my-bookings?x=1&cancel=${UUID}`]) {
    assert.equal(S.nextPathOf(v), "/my-bookings", String(v));
  }
  assert.deepEqual([...S.NEXT_PATHS], ["/my-bookings", "/my-bookings/pack"]);
  assert.equal(S.cancelNextPath(UUID), `/my-bookings?cancel=${UUID}`);
  for (const v of [null, undefined, "", "nope", `${UUID}x`, [UUID], 7]) assert.equal(S.cancelNextPath(v), null, String(v));
});

/* ── lib/booking.ts ────────────────────────────────────────────────────── */

test("booking.ts: the pack paths, the entry switch OFF, the app form's links", () => {
  assert.equal(B.PACK_PATH, "/5-pack");
  assert.equal(B.PACK_TERMS_PATH, "/5-pack/terms");
  assert.equal(B.PACK_BOOK_PATH, "/my-bookings/pack");
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(B.bookWithPackUrl(SPORT), `${APP}?pay=pack&sport_id=${SPORT}`);
  assert.equal(B.bookWithPackUrl(null), `${APP}?pay=pack`);
  assert.equal(B.bookWithPackUrl("../../x"), `${APP}?pay=pack`);
  assert.equal(
    B.bookWithPackUrl(SPORT, SEL),
    `${APP}?pay=pack&sport_id=${SPORT}&date=2026-10-25&start_time=18%3A00&hours=1&courts=2`,
  );
  assert.equal(B.bookByCardUrl(SEL), `${APP}?sport_id=${SPORT}&date=2026-10-25&start_time=18%3A00&hours=1&courts=2`);
  assert.equal(
    B.bookByCardUrl({ ...SEL, preferCourtId: COURT }),
    `${APP}?sport_id=${SPORT}&date=2026-10-25&start_time=18%3A00&hours=1&courts=2&court_id=${COURT}`,
  );
});

test("appHref: a platform link survives only on the platform's own https origin", () => {
  assert.equal(B.appHref("/book-court/exton-sports/terms"), `${APP}/terms`);
  assert.equal(B.appHref(`${APP}/terms`), `${APP}/terms`);
  for (const bad of ["javascript:alert(1)", "https://evil.example/x", "//evil.example/x", "/\\evil.example/x",
    "http://app.orangish.io/x", "https://app.orangish.io.evil.example/x", "https://u:p@app.orangish.io/x",
    "data:text/html,x", "", 42, null, undefined, "x".repeat(600)]) {
    assert.equal(B.appHref(bad), null, String(bad).slice(0, 40));
  }
});

/* ── the allow-lists: My bookings rows and pack cards ──────────────────── */

const ROW = {
  seriesId: UUID,
  sport: "Badminton",
  whenText: "Sat, Oct 24, 2026, 11:00 AM–12:00 PM",
  startsAt: "2026-10-24T15:00:00.000Z",
  cancelBy: "2026-10-23T15:00:00.000Z",
  cancelByText: "Fri 23 Oct, 11:00 AM",
  courts: ["BADMINTON 1"],
  amountPaidCents: 4500,
  status: "active",
  cancellable: true,
  blockedReason: null,
  refundedCents: null,
};
const PACK_ROW = { ...ROW, amountPaidCents: 0, paidWith: "pack", credits: 1, creditsReturned: null, cancelledBy: null, packName: "Badminton 5-pack" };
const PACK = {
  ref: "PK-3f2b6c",
  sport: "Badminton",
  sportId: SPORT,
  name: "Badminton 5-pack",
  creditsTotal: 5,
  creditsLeft: 3,
  creditsBooked: 1,
  status: "active",
  validUntil: "2026-12-17",
  validUntilText: "Dec 17",
  clock: "started",
  clockText: "60 days from your first game on Oct 18",
  unusedUntilText: "Oct 20, 2027",
  bookUrl: `${APP}?pay=pack&sport_id=${SPORT}`,
  uses: [{ whenText: "Thu, Oct 15, 7:00 PM–8:00 PM", credits: 1, use: "played" }],
};
const LIST = {
  club: { name: "Exton Sports Center", phone: "484-252-2523" },
  email: "a•••@example.com",
  cutoffHours: 24,
  bookings: [ROW],
};

test("toView: a card row gains paidWith 'card' and null pack fields; `packs` missing reads as []", () => {
  const v = V.toView(LIST);
  assert.deepEqual(v.packs, []);
  assert.deepEqual(
    { paidWith: v.bookings[0].paidWith, credits: v.bookings[0].credits, creditsReturned: v.bookings[0].creditsReturned,
      cancelledBy: v.bookings[0].cancelledBy, packName: v.bookings[0].packName },
    { paidWith: "card", credits: null, creditsReturned: null, cancelledBy: null, packName: null },
  );
  assert.deepEqual(V.toView({ ...LIST, packs: null }).packs, []);
});

test("toView: a pack row keeps its credits and pack name, and never shows money refunded", () => {
  const v = V.toView({ ...LIST, bookings: [PACK_ROW] });
  assert.equal(v.bookings[0].paidWith, "pack");
  assert.equal(v.bookings[0].credits, 1);
  assert.equal(v.bookings[0].packName, "Badminton 5-pack");
  const done = V.toView({
    ...LIST,
    bookings: [{ ...PACK_ROW, status: "cancelled", cancellable: true, refundedCents: 0, creditsReturned: 1, cancelledBy: "club" }],
  }).bookings[0];
  assert.equal(done.cancellable, false);
  assert.equal(done.refundedCents, null);
  assert.equal(done.creditsReturned, 1);
  assert.equal(done.cancelledBy, "club");
});

test("toView: pack rows of the wrong shape are dropped, not repaired", () => {
  const bad = [
    { ...PACK_ROW, paidWith: "cash" },
    { ...PACK_ROW, credits: undefined },
    { ...PACK_ROW, credits: 0 },
    { ...PACK_ROW, credits: 21 },
    { ...PACK_ROW, packName: "" },
    { ...PACK_ROW, creditsReturned: "1" },
    { ...PACK_ROW, cancelledBy: "staff" },
  ];
  const v = V.toView({ ...LIST, bookings: [...bad, PACK_ROW] });
  assert.equal(v.bookings.length, 1);
});

test("toView: a pack card comes through with exactly its allowed keys; planted ones never reach a page", () => {
  const v = V.toView({
    ...LIST,
    packs: [{ ...PACK, packId: UUID, holderProfileId: UUID, holderEmail: "real@person.com", stripe_payment_intent_id: "pi_x",
      uses: [{ ...PACK.uses[0], redemptionId: UUID, email: "real@person.com" }] }],
  });
  assert.equal(v.packs.length, 1);
  assert.deepEqual(Object.keys(v.packs[0]).sort(), Object.keys(PACK).sort());
  assert.deepEqual(Object.keys(v.packs[0].uses[0]).sort(), ["credits", "use", "whenText"]);
  assert.equal(JSON.stringify(v).includes("real@person.com"), false);
  assert.equal(JSON.stringify(v).includes("pi_x"), false);
});

test("toPack: the book link is OURS, built from the sport id — a planted URL never reaches a page", () => {
  for (const planted of ["javascript:alert(1)", "https://evil.example/", undefined]) {
    const p = V.toPack({ ...PACK, bookUrl: planted });
    assert.equal(p.bookUrl, `${APP}?pay=pack&sport_id=${SPORT}`);
  }
});

test("toPack: wrong shapes are null — including a pending or abandoned pack, which is no guest's", () => {
  const bad = [
    { status: "pending" }, { status: "abandoned" }, { status: "weird" }, { ref: "PK-1" }, { ref: "XX-3f2b6c" },
    { sportId: "x" }, { creditsTotal: 0 }, { creditsTotal: 21 }, { creditsLeft: 6 }, { creditsLeft: -1 },
    { creditsBooked: 3 }, { clock: "ticking" }, { validUntil: "Dec 17" }, { validUntil: "2026-02-30" },
    { uses: "none" }, { name: "" }, { sport: "x".repeat(61) },
  ];
  for (const b of bad) assert.equal(V.toPack({ ...PACK, ...b }), null, JSON.stringify(b));
  assert.equal(V.toPack(null), null);
  // A use of the wrong shape is dropped; at most 10 are kept.
  const many = Array.from({ length: 14 }, () => PACK.uses[0]);
  assert.equal(V.toPack({ ...PACK, uses: [...many, { whenText: "x", credits: 1, use: "stolen" }] }).uses.length, 10);
  assert.deepEqual(V.toPack({ ...PACK, uses: undefined }).uses, []);
  assert.equal(V.toPack({ ...PACK, validUntil: null, validUntilText: null }).validUntil, null);
});

test("toView: a `packs` that is not a list is a bad answer (=> 'unavailable'), never 'no packs'", () => {
  assert.equal(V.toView({ ...LIST, packs: "none" }), null);
  assert.equal(V.toView({ ...LIST, packs: { 0: PACK } }), null);
});

test("toView: usable packs first, then the rest, in the platform's order", () => {
  const used = { ...PACK, ref: "PK-aaaaaa", status: "used_up", creditsLeft: 0, creditsBooked: 0 };
  const booked = { ...PACK, ref: "PK-bbbbbb", status: "all_booked", creditsLeft: 0, creditsBooked: 5 };
  const v = V.toView({ ...LIST, packs: [used, booked, PACK] });
  assert.deepEqual(v.packs.map((p) => p.ref), ["PK-3f2b6c", "PK-bbbbbb", "PK-aaaaaa"]);
});

/* ── cancel answers for a pack series ──────────────────────────────────── */

const PACK_CANCEL = {
  status: "cancelled",
  refundedCents: 0,
  paidWith: "pack",
  creditsReturned: 1,
  pack: { name: "Badminton 5-pack", creditsLeft: 3, creditsTotal: 5, validUntilText: "Nov 29", packId: UUID },
};
const PACK_CANCEL_VIEW = {
  status: "cancelled",
  paidWith: "pack",
  creditsReturned: 1,
  pack: { name: "Badminton 5-pack", creditsLeft: 3, creditsTotal: 5, validUntilText: "Nov 29" },
};

test("toCancelView: a pack cancel carries the credit and the pack — never a refunded amount", () => {
  assert.deepEqual(V.toCancelView(200, PACK_CANCEL), PACK_CANCEL_VIEW);
  assert.deepEqual(V.toCancelView(200, { ...PACK_CANCEL, status: "already_cancelled" }), {
    ...PACK_CANCEL_VIEW,
    status: "already_cancelled",
  });
  // A card cancel is exactly what it was before packs.
  assert.deepEqual(V.toCancelView(200, { status: "cancelled", refundedCents: 9000 }), { status: "cancelled", refundedCents: 9000 });
  // A malformed pack block is dropped; the credit still says what happened.
  assert.deepEqual(V.toCancelView(200, { ...PACK_CANCEL, pack: { name: "x", creditsLeft: 9, creditsTotal: 5 } }), {
    status: "cancelled",
    paidWith: "pack",
    creditsReturned: 1,
  });
});

test("fromSiteCancel: this site's 200 passes the pack fields through the same allow-list", () => {
  assert.deepEqual(V.fromSiteCancel(200, { ...PACK_CANCEL_VIEW, holderEmail: "real@person.com" }), PACK_CANCEL_VIEW);
  assert.deepEqual(V.fromSiteCancel(200, { status: "cancelled", refundedCents: 4500 }), { status: "cancelled", refundedCents: 4500 });
});

test("cancelMessage: a pack cancel says the credit is back, and never mentions money or a card", () => {
  const m = C.cancelMessage(PACK_CANCEL_VIEW);
  assert.equal(m, "Cancelled. Credit is back. Badminton 5-pack 3 of 5 left · valid until Nov 29.");
  assert.doesNotMatch(m, /\$|card|refund/i);
  assert.match(C.cancelMessage({ status: "cancelled", paidWith: "pack" }), /^Cancelled\. Credit is back\./);
  assert.doesNotMatch(C.cancelMessage({ status: "already_cancelled", paidWith: "pack" }), /\$|card|refund/i);
  // The card sentence is unchanged.
  assert.match(C.cancelMessage({ status: "cancelled", refundedCents: 9000 }), /^Cancelled\. \$90\.00 is on its way back/);
});

/* ── the quote ─────────────────────────────────────────────────────────── */

const SLOT = {
  sport: "Badminton",
  sportId: SPORT,
  unit: "court",
  courts: 2,
  hours: 1,
  whenText: "6:00 PM–7:00 PM, Sun, Oct 25",
  credits: 2,
  cardTotalCents: 9000,
  creditValueCents: 4000,
  savesCents: 1000,
};
const TERMS = { version: "2026-10-13-3", url: "/book-court/exton-sports/terms" };
const QUOTE_NONE = { slot: SLOT, terms: TERMS, session: "none", cardUrl: "https://evil.example/" };
const CHOICE = { packName: "Badminton 5-pack", creditsLeftAfter: 1, creditsTotal: 5, validUntilText: "Dec 17", clockText: "60 days from your first game on Oct 18", clock: "started" };
const QUOTE_MATCH = { ...QUOTE_NONE, session: "match", email: "a•••@example.com", packs: [PACK], choice: CHOICE, refusal: null };

test("toQuote: signed out, the slot and terms come through — and the card link is OURS", () => {
  const v = V.toQuote(QUOTE_NONE, SEL);
  assert.equal(v.session, "none");
  assert.deepEqual(v.slot, SLOT);
  assert.equal(v.slotProblem, null);
  assert.deepEqual(v.terms, { version: "2026-10-13-3", url: `${APP}/terms` });
  assert.equal(v.cardUrl, B.bookByCardUrl(SEL));
  assert.deepEqual(Object.keys(v).sort(), ["cardUrl", "choice", "email", "packs", "refusal", "session", "slot", "slotProblem", "terms"]);
});

test("toQuote: ⛔ packs, email, choice and refusal reach a page ONLY on session 'match'", () => {
  const leaky = { ...QUOTE_NONE, email: "a•••@example.com", packs: [PACK], choice: CHOICE, refusal: { reason: "no_pack" } };
  const v = V.toQuote(leaky, SEL);
  assert.deepEqual([v.email, v.packs, v.choice, v.refusal], [null, [], null, null]);
  const m = V.toQuote(QUOTE_MATCH, SEL);
  assert.equal(m.session, "match");
  assert.equal(m.email, "a•••@example.com");
  assert.equal(m.packs.length, 1);
  assert.deepEqual(m.choice, CHOICE);
  assert.equal(m.refusal, null);
});

test("toQuote: a refusal comes through with its details; an unknown reason is a bad answer", () => {
  const r = V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "not_enough_credits", need: 2, creditsLeft: 1, holderId: UUID } }, SEL);
  assert.deepEqual(r.refusal, {
    reason: "not_enough_credits", need: 2, sports: [], maxCredits: null, creditsLeft: 1, creditsTotal: null, lo: null, hi: null,
  });
  const w = V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "outside_window", lo: "2026-11-10", hi: "2026-12-24" } }, SEL);
  assert.deepEqual([w.refusal.lo, w.refusal.hi], ["2026-11-10", "2026-12-24"]);
  const s = V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "wrong_sport", sports: ["Squash", 7, "Cricket"] } }, SEL);
  assert.deepEqual(s.refusal.sports, ["Squash", "Cricket"]);
  assert.equal(V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "because" } }, SEL), null);
});

test("toQuote: a bad answer is null (=> 'couldn't reach'), never a half-rendered screen", () => {
  const bad = [
    null, "x", { ...QUOTE_NONE, session: "maybe" },
    { ...QUOTE_NONE, terms: { ...TERMS, url: "javascript:alert(1)" } },
    { ...QUOTE_NONE, terms: { ...TERMS, url: "https://evil.example/terms" } },
    { ...QUOTE_NONE, terms: { url: TERMS.url } },
    { ...QUOTE_NONE, slot: null }, // neither slot nor problem
    { ...QUOTE_NONE, slotProblem: { code: "taken", message: "Just taken." } }, // both
    { ...QUOTE_NONE, slot: { ...SLOT, credits: 3 } }, // credits ≠ courts × hours
    { ...QUOTE_NONE, slot: { ...SLOT, sportId: UUID } }, // not the sport we asked about
    { ...QUOTE_NONE, slot: { ...SLOT, unit: "table" } },
    { ...QUOTE_MATCH, email: "real@person.com" }, // an unmasked address
    { ...QUOTE_MATCH, choice: null, refusal: null }, // match with a slot must say one or the other
    { ...QUOTE_MATCH, refusal: { reason: "no_pack" } }, // and not both
    { ...QUOTE_MATCH, packs: "none" },
    { ...QUOTE_MATCH, choice: { ...CHOICE, creditsLeftAfter: 6 } },
    { ...QUOTE_MATCH, choice: { ...CHOICE, clock: "ticking" } },
  ];
  for (const b of bad) assert.equal(V.toQuote(b, SEL), null, JSON.stringify(b)?.slice(0, 80));
});

test("toQuote: the choice carries its clock (S2's ask, integration 2026-10-21); a platform without one reads null", () => {
  for (const clock of ["started", "provisional", "not_started"]) {
    assert.equal(V.toQuote({ ...QUOTE_MATCH, choice: { ...CHOICE, clock } }, SEL).choice.clock, clock);
  }
  const noClock = { ...CHOICE };
  delete noClock.clock;
  assert.deepEqual(V.toQuote({ ...QUOTE_MATCH, choice: noClock }, SEL).choice, { ...noClock, clock: null });
  assert.equal(V.toQuote({ ...QUOTE_MATCH, choice: { ...CHOICE, clock: null } }, SEL).choice.clock, null);
});

test("toQuote: a slot problem is the platform's code and message, with no slot", () => {
  const v = V.toQuote({ ...QUOTE_NONE, slot: undefined, slotProblem: { code: "taken", message: "That time was just taken." } }, SEL);
  assert.equal(v.slot, null);
  assert.deepEqual(v.slotProblem, { code: "taken", message: "That time was just taken." });
  assert.equal(V.toQuote({ ...QUOTE_NONE, slot: undefined, slotProblem: { code: "taken", message: "x".repeat(301) } }, SEL), null);
});

/* ── the book answer ───────────────────────────────────────────────────── */

const BOOKED = {
  status: "booked",
  booking: { seriesId: UUID, whenText: "Sun, Oct 25 · 6:00–7:00 PM", courts: ["BADMINTON 1", "BADMINTON 2"], credits: 2,
    lightsNote: "Lights will automatically turn on 15 mins prior to the booking start." },
  pack: { name: "Badminton 5-pack", creditsLeft: 1, creditsTotal: 5, validUntilText: "Dec 17", clockText: "60 days from your first game on Oct 18" },
};

test("toBooked: booked and already come through the allow-list; planted fields do not", () => {
  const v = V.toBooked(200, { ...BOOKED, redemptionId: UUID, holderEmail: "real@person.com",
    booking: { ...BOOKED.booking, packId: UUID }, pack: { ...BOOKED.pack, holderProfileId: UUID } });
  assert.deepEqual(v, BOOKED);
  assert.equal(V.toBooked(200, { ...BOOKED, status: "already" }).status, "already");
  // Booked is booked even when the details do not parse: the credit is spent; say so.
  assert.deepEqual(V.toBooked(200, { status: "booked", booking: { seriesId: "x" } }), { status: "booked" });
  assert.equal(V.isBookSuccess(V.toBooked(200, BOOKED)), true);
  assert.equal(V.isBookSuccess({ status: "already" }), true);
});

test("toBooked: ⚠️ WHEN IN DOUBT, 'unknown' — a timeout or 5xx may have spent the credit", () => {
  assert.deepEqual(V.toBooked(0, null), { status: "unknown" });
  assert.deepEqual(V.toBooked(500, { status: "unknown" }), { status: "unknown" });
  assert.deepEqual(V.toBooked(502, null), { status: "unknown" });
  assert.deepEqual(V.toBooked(504, null), { status: "unknown" });
  assert.deepEqual(V.toBooked(200, { status: "weird" }), { status: "unknown" });
  assert.deepEqual(V.toBooked(409, { status: "weird" }), { status: "unknown" });
});

test("toBooked: the platform's refusals, each to its own status", () => {
  assert.deepEqual(V.toBooked(409, { status: "not_enough_credits", need: 2, creditsLeft: 1 }), {
    status: "not_enough_credits",
    refusal: { reason: "not_enough_credits", need: 2, sports: [], maxCredits: null, creditsLeft: 1, creditsTotal: null, lo: null, hi: null },
  });
  assert.deepEqual(V.toBooked(409, { status: "taken", message: "That time was just taken." }), { status: "taken" });
  for (const s of ["started", "no_rate", "club_closed_hours", "credits_changed", "terms_changed"]) {
    assert.deepEqual(V.toBooked(409, { status: s }), { status: s }, s);
  }
  for (const s of ["changed", "terms_required", "terms_changed", "bad_phone"]) {
    assert.deepEqual(V.toBooked(400, { status: s }), { status: s }, s);
    assert.deepEqual(V.toBooked(400, { error: s }), { status: s }, s);
  }
  assert.deepEqual(V.toBooked(400, { error: "bad_request" }), { status: "try_again" });
  assert.deepEqual(V.toBooked(401, { error: "signed_out" }), { status: "signed_out" });
  assert.deepEqual(V.toBooked(403, { error: "forbidden" }), { status: "try_again" });
  assert.deepEqual(V.toBooked(404, { error: "not_available" }), { status: "off" });
  assert.deepEqual(V.toBooked(429, {}), { status: "slow_down" });
  assert.deepEqual(V.toBooked(503, { status: "busy" }), { status: "try_again" });
  assert.deepEqual(V.toBooked(503, { error: "try_again" }), { status: "try_again" });
});

test("fromSiteBook: this site's 200 carries the view; its 4xx refused before anything; the rest unknown", () => {
  assert.deepEqual(V.fromSiteBook(200, { ...BOOKED, token: TOKEN }), BOOKED);
  const refusal = V.toBooked(409, { status: "expired", hi: "2026-11-29" });
  assert.deepEqual(V.fromSiteBook(200, refusal), refusal);
  assert.deepEqual(V.fromSiteBook(200, { status: "made_up" }), { status: "unknown" });
  assert.deepEqual(V.fromSiteBook(403, { error: "forbidden" }), { status: "try_again" });
  assert.deepEqual(V.fromSiteBook(400, { error: "bad_request" }), { status: "try_again" });
  assert.deepEqual(V.fromSiteBook(429, { error: "slow_down" }), { status: "slow_down" });
  assert.deepEqual(V.fromSiteBook(0, null), { status: "unknown" });
  assert.deepEqual(V.fromSiteBook(504, null), { status: "unknown" });
});

/* ── buying: offers and the purchase ───────────────────────────────────── */

const OFFER = { sportId: SPORT, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500 };
const OFFERS = {
  offers: [{ ...OFFER, offerId: UUID, location_id: UUID }],
  terms: { version: "cp-2026-10-20-1", title: "Exton Sports — 5-pack terms",
    sections: [{ heading: "One sport", body: "A pack covers one sport.", links: [{ label: "x", href: "javascript:alert(1)" }] }] },
  windowDays: 60,
  unusedMonths: 12,
};

test("toOffers: the offers, the terms and the two numbers, with exactly their allowed keys", () => {
  const v = V.toOffers(OFFERS);
  assert.deepEqual(v.offers, [OFFER]);
  assert.deepEqual(v.terms, { version: "cp-2026-10-20-1", title: "Exton Sports — 5-pack terms", sections: [{ heading: "One sport", body: "A pack covers one sport." }] });
  assert.deepEqual([v.windowDays, v.unusedMonths], [60, 12]);
  assert.equal(JSON.stringify(v).includes("javascript:"), false);
});

test("toOffers: a bad offer is dropped; a bad top level is null", () => {
  for (const b of [{ sportId: "x" }, { credits: 0 }, { priceCents: 20001 }, { perHourCents: 4500 }, { cardPeakCents: "45" }, { name: "" }]) {
    assert.deepEqual(V.toOffers({ ...OFFERS, offers: [{ ...OFFER, ...b }] }).offers, [], JSON.stringify(b));
  }
  assert.deepEqual(V.toOffers({ ...OFFERS, offers: [{ ...OFFER, cardStandardCents: null, cardPeakCents: undefined }] }).offers[0].cardPeakCents, null);
  for (const b of [null, { ...OFFERS, offers: "x" }, { ...OFFERS, terms: null }, { ...OFFERS, terms: { ...OFFERS.terms, version: "" } },
    { ...OFFERS, windowDays: 2 }, { ...OFFERS, unusedMonths: 0 }]) {
    assert.equal(V.toOffers(b), null, JSON.stringify(b)?.slice(0, 60));
  }
});

test("toPurchase: state and four display fields — no pack id, no unmasked address", () => {
  const v = V.toPurchase({ state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com", packId: UUID, email: "real@person.com" });
  assert.deepEqual(v, { state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com" });
  assert.equal(V.toPurchase({ state: "active", maskedEmail: "real@person.com" }).maskedEmail, null);
  assert.deepEqual(V.toPurchase({ state: "unknown" }), { state: "unknown", sport: null, credits: null, priceCents: null, maskedEmail: null });
  assert.equal(V.toPurchase({ state: "paid" }), null);
  assert.equal(V.toPurchase(null), null);
});

/* ── the relays (no call leaves this machine) ──────────────────────────── */

const SECRET = "s".repeat(20) + "+/=" + "Z".repeat(20);
const IP = "203.0.113.7";
const KEY = "k".repeat(22);
const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0";

function stubFetch(respond) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, headers: new Headers(init.headers), method: init.method ?? "GET" });
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

const BOOK_INPUT = { sel: SEL, requestKey: KEY, agreeTerms: true, termsVersion: "2026-10-13-3", expectCredits: 2 };

async function callAllPack(ip = IP) {
  return {
    offers: await P.packOffers(ip),
    checkout: await P.packCheckout({ sportId: SPORT, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" }, ip),
    purchase: await P.packPurchase("cs_test_a1B2c3", ip),
    quote: await P.packQuote(SEL, ip, TOKEN),
    book: await P.packBook(BOOK_INPUT, TOKEN, ip),
  };
}

test("pack relays, relay secret unset or bad: NO call is made, and every answer is 'platform down'", async () => {
  for (const v of [undefined, "", "x".repeat(31)]) {
    const f = stubFetch(() => reply(200, {}));
    try {
      const r = await withSecret(v, () => callAllPack());
      assert.equal(f.calls.length, 0, JSON.stringify(v));
      assert.deepEqual(r, {
        offers: { kind: "unavailable" },
        checkout: { ok: false, error: "try_again" },
        purchase: { kind: "unavailable" },
        quote: { kind: "unavailable" },
        book: { status: "try_again" },
      });
    } finally {
      f.restore();
    }
  }
});

test("pack relays with the secret: paths, bodies, the secret and IP on each — the bearer only on quote and book", async () => {
  const f = stubFetch((url) => {
    if (url.includes("/court-packs/offers")) return reply(200, OFFERS);
    if (url.endsWith("/court-packs/checkout")) return reply(200, { url: STRIPE_URL });
    if (url.endsWith("/court-packs/purchase")) return reply(200, { state: "pending" });
    if (url.endsWith("/guest-packs/quote")) return reply(200, QUOTE_MATCH);
    if (url.endsWith("/guest-packs/book")) return reply(200, BOOKED);
    return reply(500, {});
  });
  try {
    const r = await withSecret(SECRET, () => callAllPack());
    assert.equal(r.offers.kind, "ok");
    assert.deepEqual(r.checkout, { ok: true, url: STRIPE_URL });
    assert.equal(r.purchase.view.state, "pending");
    assert.equal(r.quote.view.session, "match");
    assert.equal(r.book.status, "booked");
    assert.deepEqual(f.calls.map((c) => `${c.method} ${c.url.replace("https://platform.test", "")}`), [
      "GET /api/public/court-packs/offers?club=exton-sports",
      "POST /api/public/court-packs/checkout",
      "POST /api/public/court-packs/purchase",
      "POST /api/public/guest-packs/quote",
      "POST /api/public/guest-packs/book",
    ]);
    for (const c of f.calls) {
      assert.equal(c.headers.get(P.RELAY_SECRET_HEADER), SECRET, c.url);
      assert.equal(c.headers.get(P.CLIENT_IP_HEADER), IP, c.url);
      assert.equal(c.headers.get("cookie"), null);
      assert.equal(c.init.cache, "no-store");
      assert.equal(String(c.init.body ?? "").includes(SECRET), false);
      assert.equal(String(c.init.body ?? "").includes(IP), false);
      assert.equal(String(c.init.body ?? "").includes(TOKEN), false);
    }
    const body = (i) => JSON.parse(f.calls[i].init.body);
    assert.deepEqual(body(1), { club: "exton-sports", sportId: SPORT, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" });
    assert.deepEqual(body(2), { club: "exton-sports", sessionId: "cs_test_a1B2c3" });
    assert.deepEqual(body(3), { club: "exton-sports", scope: "guest_court_bookings", sel: SEL });
    assert.deepEqual(body(4), { club: "exton-sports", scope: "guest_court_bookings", sel: SEL, requestKey: KEY, agreeTerms: true, termsVersion: "2026-10-13-3", expectCredits: 2 });
    const bearer = f.calls.filter((c) => c.headers.get("authorization") === `Bearer ${TOKEN}`).map((c) => c.url.replace("https://platform.test", ""));
    assert.deepEqual(bearer, ["/api/public/guest-packs/quote", "/api/public/guest-packs/book"]);
  } finally {
    f.restore();
  }
});

test("packOffers: the desk variant asks for ?desk=1; a 404 is 'off'; a bad body is 'unavailable'", async () => {
  const f = stubFetch(() => reply(200, OFFERS));
  try {
    await withSecret(SECRET, () => P.packOffers(IP, { desk: true }));
    assert.equal(f.calls[0].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports&desk=1");
  } finally {
    f.restore();
  }
  const one = async (status, body) => {
    const g = stubFetch(() => (status === "throw" ? Promise.reject(new TypeError("fetch failed")) : reply(status, body)));
    try {
      return await withSecret(SECRET, () => P.packOffers(IP));
    } finally {
      g.restore();
    }
  };
  assert.deepEqual(await one(404, { error: "not_available" }), { kind: "off" });
  assert.deepEqual(await one(200, { offers: "x" }), { kind: "unavailable" });
  assert.deepEqual(await one(503, {}), { kind: "unavailable" });
  assert.deepEqual(await one("throw"), { kind: "unavailable" });
});

/** One platform answer through one relay, with the secret set. */
async function answer(fn, status, body) {
  const f = stubFetch(() => (status === "throw" ? Promise.reject(new TypeError("fetch failed")) : reply(status, body)));
  try {
    return { r: await withSecret(SECRET, fn), calls: f.calls.length };
  } finally {
    f.restore();
  }
}

test("packCheckout: ONLY an https checkout.stripe.com URL is followed; each refusal to its own answer", async () => {
  const buy = () => P.packCheckout({ sportId: SPORT, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" }, IP);
  for (const url of ["https://evil.example/pay", "http://checkout.stripe.com/c/pay/x", "javascript:alert(1)",
    "https://checkout.stripe.com.evil.example/x", "https://u:p@checkout.stripe.com/x", 42, undefined]) {
    assert.deepEqual((await answer(buy, 200, { url })).r, { ok: false, error: "try_again" }, String(url));
  }
  assert.deepEqual((await answer(buy, 200, { url: STRIPE_URL })).r, { ok: true, url: STRIPE_URL });
  for (const [status, error, want] of [
    [400, "bad_email", "bad_email"], [400, "terms_required", "terms_required"], [400, "bad_sport", "bad_sport"],
    [409, "terms_changed", "terms_changed"], [409, "club_not_payable", "club_not_payable"], [400, "bad_request", "try_again"],
    [404, "not_available", "off"], [429, "rate_limited", "slow_down"], [503, "try_again", "try_again"], [403, "forbidden", "try_again"],
  ]) {
    assert.deepEqual((await answer(buy, status, { error })).r, { ok: false, error: want }, `${status} ${error}`);
  }
  assert.deepEqual((await answer(buy, "throw")).r, { ok: false, error: "try_again" });
});

test("packPurchase: a malformed session id is never sent; anything but a clean 200 is 'unavailable'", async () => {
  for (const id of ["", "pi_123", "cs_test_../x", "cs_test_" + "a".repeat(300)]) {
    const a = await answer(() => P.packPurchase(id, IP), 200, { state: "active" });
    assert.equal(a.calls, 0, id);
    assert.deepEqual(a.r, { kind: "unavailable" }, id);
  }
  assert.deepEqual((await answer(() => P.packPurchase("cs_live_abc", IP), 404, { error: "not_available" })).r, { kind: "unavailable" });
  assert.deepEqual((await answer(() => P.packPurchase("cs_live_abc", IP), 200, { state: "weird" })).r, { kind: "unavailable" });
});

test("packQuote: no device token, or a malformed one, sends no bearer; 404 is 'off'; a bad body 'unavailable'", async () => {
  for (const t of [undefined, null, "short"]) {
    const f = stubFetch(() => reply(200, QUOTE_NONE));
    try {
      const r = await withSecret(SECRET, () => P.packQuote(SEL, IP, t));
      assert.equal(r.kind, "ok");
      assert.equal(f.calls[0].headers.get("authorization"), null, String(t));
    } finally {
      f.restore();
    }
  }
  const quote = () => P.packQuote(SEL, IP, TOKEN);
  assert.deepEqual((await answer(quote, 404, { error: "not_available" })).r, { kind: "off" });
  assert.deepEqual((await answer(quote, 200, { ...QUOTE_MATCH, email: "real@person.com" })).r, { kind: "unavailable" });
  assert.deepEqual((await answer(quote, 503, { error: "try_again" })).r, { kind: "unavailable" });
  assert.deepEqual((await answer(quote, "throw")).r, { kind: "unavailable" });
  const bad = await answer(() => P.packQuote({ ...SEL, hours: 7 }, IP, TOKEN), 200, QUOTE_NONE);
  assert.deepEqual([bad.calls, bad.r], [0, { kind: "unavailable" }]);
});

test("packBook: a malformed key, selection or count is never sent; a timeout is 'unknown', NOT try_again", async () => {
  for (const input of [
    { ...BOOK_INPUT, requestKey: "short" }, { ...BOOK_INPUT, sel: { ...SEL, courts: 9 } },
    { ...BOOK_INPUT, expectCredits: 0 }, { ...BOOK_INPUT, expectCredits: 1.5 }, { ...BOOK_INPUT, termsVersion: "" },
  ]) {
    const a = await answer(() => P.packBook(input, TOKEN, IP), 200, BOOKED);
    assert.deepEqual([a.calls, a.r], [0, { status: "try_again" }], JSON.stringify(input).slice(0, 80));
  }
  const noToken = await answer(() => P.packBook(BOOK_INPUT, "short", IP), 200, BOOKED);
  assert.deepEqual([noToken.calls, noToken.r], [0, { status: "signed_out" }]);
  const book = () => P.packBook(BOOK_INPUT, TOKEN, IP);
  assert.deepEqual((await answer(book, "throw")).r, { status: "unknown" });
  assert.deepEqual((await answer(book, 500, { status: "unknown" })).r, { status: "unknown" });
  assert.deepEqual((await answer(book, 409, { status: "taken" })).r, { status: "taken" });
  // An optional phone rides along only when there is one.
  const f = stubFetch(() => reply(200, BOOKED));
  try {
    await withSecret(SECRET, () => P.packBook({ ...BOOK_INPUT, phone: "484-555-0100" }, TOKEN, IP));
    assert.equal(JSON.parse(f.calls[0].init.body).phone, "484-555-0100");
  } finally {
    f.restore();
  }
});

/* ── copy ──────────────────────────────────────────────────────────────── */

test("COPY.sent covers a 5-pack and stays conditional", () => {
  assert.match(C.COPY.sent, /^If this email has bookings or a 5-pack with us, we've sent a link and a 6‑digit code\./);
  assert.match(C.COPY.sent, /Any link or code from us that hasn.t expired still works\./);
});

test("⛔ nothing shown before sign-in says whether an address has a pack", () => {
  const before = [...Object.values(C.PACK_SIGNIN), C.COPY.sent, C.slotSummary(V.toQuote(QUOTE_NONE, SEL).slot)];
  assert.ok(before.length >= 6);
  for (const s of before) {
    assert.equal(typeof s, "string");
    assert.doesNotMatch(s, /\byou (?:have|don.t have|do not have)\b|there.s no|\bno (?:5-)?pack\b|your (?:5-)?pack (?:has|is)\b/i, s);
  }
  assert.match(C.PACK_SIGNIN.sent, /^If this email has a 5-pack or bookings with us, we've sent a 6‑digit code\./);
});

test("slotSummary and the savings line: the summary box, and savings only when positive", () => {
  const slot = V.toQuote(QUOTE_NONE, SEL).slot;
  assert.equal(C.slotSummary(slot), "2 badminton courts, 6:00 PM–7:00 PM, Sun, Oct 25 · 2 credits · By card $90.00");
  assert.equal(C.slotSummary({ ...slot, courts: 1, credits: 1, cardTotalCents: 4500 }), "1 badminton court, 6:00 PM–7:00 PM, Sun, Oct 25 · 1 credit · By card $45.00");
  assert.equal(C.savesLine({ ...slot, courts: 1, credits: 1, cardTotalCents: 4500, savesCents: 500 }), "This hour is $45.00 by card — your pack saves you $5.00.");
  assert.equal(C.savesLine(slot), "This booking is $90.00 by card — your pack saves you $10.00.");
  assert.equal(C.savesLine({ ...slot, savesCents: 0 }), null);
  assert.equal(C.savesLine({ ...slot, savesCents: -500 }), null);
  assert.equal(C.bookButton(1), "Book · use 1 credit");
  assert.equal(C.bookButton(2), "Book · use 2 credits");
});

test("refusalText: one sentence per reason, after sign-in only", () => {
  const ctx = { sport: "Badminton", unit: "court", need: 2, email: "a•••@example.com", phone: "484-252-2523", date: "2026-12-02", today: "2026-10-21" };
  const r = (reason, extra = {}) => C.refusalText({ reason, need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null, ...extra }, ctx);
  assert.equal(r("no_pack"), "There's no 5-pack on a•••@example.com.");
  assert.equal(r("wrong_sport", { sports: ["Squash"] }), "Your 5-pack is for squash, and this is a badminton court. A pack covers one sport.");
  assert.equal(r("too_many_credits", { maxCredits: 5 }), "This booking needs 2 credits and a pack has 5. Book fewer courts or hours, or pay by card.");
  assert.equal(r("not_enough_credits", { creditsLeft: 1 }), "This booking needs 2 credits and your badminton pack has 1 left. Book 1 court for 1 hour, or pay by card.");
  assert.equal(r("outside_window", { lo: "2026-10-21", hi: "2026-11-29" }), "Your badminton pack is valid until Nov 29, and this booking is on Dec 2.");
  assert.equal(r("outside_window", { lo: "2026-11-10", hi: "2026-12-24" }), "Your badminton pack can be used from Nov 10 to Dec 24, and this booking is on Dec 2.");
  assert.equal(r("expired", { hi: "2026-11-29" }), "Your badminton 5-pack expired on Nov 29.");
  assert.equal(r("used_up", { creditsTotal: 5 }), "All 5 credits on your badminton pack are used.");
  assert.equal(r("all_booked", { creditsTotal: 5 }), "All 5 credits on your badminton pack are booked.");
  assert.equal(r("closed"), "This pack can't be used for new bookings. Questions? Call 484-252-2523.");
});

test("bookMessage: unknown says check My bookings; try_again says nothing has changed", () => {
  assert.equal(C.bookMessage({ status: "unknown" }, "484-252-2523"), "We couldn't confirm that. Reload My bookings in a minute to check.");
  assert.match(C.bookMessage({ status: "try_again" }, "484-252-2523"), /nothing has changed/);
  assert.match(C.bookMessage({ status: "taken" }, "484-252-2523"), /just taken — pick another time/);
  for (const s of ["taken", "started", "no_rate", "club_closed_hours", "changed", "credits_changed", "terms_required",
    "terms_changed", "bad_phone", "signed_out", "off", "slow_down", "try_again", "unknown"]) {
    assert.doesNotMatch(C.bookMessage({ status: s }, "484-252-2523"), /^You're booked/, s);
  }
});

test("the pack cancel sheet and cancelled rows read in the plural for several courts or credits", () => {
  // S3's ask (integration, 2026-10-21): "You get back 4 credits. The court goes back…" was
  // singular whatever the booking.
  assert.equal(C.packConfirmText(1, "Nov 29"),
    "Cancel this booking? You get back 1 credit. The court goes back on sale straight away. Your credit keeps your pack's date: valid until Nov 29.");
  assert.equal(C.packConfirmText(4, "Nov 29", 2),
    "Cancel this booking? You get back 4 credits. The courts go back on sale straight away. Your credits keep your pack's date: valid until Nov 29.");
  // One court for two hours: one court, two credits.
  assert.equal(C.packConfirmText(2, null, 1),
    "Cancel this booking? You get back 2 credits. The court goes back on sale straight away.");
  // Cricket is lanes.
  assert.equal(C.packConfirmText(3, null, 3, "lane"),
    "Cancel this booking? You get back 3 credits. The lanes go back on sale straight away.");
  assert.equal(C.rowPackCancelled("you", 1), "Cancelled · credit returned");
  assert.equal(C.rowPackCancelled("you", 4), "Cancelled · credits returned");
  assert.equal(C.rowPackCancelled("club", 1), "Cancelled by the club — credit returned");
  assert.equal(C.rowPackCancelled("club", 2), "Cancelled by the club — credits returned");
  assert.equal(C.rowPackCancelled(null, null), "Cancelled · credit returned");
  assert.equal(C.cancelMessage({ status: "already_cancelled", paidWith: "pack", creditsReturned: 2 }),
    "Already cancelled. The credits are back on your pack.");
  assert.equal(C.cancelMessage({ status: "already_cancelled", paidWith: "pack" }),
    "Already cancelled. The credit is back on your pack.");
  for (const s of [C.packConfirmText(4, "Nov 29", 2), C.rowPackCancelled("club", 2)]) assert.doesNotMatch(s, /\$|refund|card/i);
});

test("copy.ts holds the sentences the pack pages had kept in their own files (S2, S3/S4; integration)", () => {
  // The no-buy-link line is its own sentence, not a regex trim of the linked one.
  assert.equal(C.PACK_SIGNIN.nothingArrivingNoBuy, "Nothing arriving? Check the address.");
  assert.match(C.PACK_SIGNIN.nothingArriving, /^Nothing arriving\? Check the address, or$/);
  assert.equal(C.PACK_SIGNIN.sendNewCode, "Send a new code");
  assert.equal(C.PACK_SIGNIN.openLead, "Tap to carry on with your booking on this device.");
  assert.equal(C.PACK_BUY_COPY.termsUnavailable("484-252-2523"),
    "We can't show the 5-pack terms right now. Try again in a minute, or call 484-252-2523.");
  assert.ok(C.PACK_BUY_COPY.termsUnavailable().endsWith(`call ${C.FALLBACK_PHONE}.`));
  // …and the components no longer carry their own copies.
  for (const [f, gone] of [
    ["app/my-bookings/_components/RequestPanel.tsx", /PACK_SEND_NEW|"Send a new code"|\.replace\(\/, or\$\//],
    ["app/my-bookings/_components/OpenButton.tsx", /PACK_OPEN_LEAD|Tap to carry on/],
    ["app/5-pack/terms/page.tsx", /const termsUnavailable|We can't show the 5-pack terms/],
  ]) {
    assert.doesNotMatch(code(read(f)), gone, f);
  }
  assert.match(code(read("app/my-bookings/_components/RequestPanel.tsx")), /PACK_SIGNIN\.nothingArrivingNoBuy/);
  assert.match(code(read("app/my-bookings/_components/RequestPanel.tsx")), /PACK_SIGNIN\.sendNewCode/);
  assert.match(code(read("app/my-bookings/_components/OpenButton.tsx")), /PACK_SIGNIN\.openLead/);
  assert.match(code(read("app/5-pack/terms/page.tsx")), /PACK_BUY_COPY\.termsUnavailable\(FALLBACK_PHONE\)/);
});

test("dayText: a club-local calendar date, never shifted by the server's zone", () => {
  assert.equal(C.dayText("2026-11-29"), "Nov 29");
  assert.equal(C.dayText("2027-10-20", true), "Oct 20, 2027");
  assert.equal(C.dayText("2026-02-30"), null);
  assert.equal(C.dayText(null), null);
});
