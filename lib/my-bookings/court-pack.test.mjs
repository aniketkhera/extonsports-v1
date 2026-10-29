/* The court pack's contracts on extonsports.com, 2026-10-21 (S1, the foundation).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court pack; design
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
  // 2026-10-22, the rename to "court packs" (Aniket): these MUST equal orangish-app
  // lib/court-pack-rules.ts CP_PACK_PATHS.buy and .terms.
  assert.equal(B.PACK_PATH, "/court-packs");
  assert.equal(B.PACK_TERMS_PATH, "/court-packs/terms");
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

test("packBuyUrl: the buy page only for a sport the live offers sell — never for squash, never without a list (2026-10-22)", () => {
  // Aniket, 2026-10-22: squash packs are no longer sold; squash courts remain, so a squash
  // slot can still reach the pack page, which must not offer "Buy a squash court pack".
  const CRICKET = "4b0c1d1b-3333-4c2b-9e1f-0a1b2c3d4e5f";
  const SQUASH = "3dda7884-2222-4c2b-9e1f-0a1b2c3d4e5f";
  const sale = [
    { sportId: SPORT, credits: 5 }, { sportId: SPORT, credits: 10 },
    { sportId: CRICKET, credits: 5 }, { sportId: CRICKET, credits: 10 },
  ];
  assert.equal(B.packBuyUrl(SPORT, sale), `/court-packs?sport=${SPORT}`);
  assert.equal(B.packBuyUrl(CRICKET, sale, 10), `/court-packs?sport=${CRICKET}&credits=10`);
  // A size that sport does not sell is not carried; the page picks its smallest.
  assert.equal(B.packBuyUrl(CRICKET, sale, 7), `/court-packs?sport=${CRICKET}`);
  assert.equal(B.packBuyUrl(SQUASH, sale), null);
  assert.equal(B.packBuyUrl(SPORT, null), null); // the offers are down or off: no link
  assert.equal(B.packBuyUrl(SPORT, []), null);
  assert.equal(B.packBuyUrl("../../x", [{ sportId: "../../x", credits: 5 }]), null);
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

/* ── the cancel answer's closed pack and first-game-by date (2026-10-21) ──────────
   orangish-app review F5 and R8 (lib/court-pack-cancel.ts answer()): a pack that was
   refunded or disputed is CLOSED — the booking is cancelled but there is no credit to use,
   so the page must never say "Credit is back" (pack.closed, with validUntilText null); a
   pack whose 60 days have not started has a date to play a first game BY, not a "valid
   until" (pack.firstGameByText, with validUntilText null). Both additive; the platform
   sends closed:false / firstGameByText:null otherwise. */

const PACK_CLOSED = {
  ...PACK_CANCEL,
  pack: { name: "Badminton 5-pack", creditsLeft: 5, creditsTotal: 5, validUntilText: null, closed: true, firstGameByText: null },
};
const PACK_NOT_STARTED = {
  ...PACK_CANCEL,
  pack: { name: "Badminton 5-pack", creditsLeft: 5, creditsTotal: 5, validUntilText: null, closed: false, firstGameByText: "Oct 21, 2027" },
};

test("toCancelView keeps pack.closed (only when true) and pack.firstGameByText; the platform's defaults read as before", () => {
  assert.deepEqual(V.toCancelView(200, PACK_CLOSED), {
    status: "cancelled", paidWith: "pack", creditsReturned: 1,
    pack: { name: "Badminton 5-pack", creditsLeft: 5, creditsTotal: 5, validUntilText: null, closed: true },
  });
  assert.deepEqual(V.toCancelView(200, PACK_NOT_STARTED), {
    status: "cancelled", paidWith: "pack", creditsReturned: 1,
    pack: { name: "Badminton 5-pack", creditsLeft: 5, creditsTotal: 5, validUntilText: null, firstGameByText: "Oct 21, 2027" },
  });
  // A started pack, as the platform answers it today (closed false, no first-game date): the
  // same view as before these keys existed.
  assert.deepEqual(
    V.toCancelView(200, { ...PACK_CANCEL, pack: { ...PACK_CANCEL.pack, closed: false, firstGameByText: null } }),
    PACK_CANCEL_VIEW,
  );
  // The site's own relay passes them through the same allow-list.
  assert.deepEqual(V.fromSiteCancel(200, V.toCancelView(200, PACK_CLOSED)), V.toCancelView(200, PACK_CLOSED));
  assert.deepEqual(V.fromSiteCancel(200, V.toCancelView(200, PACK_NOT_STARTED)), V.toCancelView(200, PACK_NOT_STARTED));
});

test("a malformed closed or firstGameByText drops the pack block, as any bad pack field does", () => {
  const dropped = { status: "cancelled", paidWith: "pack", creditsReturned: 1 };
  for (const bad of [
    { closed: "true" },
    { closed: 1 },
    { firstGameByText: 42 },
    { firstGameByText: "x".repeat(81) },
    { firstGameByText: "" },
  ]) {
    assert.deepEqual(V.toCancelView(200, { ...PACK_CANCEL, pack: { ...PACK_CANCEL.pack, ...bad } }), dropped, JSON.stringify(bad));
  }
});

test("cancelMessage: a CLOSED pack never says the credit is back", () => {
  const m = C.cancelMessage(V.toCancelView(200, PACK_CLOSED));
  assert.equal(m, "Cancelled. Your Badminton 5-pack is closed, so there's no credit to use.");
  assert.doesNotMatch(m, /credits? (is|are) back|left|valid until|\$|refund/i);
  assert.equal(
    C.cancelMessage(V.toCancelView(200, { ...PACK_CLOSED, status: "already_cancelled" })),
    "Already cancelled. Your Badminton 5-pack is closed, so there's no credit to use.",
  );
  // Closed wins over a first-game date, should both ever arrive.
  assert.match(
    C.cancelMessage(V.toCancelView(200, { ...PACK_CLOSED, pack: { ...PACK_CLOSED.pack, firstGameByText: "Oct 21, 2027" } })),
    /is closed, so there's no credit to use\.$/,
  );
});

test("cancelMessage: a pack whose 60 days have not started says when to play a first game by, never 'valid until'", () => {
  const m = C.cancelMessage(V.toCancelView(200, PACK_NOT_STARTED));
  assert.equal(m, "Cancelled. Credit is back. Badminton 5-pack 5 of 5 left · play your first game by Oct 21, 2027.");
  assert.doesNotMatch(m, /valid until/);
  const two = C.cancelMessage(V.toCancelView(200, { ...PACK_NOT_STARTED, creditsReturned: 2 }));
  assert.match(two, /^Cancelled\. Credits are back\. /);
});

/* ── the quote ─────────────────────────────────────────────────────────── */

const SLOT = {
  sport: "Badminton",
  sportId: SPORT,
  unit: "court",
  courts: 2,
  hours: 1,
  // What the platform sends (orangish-app packWhenText) — review UI-5: the fixtures used the
  // design's wording, so no test ever saw the real string inside the summary box.
  whenText: "Sun, Oct 25 · 6:00–7:00 PM",
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
    maxDays: null,
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
  // `clock` since review UI-7: null when the platform sends none.
  assert.deepEqual(v, { ...BOOKED, pack: { ...BOOKED.pack, clock: null } });
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
    refusal: { reason: "not_enough_credits", need: 2, sports: [], maxCredits: null, creditsLeft: 1, creditsTotal: null, lo: null, hi: null, maxDays: null },
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
  assert.deepEqual(V.fromSiteBook(200, { ...BOOKED, token: TOKEN }), { ...BOOKED, pack: { ...BOOKED.pack, clock: null } });
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

// 2026-10-22 (Aniket): two sizes per sport, badminton and cricket only, each offer with its
// own window — the platform's offers answer has no top-level windowDays/unusedMonths now.
const CRICKET_ID = "4b0c1d1b-3333-4c2b-9e1f-0a1b2c3d4e5f";
const OFFER = { sportId: SPORT, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 60, unusedMonths: 12 };
const OFFER_10 = { ...OFFER, name: "Badminton 10-pack", credits: 10, priceCents: 35000, perHourCents: 3500, windowDays: 120 };
const CRICKET_5 = { sportId: CRICKET_ID, sport: "Cricket", name: "Cricket 5-pack", credits: 5, priceCents: 27500, perHourCents: 5500, cardStandardCents: 5500, cardPeakCents: 6500, windowDays: 60, unusedMonths: 12 };
const CRICKET_10 = { ...CRICKET_5, name: "Cricket 10-pack", credits: 10, priceCents: 50000, perHourCents: 5000, windowDays: 120 };
const OFFERS = {
  offers: [{ ...OFFER, offerId: UUID, location_id: UUID }],
  terms: { version: "cp-2026-10-20-1", title: "Exton Sports — court pack terms",
    sections: [{ heading: "One sport", body: "A pack covers one sport.", links: [{ label: "x", href: "javascript:alert(1)" }] }] },
};

test("toOffers: the offers, each with its own window, and the terms — with exactly their allowed keys", () => {
  const v = V.toOffers(OFFERS);
  assert.deepEqual(v.offers, [OFFER]);
  assert.deepEqual(v.terms, { version: "cp-2026-10-20-1", title: "Exton Sports — court pack terms", sections: [{ heading: "One sport", body: "A pack covers one sport." }] });
  // No page-wide window any more: it was the MIN over every offer, and read "60 days" for a 10-pack.
  assert.deepEqual(Object.keys(v).sort(), ["offers", "terms"]);
  assert.equal(JSON.stringify(v).includes("javascript:"), false);
});

test("toOffers: both sizes of both sports, sizes ascending within each sport, each its own window (2026-10-22)", () => {
  const v = V.toOffers({ ...OFFERS, offers: [CRICKET_10, OFFER_10, CRICKET_5, OFFER] });
  // The platform's sport order (cricket first here), each sport's sizes 5 then 10.
  assert.deepEqual(v.offers.map((o) => `${o.sport} ${o.credits} ${o.windowDays}d ${o.priceCents}`), [
    "Cricket 5 60d 27500", "Cricket 10 120d 50000", "Badminton 5 60d 20000", "Badminton 10 120d 35000",
  ]);
  for (const o of v.offers) assert.equal(o.unusedMonths, 12);
  // A repeated (sport, size) — impossible under the platform's unique key — shows neither copy.
  const dup = V.toOffers({ ...OFFERS, offers: [OFFER, { ...OFFER, priceCents: 15000, perHourCents: 3000 }, OFFER_10] });
  assert.deepEqual(dup.offers.map((o) => o.credits), [10]);
});

test("toOffers: a bad offer is dropped; a bad top level is null", () => {
  for (const b of [{ sportId: "x" }, { credits: 0 }, { priceCents: 20001 }, { perHourCents: 4500 }, { cardPeakCents: "45" }, { name: "" },
    { windowDays: 6 }, { windowDays: 367 }, { windowDays: "120" }, { unusedMonths: 0 }, { unusedMonths: 25 }]) {
    assert.deepEqual(V.toOffers({ ...OFFERS, offers: [{ ...OFFER, ...b }] }).offers, [], JSON.stringify(b));
  }
  assert.deepEqual(V.toOffers({ ...OFFERS, offers: [{ ...OFFER, cardStandardCents: null, cardPeakCents: undefined }] }).offers[0].cardPeakCents, null);
  for (const b of [null, { ...OFFERS, offers: "x" }, { ...OFFERS, terms: null }, { ...OFFERS, terms: { ...OFFERS.terms, version: "" } }]) {
    assert.equal(V.toOffers(b), null, JSON.stringify(b)?.slice(0, 60));
  }
});

test("toOffers: an offer with no window of its own takes the old top-level pair, and only then (a site deployed ahead of the app)", () => {
  const bare = { ...OFFER };
  delete bare.windowDays;
  delete bare.unusedMonths;
  // The pre-2026-10-22 answer: one size per sport, the window at the top level.
  const old = V.toOffers({ ...OFFERS, offers: [bare], windowDays: 60, unusedMonths: 12 });
  assert.deepEqual(old.offers, [OFFER]);
  // Neither its own nor a top-level window: dropped, never shown with a guessed one.
  assert.deepEqual(V.toOffers({ ...OFFERS, offers: [bare] }).offers, []);
  assert.deepEqual(V.toOffers({ ...OFFERS, offers: [bare], windowDays: 2, unusedMonths: 12 }).offers, []);
  // An offer's own window always wins over the top level.
  assert.equal(V.toOffers({ ...OFFERS, offers: [OFFER_10], windowDays: 60, unusedMonths: 12 }).offers[0].windowDays, 120);
});

test("toPurchase: state and the display fields — no pack id, no unmasked address", () => {
  const v = V.toPurchase({ state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com", sportId: SPORT, name: "Badminton 5-pack", packId: UUID, email: "real@person.com" });
  // 2026-10-29: a pack bought without a coupon says so — both coupon fields null.
  assert.deepEqual(v, {
    state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com", sportId: SPORT,
    name: "Badminton 5-pack", windowDays: null, couponCode: null, listPriceCents: null,
  });
  assert.equal(V.toPurchase({ state: "active", maskedEmail: "real@person.com" }).maskedEmail, null);
  assert.deepEqual(V.toPurchase({ state: "unknown" }), {
    state: "unknown", sport: null, credits: null, priceCents: null, maskedEmail: null, sportId: null, name: null, windowDays: null,
    couponCode: null, listPriceCents: null,
  });
  assert.equal(V.toPurchase({ state: "paid" }), null);
  assert.equal(V.toPurchase(null), null);
});

test("toPurchase: the bought pack's own window when the platform sends it (2026-10-22), in the platform's bounds", () => {
  assert.equal(V.toPurchase({ state: "active", credits: 10, windowDays: 120 }).windowDays, 120);
  for (const bad of [6, 367, "120", 1.5, null, undefined]) {
    assert.equal(V.toPurchase({ state: "active", credits: 10, windowDays: bad }).windowDays, null, String(bad));
  }
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
    checkout: await P.packCheckout({ sportId: SPORT, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" }, ip),
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
    // The size rides beside the sport (2026-10-22): the pair the platform looks its offer up by.
    assert.deepEqual(body(1), { club: "exton-sports", sportId: SPORT, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" });
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
  const buy = () => P.packCheckout({ sportId: SPORT, credits: 5, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" }, IP);
  for (const url of ["https://evil.example/pay", "http://checkout.stripe.com/c/pay/x", "javascript:alert(1)",
    "https://checkout.stripe.com.evil.example/x", "https://u:p@checkout.stripe.com/x", 42, undefined]) {
    assert.deepEqual((await answer(buy, 200, { url })).r, { ok: false, error: "try_again" }, String(url));
  }
  assert.deepEqual((await answer(buy, 200, { url: STRIPE_URL })).r, { ok: true, url: STRIPE_URL });
  for (const [status, error, want] of [
    [400, "bad_email", "bad_email"], [400, "terms_required", "terms_required"], [400, "bad_sport", "bad_sport"],
    // 2026-10-22: the platform's own refusal of a size it does not sell for that sport.
    [400, "bad_size", "bad_size"],
    [409, "terms_changed", "terms_changed"], [409, "club_not_payable", "club_not_payable"], [400, "bad_request", "try_again"],
    [404, "not_available", "off"], [429, "rate_limited", "slow_down"], [503, "try_again", "try_again"], [403, "forbidden", "try_again"],
  ]) {
    assert.deepEqual((await answer(buy, status, { error })).r, { ok: false, error: want }, `${status} ${error}`);
  }
  assert.deepEqual((await answer(buy, "throw")).r, { ok: false, error: "try_again" });
  // A size that is not a whole 1–20 is never sent (2026-10-22).
  for (const credits of [0, 21, 1.5, "10", null, undefined, NaN]) {
    const a = await answer(() => P.packCheckout({ sportId: SPORT, credits, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-1" }, IP), 200, { url: STRIPE_URL });
    assert.deepEqual([a.calls, a.r], [0, { ok: false, error: "bad_size" }], String(credits));
  }
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

test("COPY.sent stays the plain sentence until packs go on sale; sentWithPack names a court pack, still conditional (review R10)", () => {
  // Review R10, 2026-10-21: the site deploys with PACKS_LIVE off and no pack on sale, and the
  // platform's own email names packs only once court_packs_public is on (A5 deviation 1).
  assert.equal(
    C.COPY.sent,
    "If this email has bookings with us, we've sent a link. Any link or code from us that hasn't expired still works. On another device? Enter the 6‑digit code from the email.",
  );
  assert.doesNotMatch(C.COPY.sent, /pack/i);
  assert.match(C.COPY.sentWithPack, /^If this email has bookings or a court pack with us, we've sent a link and a 6‑digit code\./);
  assert.match(C.COPY.sentWithPack, /Any link or code from us that hasn.t expired still works\./);
  // The list's panel picks the pack sentence only behind the switch.
  const panel = code(read("app/my-bookings/_components/RequestPanel.tsx"));
  assert.match(panel, /PACKS_LIVE \? COPY\.sentWithPack : COPY\.sent/);
  assert.equal(panel.split("COPY.sentWithPack").length - 1, 1);
});

test("⛔ nothing shown before sign-in says whether an address has a pack", () => {
  const before = [...Object.values(C.PACK_SIGNIN), C.COPY.sent, C.COPY.sentWithPack, C.slotSummary(V.toQuote(QUOTE_NONE, SEL).slot, SEL)];
  assert.ok(before.length >= 6);
  // 2026-10-22: widened with the rename — "court pack", and either size — so the guard still
  // means something for the new words (left on "5-pack", it would pass whatever they said).
  const REVEALS = /\byou (?:have|don.t have|do not have)\b|there.s no|\bno (?:court |5-|10-)?packs?\b|your (?:court |5-|10-)?packs? (?:has|is|are)\b/i;
  for (const s of before) {
    assert.equal(typeof s, "string");
    assert.doesNotMatch(s, REVEALS, s);
  }
  // The guard catches the sentences it exists for — the after-sign-in ones, in the new words.
  const ctx = { sport: "Badminton", unit: "court", need: 1, email: "a•••@example.com", phone: "484-252-2523", date: "2026-12-02", today: "2026-10-21" };
  const bare = { need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null, maxDays: null };
  assert.match(C.refusalText({ ...bare, reason: "no_pack" }, ctx), REVEALS);
  assert.match(C.refusalText({ ...bare, reason: "wrong_sport", sports: ["Cricket"] }, ctx), REVEALS);
  for (const s of ["no court pack", "No 10-pack here", "your court packs are for cricket", "Your 5-pack is used"]) assert.match(s, REVEALS, s);
  assert.match(C.PACK_SIGNIN.sent, /^If this email has a court pack or bookings with us, we've sent a 6‑digit code\./);
});

test("slotSummary and the savings line: the summary box, and savings only when positive", () => {
  const slot = V.toQuote(QUOTE_NONE, SEL).slot;
  assert.equal(C.slotSummary(slot, SEL), "2 badminton courts, 6:00 PM–7:00 PM, Sun, Oct 25 · 2 credits · By card $90.00");
  assert.equal(C.slotSummary({ ...slot, courts: 1, credits: 1, cardTotalCents: 4500 }, { ...SEL, courts: 1 }), "1 badminton court, 6:00 PM–7:00 PM, Sun, Oct 25 · 1 credit · By card $45.00");
  assert.equal(C.savesLine({ ...slot, courts: 1, credits: 1, cardTotalCents: 4500, savesCents: 500 }), "This hour is $45.00 by card — your pack saves you $5.00.");
  assert.equal(C.savesLine(slot), "This booking is $90.00 by card — your pack saves you $10.00.");
  assert.equal(C.savesLine({ ...slot, savesCents: 0 }), null);
  assert.equal(C.savesLine({ ...slot, savesCents: -500 }), null);
  assert.equal(C.bookButton(1), "Book · use 1 credit");
  assert.equal(C.bookButton(2), "Book · use 2 credits");
});

test("refusalText: one sentence per reason, after sign-in only", () => {
  const ctx = { sport: "Badminton", unit: "court", need: 2, email: "a•••@example.com", phone: "484-252-2523", date: "2026-12-02", today: "2026-10-21" };
  const r = (reason, extra = {}) => C.refusalText({ reason, need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null, maxDays: null, ...extra }, ctx);
  assert.equal(r("no_pack"), "There's no court pack on a•••@example.com.");
  assert.equal(r("wrong_sport", { sports: ["Cricket"] }), "Your court pack is for cricket, and this is a badminton court. A pack covers one sport.");
  assert.equal(r("wrong_sport", { sports: ["Cricket", "Badminton"] }), "Your court packs are for cricket and badminton, and this is a badminton court. A pack covers one sport.");
  // 2026-10-22: the guest's OWN largest pack, in its real size — a 5-pack holder and a
  // 10-pack holder are told different numbers; "a pack has 5" is no longer true of packs.
  assert.equal(r("too_many_credits", { need: 6, maxCredits: 5 }), "This booking needs 6 credits and your largest badminton pack holds 5 credits. Book fewer courts or hours, or pay by card.");
  assert.equal(r("too_many_credits", { need: 12, maxCredits: 10 }), "This booking needs 12 credits and your largest badminton pack holds 10 credits. Book fewer courts or hours, or pay by card.");
  assert.equal(r("too_many_credits", { need: 12 }), "This booking needs 12 credits, more than one badminton pack holds. Book fewer courts or hours, or pay by card.");
  assert.equal(r("not_enough_credits", { creditsLeft: 1 }), "This booking needs 2 credits and your badminton pack has 1 left. Book 1 court for 1 hour, or pay by card.");
  assert.equal(r("outside_window", { lo: "2026-10-21", hi: "2026-11-29" }), "Your badminton pack is valid until Nov 29, and this booking is on Dec 2.");
  assert.equal(r("outside_window", { lo: "2026-11-10", hi: "2026-12-24" }), "Your badminton pack can be used from Nov 10 to Dec 24, and this booking is on Dec 2.");
  assert.equal(r("expired", { hi: "2026-11-29" }), "Your badminton court pack expired on Nov 29.");
  assert.equal(r("expired"), "Your badminton court pack has expired.");
  assert.equal(r("used_up", { creditsTotal: 5 }), "All 5 credits on your badminton pack are used.");
  assert.equal(r("all_booked", { creditsTotal: 5 }), "All 5 credits on your badminton pack are booked.");
  assert.equal(r("closed"), "This pack can't be used for new bookings. Questions? Call 484-252-2523.");
  // 2026-10-22 (Aniket: pack bookings up to 60 days ahead for a 5-pack, 120 for a 10-pack):
  // the platform's maxDays, the furthest the guest's own usable packs reach — as sent.
  assert.equal(r("too_far_ahead", { maxDays: 60 }), "You can book up to 60 days ahead with your court pack. Pick an earlier date.");
  assert.equal(r("too_far_ahead", { maxDays: 120 }), "You can book up to 120 days ahead with your court pack. Pick an earlier date.");
  assert.equal(r("too_far_ahead"), "You can't book that far ahead with your court pack. Pick an earlier date.");
  // Every reason the site knows has its own sentence — none falls through to undefined.
  for (const reason of V.PACK_REFUSALS) assert.equal(typeof r(reason), "string", reason);
});

test("too_far_ahead (2026-10-22): the quote, the book answer and this site's own answer carry maxDays, bounded as a window", () => {
  const q = V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "too_far_ahead", maxDays: 120 } }, SEL);
  assert.deepEqual(q.refusal, {
    reason: "too_far_ahead", need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null,
    maxDays: 120,
  });
  assert.equal(V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "too_far_ahead", maxDays: 60 } }, SEL).refusal.maxDays, 60);
  // A detail that is missing or out of a window's range (play_window_days 7–366) is dropped,
  // never guessed — the refusal itself still stands and its sentence says less.
  for (const bad of [undefined, null, 6, 367, "120", 60.5, -60]) {
    const v = V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "too_far_ahead", maxDays: bad } }, SEL);
    assert.equal(v.refusal.reason, "too_far_ahead", String(bad));
    assert.equal(v.refusal.maxDays, null, String(bad));
  }
  // The SQL's snake_case name is the platform's to translate (refusalFromSql), as max_credits is.
  assert.equal(V.toQuote({ ...QUOTE_MATCH, choice: null, refusal: { reason: "too_far_ahead", max_days: 120 } }, SEL).refusal.maxDays, null);
  assert.deepEqual(V.toBooked(409, { status: "too_far_ahead", maxDays: 60 }).refusal.maxDays, 60);
  assert.equal(V.toBooked(409, { status: "too_far_ahead", maxDays: 60 }).status, "too_far_ahead");
  const site = V.fromSiteBook(200, { status: "too_far_ahead", refusal: { reason: "too_far_ahead", maxDays: 120 } });
  assert.deepEqual([site.status, site.refusal.maxDays], ["too_far_ahead", 120]);
  assert.ok(V.PACK_REFUSALS.includes("too_far_ahead"));
  assert.deepEqual(V.PICK_ANOTHER_REFUSALS, ["too_far_ahead"]);
});

test("expired (2026-10-22): the platform sends the date as validUntil — read it (hi still counts), so 'expired on <date>' keeps its date", () => {
  // orangish-app lib/court-pack-rules.ts PackRefusal: { reason: 'expired'; validUntil }. The
  // site read only `hi`, and the sentence lost its date.
  const ctx = { sport: "Badminton", unit: "court", need: 1, email: "a•••@example.com", phone: "484-252-2523", date: "2026-11-02", today: "2026-10-22", card: true };
  const quoted = (refusal) => V.toQuote({ ...QUOTE_MATCH, choice: null, refusal }, SEL).refusal;
  const q = quoted({ reason: "expired", validUntil: "2026-11-29" });
  assert.equal(q.hi, "2026-11-29");
  assert.equal(C.refusalText(q, ctx), "Your badminton court pack expired on Nov 29.");
  // The book answer (409, details at the top level) and this site's own echo (a PackRefusalView, hi).
  assert.equal(V.toBooked(409, { status: "expired", validUntil: "2026-11-29" }).refusal.hi, "2026-11-29");
  const site = V.fromSiteBook(200, { status: "expired", refusal: { reason: "expired", hi: "2026-11-29" } });
  assert.equal(C.refusalText(site.refusal, ctx), "Your badminton court pack expired on Nov 29.");
  // hi alone (the platform's additive copy), and both: validUntil is the platform's own name.
  assert.equal(quoted({ reason: "expired", hi: "2026-11-29" }).hi, "2026-11-29");
  assert.equal(quoted({ reason: "expired", validUntil: "2026-11-29", hi: "2026-11-29" }).hi, "2026-11-29");
  assert.equal(quoted({ reason: "expired", validUntil: "2026-11-29", hi: "2026-11-28" }).hi, "2026-11-29");
  // A validUntil that is not a date falls back to hi; neither → no date, a shorter true sentence.
  assert.equal(quoted({ reason: "expired", validUntil: "Nov 29", hi: "2026-11-29" }).hi, "2026-11-29");
  const none = quoted({ reason: "expired", validUntil: "2026-02-30" });
  assert.equal(none.hi, null);
  assert.equal(C.refusalText(none, ctx), "Your badminton court pack has expired.");
  // validUntil is read for 'expired' only: outside_window's dates are lo / hi, as before.
  assert.equal(quoted({ reason: "outside_window", lo: "2026-11-10", validUntil: "2026-12-24" }).hi, null);
  assert.equal(quoted({ reason: "outside_window", lo: "2026-11-10", hi: "2026-12-24" }).hi, "2026-12-24");
});

test("bookMessage: unknown says check the bookings page, by its name; try_again says nothing has changed", () => {
  // 2026-10-25 (site review, low): it said "Reload My bookings", but the page is called
  // COPY.title, and "My bookings" is the home page's popup button. Built from COPY.title, so
  // the sentence and PackConfirm's button under it (labelled COPY.title) cannot drift apart.
  assert.equal(C.bookMessage({ status: "unknown" }, "484-252-2523"), "We couldn't confirm that. Open “Manage or cancel a booking” in a minute to check.");
  assert.ok(C.bookMessage({ status: "unknown" }).includes(`“${C.COPY.title}”`));
  assert.equal(C.bookMessage({ status: "unknown" }, "484-252-2523", false), C.bookMessage({ status: "unknown" }), "card or no card");
  assert.doesNotMatch(C.bookMessage({ status: "unknown" }), /My bookings/);
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
    "We can't show the court pack terms right now. Try again in a minute, or call 484-252-2523.");
  assert.ok(C.PACK_BUY_COPY.termsUnavailable().endsWith(`call ${C.FALLBACK_PHONE}.`));
  // …and the components no longer carry their own copies.
  for (const [f, gone] of [
    ["app/my-bookings/_components/RequestPanel.tsx", /PACK_SEND_NEW|"Send a new code"|\.replace\(\/, or\$\//],
    ["app/my-bookings/_components/OpenButton.tsx", /PACK_OPEN_LEAD|Tap to carry on/],
    ["app/court-packs/terms/page.tsx", /const termsUnavailable|We can't show the (?:court pack|5-pack) terms/],
  ]) {
    assert.doesNotMatch(code(read(f)), gone, f);
  }
  assert.match(code(read("app/my-bookings/_components/RequestPanel.tsx")), /PACK_SIGNIN\.nothingArrivingNoBuy/);
  assert.match(code(read("app/my-bookings/_components/RequestPanel.tsx")), /PACK_SIGNIN\.sendNewCode/);
  assert.match(code(read("app/my-bookings/_components/OpenButton.tsx")), /PACK_SIGNIN\.openLead/);
  assert.match(code(read("app/court-packs/terms/page.tsx")), /PACK_BUY_COPY\.termsUnavailable\(FALLBACK_PHONE\)/);
});

/* ── review fixes, 2026-10-21 (the confirmed findings on the integrated branch) ── */

test("the fixed pack sentences count the credits: Yes, the fine print, the cancel-by line, the booked note (review UI-4)", () => {
  assert.equal(C.packConfirmYes(1), "Yes, cancel — return my credit");
  assert.equal(C.packConfirmYes(2), "Yes, cancel — return my credits");
  assert.equal(C.packFinePrint(1), "Cancel up to 24 hours before and the credit comes back.");
  assert.equal(C.packFinePrint(2), "Cancel up to 24 hours before and the credits come back.");
  assert.equal(C.rowPackCancelBy("Sat 24 Oct, 6:00 PM", 1), "Cancel by Sat 24 Oct, 6:00 PM to get the credit back.");
  assert.equal(C.rowPackCancelBy("Sat 24 Oct, 6:00 PM", 2), "Cancel by Sat 24 Oct, 6:00 PM to get the credits back.");
  assert.equal(C.cancelThisNote(1), "(credit back until 24 hours before)");
  assert.equal(C.cancelThisNote(4), "(credits back until 24 hours before)");
  // The old singular constants are gone, so no page can reach for them on a 2-credit row.
  for (const k of ["confirmYes", "finePrint", "cancelThisNote", "bookWithMyPack"]) assert.equal(k in C.PACK_COPY, false, k);
});

test("a cricket pack card books a lane (review UI-10)", () => {
  assert.equal(C.bookWithMyPack("Badminton"), "Book a court with my pack");
  assert.equal(C.bookWithMyPack("Squash"), "Book a court with my pack");
  assert.equal(C.bookWithMyPack("Cricket"), "Book a lane with my pack");
});

test("slotSummary reads as the app's form did one click earlier — built from the parked slot, whatever whenText the platform sends (review UI-5)", () => {
  // What the platform actually sends (orangish-app lib/court-pack-rules.ts packWhenText).
  const slot = { ...V.toQuote(QUOTE_NONE, SEL).slot, whenText: "Sun, Oct 25 · 6:00–7:00 PM" };
  assert.equal(C.slotSummary(slot, SEL), "2 badminton courts, 6:00 PM–7:00 PM, Sun, Oct 25 · 2 credits · By card $90.00");
  assert.equal(C.slotWhenText({ date: "2026-10-25", startTime: "11:00", hours: 2 }), "11:00 AM–1:00 PM, Sun, Oct 25");
  assert.equal(C.slotWhenText({ date: "2026-10-31", startTime: "23:00", hours: 1 }), "11:00 PM–12:00 AM, Sat, Oct 31");
  assert.equal(C.slotWhenText({ date: "2026-11-01", startTime: "00:30", hours: 1 }), "12:30 AM–1:30 AM, Sun, Nov 1");
  assert.equal(C.slotWhenText({ date: "2026-10-25", startTime: "12:00", hours: 3 }), "12:00 PM–3:00 PM, Sun, Oct 25");
  for (const bad of [{ date: "2026-02-30", startTime: "18:00", hours: 1 }, { date: "2026-10-25", startTime: "6pm", hours: 1 }, { date: "2026-10-25", startTime: "18:00", hours: 0 }]) {
    assert.equal(C.slotWhenText(bad), null, JSON.stringify(bad));
  }
  // With no slot to build from, the platform's own words — never a blank.
  assert.equal(C.slotSummary(slot), "2 badminton courts, Sun, Oct 25 · 6:00–7:00 PM · 2 credits · By card $90.00");
});

test("clubInstant: a club-local wall time to its instant, in EDT and EST (review UI-6)", async () => {
  const O = await import("../opening.ts");
  assert.equal(O.clubInstant("2026-10-25", "18:00").toISOString(), "2026-10-25T22:00:00.000Z");
  assert.equal(O.clubInstant("2026-11-08", "18:00").toISOString(), "2026-11-08T23:00:00.000Z");
  assert.equal(O.clubInstant("2026-11-01", "18:00").toISOString(), "2026-11-01T23:00:00.000Z"); // DST ended that morning
  assert.equal(O.clubInstant("2027-03-14", "18:00").toISOString(), "2027-03-14T22:00:00.000Z"); // DST began that morning
  assert.equal(O.clubInstant("2026-10-25", "00:00").toISOString(), "2026-10-25T04:00:00.000Z");
  for (const [d, t] of [["2026-02-30", "18:00"], ["2026-10-25", "24:00"], ["2026-10-25", "6pm"], ["25/10/2026", "18:00"]]) {
    assert.equal(O.clubInstant(d, t), null, `${d} ${t}`);
  }
});

test("startsWithinHours: inside the 24-hour self-cancel cutoff, in real hours — exactly 24 h is inside (review UI-6)", async () => {
  const O = await import("../opening.ts");
  // 2026-10-22 08:00 EDT = 12:00Z.
  assert.equal(O.startsWithinHours("2026-10-22", "08:00", 24, new Date("2026-10-21T15:00:00Z")), true); // 21 h
  assert.equal(O.startsWithinHours("2026-10-22", "08:00", 24, new Date("2026-10-21T12:00:00Z")), true); // exactly 24 h: too late (the platform's rule)
  assert.equal(O.startsWithinHours("2026-10-22", "08:00", 24, new Date("2026-10-21T11:59:00Z")), false); // 24 h 1 min
  assert.equal(O.startsWithinHours("2026-10-22", "08:00", 24, new Date("2026-10-22T13:00:00Z")), true); // already started
  // Across the DST change: 2026-11-01 18:00 EST = 23:00Z; 24 real hours before is 2026-10-31 23:00Z.
  assert.equal(O.startsWithinHours("2026-11-01", "18:00", 24, new Date("2026-10-31T22:30:00Z")), false);
  assert.equal(O.startsWithinHours("2026-11-01", "18:00", 24, new Date("2026-10-31T23:30:00Z")), true);
  assert.equal(O.startsWithinHours("2026-02-30", "08:00", 24, new Date("2026-02-01T00:00:00Z")), false);
});

test("inside the cutoff the pack pages say so, with the club's phone (review UI-6)", () => {
  assert.equal(
    C.packInsideCutoff("484-252-2523", 1),
    "This game is less than 24 hours away, so it can't be cancelled online — call 484-252-2523 to change it. A no-show uses the credit.",
  );
  assert.match(C.packInsideCutoff("484-252-2523", 2), /A no-show uses the credits\.$/);
});

test("toView: a pack row keeps the platform's packRef — null on a card row, or when it is not a PK ref (review UI-2)", () => {
  const v = V.toView({ ...LIST, bookings: [{ ...PACK_ROW, packRef: "PK-3F2A9C" }, { ...ROW, seriesId: SPORT, packRef: "PK-3F2A9C" }] });
  const pack = v.bookings.find((b) => b.paidWith === "pack");
  const card = v.bookings.find((b) => b.paidWith === "card");
  assert.equal(pack.packRef, "PK-3F2A9C");
  assert.equal(card.packRef, null);
  // A ref of the wrong shape says nothing about which pack; the row itself still shows.
  for (const bad of ["3F2A9C", "PK-3F2A9", "PK-3F2A9C0", "PK-<b>xx", 42, ""]) {
    const rows = V.toView({ ...LIST, bookings: [{ ...PACK_ROW, packRef: bad }] }).bookings;
    assert.equal(rows.length, 1, String(bad));
    assert.equal(rows[0].packRef, null, String(bad));
  }
  // A platform that sends no ref: null.
  assert.equal(V.toView({ ...LIST, bookings: [PACK_ROW] }).bookings[0].packRef, null);
});

test("toPurchase: the pack's sport id and name come through when sent (review UI-2)", () => {
  const v = V.toPurchase({ state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com", sportId: SPORT, name: "Badminton 5-pack" });
  assert.equal(v.sportId, SPORT);
  assert.equal(v.name, "Badminton 5-pack");
  const bad = V.toPurchase({ state: "active", sportId: "javascript:alert(1)", name: "x".repeat(61) });
  assert.equal(bad.sportId, null);
  assert.equal(bad.name, null);
});

test("toBooked: the pack's clock comes through; a clock outside the closed set drops the pack block, never the booking (review UI-7)", () => {
  const started = V.toBooked(200, { ...BOOKED, pack: { ...BOOKED.pack, clock: "started" } });
  assert.equal(started.pack.clock, "started");
  assert.equal(V.toBooked(200, { ...BOOKED, pack: { ...BOOKED.pack, clock: "provisional" } }).pack.clock, "provisional");
  // A platform without it (today's A3): null, and the page uses the quote's clock.
  assert.equal(V.toBooked(200, BOOKED).pack.clock, null);
  const bad = V.toBooked(200, { ...BOOKED, pack: { ...BOOKED.pack, clock: "forever" } });
  assert.equal(bad.status, "booked");
  assert.equal(bad.pack, undefined);
  assert.ok(bad.booking);
  assert.equal(V.fromSiteBook(200, { ...BOOKED, pack: { ...BOOKED.pack, clock: "provisional" } }).pack.clock, "provisional");
});

test("dayText: a club-local calendar date, never shifted by the server's zone", () => {
  assert.equal(C.dayText("2026-11-29"), "Nov 29");
  assert.equal(C.dayText("2027-10-20", true), "Oct 20, 2027");
  assert.equal(C.dayText("2026-02-30"), null);
  assert.equal(C.dayText(null), null);
});

/* ── site review, the four lows (2026-10-25) ─────────────────────────────── */

test("the 'unknown' sentence names the button under it: PackConfirm's link to /my-bookings is labelled COPY.title (2026-10-25)", () => {
  const src = code(read("app/my-bookings/_components/PackConfirm.tsx"));
  assert.match(src, /\{unknown && \(\s*<div[^>]*>\s*<Link href="\/my-bookings"[^>]*>\s*\{COPY\.title\}\s*<\/Link>/);
  assert.ok(C.bookMessage({ status: "unknown" }).includes(C.COPY.title));
});

test("buy form, terms_changed: says reload, clears the tick, and puts Reload where Pay was — a re-tick could never get past it (2026-10-25)", () => {
  // The form sends the terms version the PAGE loaded (its termsVersion prop), so after
  // terms_changed a re-tick re-sends the old version and is refused again, for ever.
  const msg = C.checkoutMessage("terms_changed");
  assert.equal(msg, "The court pack terms have just changed. Reload the page to read the new terms, then tick the box again.");
  assert.doesNotMatch(msg, /charged/, "nothing was charged, and the sentence does not need to say otherwise");
  const src = code(read("app/court-packs/BuyForm.tsx"));
  // The answer flips one switch and clears the tick, in the same branch.
  assert.match(src, /if \(why === "terms_changed"\) \{\s*setTermsStale\(true\);\s*setAgree\(false\);\s*\}/);
  assert.match(src, /setError\(checkoutMessage\(why, phone\)\)/);
  // From then on pay() posts nothing (Enter in the email field still submits the form)…
  // (2026-10-29: and while a coupon is being checked — the same guard, one more switch.)
  assert.match(src, /if \(busy \|\| termsStale \|\| couponBusy\) return;/);
  assert.ok(src.indexOf("if (busy || termsStale || couponBusy) return;") < src.indexOf('postJson("/api/court-packs/checkout"'));
  // …the tick cannot be given again against terms the page does not show…
  assert.match(src, /checked=\{agree\}\s*disabled=\{termsStale\}/);
  // …and Reload replaces Pay, as PackConfirm does for its RELOAD answers.
  assert.match(
    src,
    /\{termsStale \? \(\s*<button type="button"[^>]*onClick=\{\(\) => window\.location\.reload\(\)\}>\s*\{COPY\.reload\}\s*<\/button>\s*\) : \(\s*<button type="submit"/,
  );
  assert.equal(C.COPY.reload, "Reload");
  // No other answer reaches the switch.
  assert.equal(src.match(/setTermsStale\(true\)/g).length, 1);
});

test("/court-packs's meta description names no size and no price — it is static, and they are the platform's rows (2026-10-25)", () => {
  const d = C.PACK_BUY_COPY.metaDescription;
  assert.equal(d, "Prepaid court and lane time at Exton Sports Center — badminton and cricket.");
  assert.doesNotMatch(d, /\d|\$|peak|price|cheap|save|five|ten\b|credits?\b/i);
  const page = code(read("app/court-packs/page.tsx"));
  assert.match(page, /description: PACK_BUY_COPY\.metaDescription,/);
  assert.doesNotMatch(page.slice(page.indexOf("export const metadata"), page.indexOf("function Shell")), /PACK_BUY_COPY\.lead/);
  // The visible lead is unchanged: it sits beside the offers it describes.
  assert.match(page, /\{PACK_BUY_COPY\.lead\}/);
});

test("/court-packs/terms says which version it is, from the terms it already loads — and only over the platform's terms (2026-10-25)", () => {
  assert.equal(C.PACK_BUY_COPY.termsVersion("2026-10-22-1"), "Version 2026-10-22-1");
  // toOffers already allow-lists the version, as text.
  assert.equal(V.toOffers(OFFERS).terms.version, "cp-2026-10-20-1");
  const src = code(read("app/court-packs/terms/page.tsx"));
  const branch = src.slice(src.indexOf("{terms ? ("), src.indexOf(") : ("));
  assert.ok(branch.length > 0);
  assert.match(branch, /\{PACK_BUY_COPY\.termsVersion\(terms\.version\)\}/, "inside the platform-terms branch");
  assert.ok(branch.indexOf("termsVersion(") < branch.indexOf("terms.sections.map"), "under the title, above the sections");
  assert.equal(src.match(/termsVersion\(/g).length, 1, "never over the can't-show fallback");
});

/* ── short links: /court-packs/<sport> (2026-10-25) ──────────────────────────
   Aniket, 2026-10-25: /court-packs/badminton and /court-packs/cricket for flyers and QR
   codes, landing on /court-packs with that sport's tile picked. The slug is matched against
   the sport NAMES in the live offers (lib/my-bookings/pack-links.ts), so no platform id is
   kept on this site; app/court-packs/[sport]/route.ts makes the one offers call and 307s.
   Everything that is not a clean match — the wrong shape, an unknown sport, off, down, none
   on sale — must land on plain /court-packs: a printed code can never be re-printed. */

const L = await import("./pack-links.ts");
// The route imports with tsconfig's "@/" (the repo root), which this file's hook above does
// not map. A second hook, here, so the header stays as it was: "@/x" → <root>/x.ts.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    return nextResolve(new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, context);
  },
});
const linkRoute = await import("../../app/court-packs/[sport]/route.ts");

const LINK_ANSWER = { ...OFFERS, offers: [CRICKET_5, CRICKET_10, OFFER, OFFER_10] };
const LINK_OFFERS = V.toOffers(LINK_ANSWER).offers;
const SITE = "https://www.extonsports.com";
const linkGet = (slug, { ip = IP, query = "" } = {}) =>
  linkRoute.GET(
    new Request(`${SITE}/court-packs/${encodeURIComponent(slug)}${query}`, { headers: { "x-vercel-forwarded-for": ip } }),
    { params: Promise.resolve({ sport: slug }) },
  );

test("packSportForSlug: the slug is the sport's NAME, matched case-insensitively against the live offers — no id kept here", () => {
  assert.equal(L.packSportForSlug("badminton", LINK_OFFERS), SPORT);
  assert.equal(L.packSportForSlug("cricket", LINK_OFFERS), CRICKET_ID);
  // The platform's capitals are its own business; a name of two words takes a hyphen.
  assert.equal(L.packSportForSlug("badminton", [{ sportId: SPORT, sport: "BADMINTON" }]), SPORT);
  assert.equal(L.packSportForSlug("table-tennis", [{ sportId: UUID, sport: "Table  Tennis" }]), UUID);
  assert.equal(L.sportSlug(" Cricket "), "cricket");
  // Squash courts exist but squash packs are not sold (2026-10-22): no offer, no match.
  for (const s of ["squash", "pickleball", "badminto", "badmintons", "terms", "-"]) {
    assert.equal(L.packSportForSlug(s, LINK_OFFERS), null, s);
  }
});

test("packSportForSlug: only [a-z-]{1,30} is a slug; no offers, or two sports under one name, is no match", () => {
  for (const s of ["Badminton", "BADMINTON", "badminton ", " badminton", "bad minton", "bad%20minton", "badminton1",
    "bad_minton", "badminton/", "../terms", "", "a".repeat(31), null, undefined, 42, ["badminton"]]) {
    assert.equal(L.packSportForSlug(s, LINK_OFFERS), null, JSON.stringify(s));
  }
  assert.equal(L.PACK_LINK_SLUG_RE.test("a".repeat(30)), true);
  assert.equal(L.PACK_LINK_SLUG_RE.test("a".repeat(31)), false);
  assert.equal(L.packSportForSlug("badminton", null), null);
  assert.equal(L.packSportForSlug("badminton", []), null);
  // A 5-pack and a 10-pack are one sport and count once (above); two DIFFERENT ids under
  // one name cannot be told apart from a flyer, so neither is picked.
  assert.equal(L.packSportForSlug("badminton", [...LINK_OFFERS, { ...OFFER, sportId: UUID }]), null);
  assert.equal(L.packSportForSlug("cricket", [...LINK_OFFERS, { ...OFFER, sportId: UUID }]), CRICKET_ID);
});

test("packLinkTarget: /court-packs?sport=<id> through packBuyUrl, &credits only for a size on sale; else plain /court-packs", () => {
  assert.equal(L.packLinkTarget("badminton", LINK_OFFERS), `/court-packs?sport=${SPORT}`);
  assert.equal(L.packLinkTarget("cricket", LINK_OFFERS), `/court-packs?sport=${CRICKET_ID}`);
  assert.equal(L.packLinkTarget("cricket", LINK_OFFERS, 10), `/court-packs?sport=${CRICKET_ID}&credits=10`);
  // A size that is not on sale for that sport is dropped, as packBuyUrl drops it.
  assert.equal(L.packLinkTarget("cricket", LINK_OFFERS, 7), `/court-packs?sport=${CRICKET_ID}`);
  assert.equal(L.packLinkTarget("badminton", LINK_OFFERS, null), `/court-packs?sport=${SPORT}`);
  for (const [slug, offers] of [["squash", LINK_OFFERS], ["Badminton", LINK_OFFERS], ["badminton", []], ["badminton", null]]) {
    assert.equal(L.packLinkTarget(slug, offers, 10), B.PACK_PATH, `${slug} ${JSON.stringify(offers)?.slice(0, 20)}`);
  }
  assert.equal(B.PACK_PATH, "/court-packs");
});

test("withPackLinkCode: ?code= or &code= on the target, nothing without a code (2026-10-29)", () => {
  assert.equal(L.withPackLinkCode(B.PACK_PATH, null), "/court-packs");
  assert.equal(L.withPackLinkCode("/court-packs", "DIWALI2026"), "/court-packs?code=DIWALI2026");
  assert.equal(L.withPackLinkCode(`/court-packs?sport=${SPORT}`, "DIWALI2026"), `/court-packs?sport=${SPORT}&code=DIWALI2026`);
  assert.equal(
    L.withPackLinkCode(`/court-packs?sport=${CRICKET_ID}&credits=10`, "DIWALI2026"),
    `/court-packs?sport=${CRICKET_ID}&credits=10&code=DIWALI2026`,
  );
  // The route reads the code as the page does (couponFromQuery), before this helper sees it.
  const route = code(read("app/court-packs/[sport]/route.ts"));
  assert.match(route, /couponFromQuery\(new URL\(req\.url\)\.searchParams\.get\('code'\)\)/);
  assert.match(route, /withPackLinkCode\(path, code\)/);
  assert.match(code(read("app/court-packs/page.tsx")), /couponFromQuery\(sp\.code\)/);
});

test("GET /court-packs/<sport>?code=: the coupon code rides along on every redirect, fallbacks included (2026-10-29)", async () => {
  const f = stubFetch(() => reply(200, LINK_ANSWER));
  try {
    await withSecret(SECRET, async () => {
      const b = await linkGet("badminton", { query: "?code=DIWALI2026" });
      assert.equal(b.status, 307);
      assert.equal(b.headers.get("location"), `${SITE}/court-packs?sport=${SPORT}&code=DIWALI2026`);
      // Read as the page reads it: trimmed and upper-cased.
      const lower = await linkGet("cricket", { query: "?credits=10&code=%20diwali2026%20" });
      assert.equal(lower.headers.get("location"), `${SITE}/court-packs?sport=${CRICKET_ID}&credits=10&code=DIWALI2026`);
      // A code of any other shape is dropped, never passed on; the rest of the link still works.
      for (const bad of ["DIWALI-2026", "ab", "a".repeat(33), "dıwalı2026", "<script>"]) {
        const res = await linkGet("badminton", { query: `?code=${encodeURIComponent(bad)}` });
        assert.equal(res.headers.get("location"), `${SITE}/court-packs?sport=${SPORT}`, bad);
      }
      // Nothing else rides along with it.
      const odd = await linkGet("badminton", { query: "?code=DIWALI2026&email=a@b.co&sport=x" });
      assert.equal(odd.headers.get("location"), `${SITE}/court-packs?sport=${SPORT}&code=DIWALI2026`);
      // The plain-page fallbacks keep it too: a slug of the wrong shape (no call) and one
      // that names no pack.
      const shape = await linkGet("Badminton", { query: "?code=DIWALI2026" });
      assert.equal(shape.headers.get("location"), `${SITE}/court-packs?code=DIWALI2026`);
      const squash = await linkGet("squash", { query: "?code=DIWALI2026" });
      assert.equal(squash.headers.get("location"), `${SITE}/court-packs?code=DIWALI2026`);
    });
  } finally {
    f.restore();
  }
  // The platform down: still the page, still the code.
  const down = stubFetch(() => reply(503, { error: "down" }));
  try {
    const res = await withSecret(SECRET, () => linkGet("badminton", { query: "?code=DIWALI2026" }));
    assert.equal(res.headers.get("location"), `${SITE}/court-packs?code=DIWALI2026`);
  } finally {
    down.restore();
  }
});

test("packLinkCredits reads ?credits= exactly as /court-packs does: one or two digits, no leading zero", () => {
  assert.equal(L.packLinkCredits("5"), 5);
  assert.equal(L.packLinkCredits("10"), 10);
  assert.equal(L.packLinkCredits("99"), 99);
  for (const v of ["0", "05", "100", "5.0", "-5", " 5", "1e1", "", "five", null, undefined]) {
    assert.equal(L.packLinkCredits(v), null, JSON.stringify(v));
  }
  // The page's own rule, which this mirrors; if it changes, so must the short link.
  assert.match(code(read("app/court-packs/page.tsx")), /\/\^\[1-9\]\\d\?\$\/\.test\(sp\.credits\)/);
});

test("GET /court-packs/badminton and /cricket: 307 to the page with that tile picked, from one offers call each", async () => {
  const f = stubFetch(() => reply(200, LINK_ANSWER));
  try {
    await withSecret(SECRET, async () => {
      for (const [slug, id] of [["badminton", SPORT], ["cricket", CRICKET_ID]]) {
        const res = await linkGet(slug);
        assert.equal(res.status, 307, slug);
        assert.equal(res.headers.get("location"), `${SITE}/court-packs?sport=${id}`);
        // The target depends on the platform's rows: nobody may remember it.
        assert.equal(res.headers.get("cache-control"), "no-store");
      }
      const ten = await linkGet("cricket", { query: "?credits=10" });
      assert.equal(ten.headers.get("location"), `${SITE}/court-packs?sport=${CRICKET_ID}&credits=10`);
      const odd = await linkGet("badminton", { query: "?credits=7&sport=x&email=a@b.co" });
      assert.equal(odd.headers.get("location"), `${SITE}/court-packs?sport=${SPORT}`, "nothing else on the link is carried");
    });
    assert.equal(f.calls.length, 4);
    for (const c of f.calls) {
      // The page's own call: the public variant, the relay secret and the visitor's IP.
      assert.equal(c.url, "https://platform.test/api/public/court-packs/offers?club=exton-sports");
      assert.equal(c.method, "GET");
      assert.equal(c.headers.get("x-exton-relay-secret"), SECRET);
      assert.equal(c.headers.get("x-exton-client-ip"), IP);
    }
  } finally {
    f.restore();
  }
});

test("GET /court-packs/<sport> fails to plain /court-packs — the wrong shape (no call), unknown, off, down, bad, none on sale, no secret", async () => {
  const PLAIN = `${SITE}/court-packs`;
  const shape = stubFetch(() => reply(200, LINK_ANSWER));
  try {
    await withSecret(SECRET, async () => {
      for (const slug of ["Badminton", "badminton1", "bad_minton", "bad minton", "a".repeat(31)]) {
        const res = await linkGet(slug);
        assert.equal(res.status, 307, slug);
        assert.equal(res.headers.get("location"), PLAIN, slug);
      }
    });
    assert.equal(shape.calls.length, 0, "a slug of the wrong shape never reaches the platform");
  } finally {
    shape.restore();
  }
  const cases = [
    ["squash", () => reply(200, LINK_ANSWER)], // a court the club has, but no pack for it
    ["badminton", () => reply(404, { error: "not_available" })], // court_packs_public off
    ["badminton", () => reply(503, { error: "down" })],
    ["badminton", () => reply(200, { offers: "x" })], // fails the allow-list
    ["badminton", () => reply(200, { ...OFFERS, offers: [] })], // nothing on sale
    ["badminton", () => reply(200, { ...OFFERS, offers: [CRICKET_5] })], // only the other sport
    ["badminton", () => { throw new Error("timeout"); }],
  ];
  for (const [slug, respond] of cases) {
    const f = stubFetch(respond);
    try {
      const res = await withSecret(SECRET, () => linkGet(slug));
      assert.equal(res.status, 307);
      assert.equal(res.headers.get("location"), PLAIN, String(respond));
      assert.equal(f.calls.length, 1);
    } finally {
      f.restore();
    }
  }
  const none = stubFetch(() => reply(200, LINK_ANSWER));
  try {
    const res = await withSecret(undefined, () => linkGet("badminton"));
    assert.equal(res.headers.get("location"), PLAIN);
    assert.equal(none.calls.length, 0, "no relay secret, no call");
  } finally {
    none.restore();
  }
});

test("GET /court-packs/<sport>: the per-IP limit comes before the call, and over it the visitor still lands on /court-packs", async () => {
  const ip = "198.51.100.25";
  const f = stubFetch(() => reply(200, LINK_ANSWER));
  try {
    await withSecret(SECRET, async () => {
      for (let i = 0; i < 30; i++) {
        assert.equal((await linkGet("badminton", { ip })).headers.get("location"), `${SITE}/court-packs?sport=${SPORT}`, String(i));
      }
      const over = await linkGet("badminton", { ip });
      assert.equal(over.status, 307);
      assert.equal(over.headers.get("location"), `${SITE}/court-packs`);
    });
    assert.equal(f.calls.length, 30, "the 31st made no call");
  } finally {
    f.restore();
  }
});

test("/court-packs/[sport] does not shadow /court-packs/terms: a static segment is matched before a dynamic one", async () => {
  // Next's route matcher tries every static route before any dynamic one; the shared sorter
  // shows the order. The docs shipped with this Next state it for the Pages Router only
  // ("Predefined API routes take precedence over dynamic API routes").
  const { createRequire } = await import("node:module");
  const { statSync } = await import("node:fs");
  const { getSortedRoutes } = createRequire(import.meta.url)("next/dist/shared/lib/router/utils/sorted-routes");
  assert.deepEqual(getSortedRoutes(["/court-packs/[sport]", "/court-packs/terms", "/court-packs"]), [
    "/court-packs", "/court-packs/terms", "/court-packs/[sport]",
  ]);
  // …and the tree is what that assumes: the terms PAGE is a static segment beside the route.
  assert.ok(statSync(join(ROOT, "app", "court-packs", "terms", "page.tsx")).isFile());
  assert.ok(statSync(join(ROOT, "app", "court-packs", "[sport]", "route.ts")).isFile());
  // A route module exports route fields only (the my-bookings rule), and only GET.
  const names = [...read("app/court-packs/[sport]/route.ts").matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1]);
  assert.deepEqual(names.sort(), ["GET", "dynamic", "runtime"]);
});

/* ── /court-packs "How to use your pack" (2026-10-25) ─────────────────────────────────────
   Aniket asked for it on 2026-10-25 and approved the steps in substance. Pinned: every quoted
   label is a real button word for word, no number in it is typed (cutoff, windows, expiry and
   the remembered-phone days all come from constants or the offers), and the section exists
   only beside the form — never on "not on sale". */

const HOWTO_OFFERS = [OFFER, OFFER_10, CRICKET_5, CRICKET_10];

test("How to use your pack: the five steps and the rules, quoting each button exactly as its screen shows it (2026-10-25)", () => {
  const { steps, rules } = C.howToUsePack(HOWTO_OFFERS);
  assert.deepEqual(steps, [
    "Book: go to extonsports.com and choose “Book a court or lane” — or tap “Book with my pack” in your receipt email.",
    "Choose your sport, date, time, courts or lanes and hours (1 credit = 1 court or lane for 1 hour, whole hours only).",
    "Under “How do you want to pay?” choose “My court pack”, then “Continue with my court pack”.",
    "Confirm: the first time on a phone, we email you a 6‑digit code. After that, the phone is remembered for 90 days.",
    "Need to cancel? At least 24 hours before, go to extonsports.com/my-bookings and press “Cancel booking” — the credit goes back on your pack. Later than that, call (484) 252-2523.",
  ]);
  assert.equal(
    rules,
    "A 5-pack is good for 60 days from your first game and a 10-pack for 120. Book up to 60 or 120 days ahead. Unused packs expire 12 months after purchase. One sport per pack.",
  );

  const L = C.PACK_HOWTO_LABELS;
  // The app form's and the receipt's labels as grepped in orangish-app on 2026-10-25
  // (GuestCourtBooking.tsx, court-pack-purchase-email.ts) — that repo is not here to read, so
  // they are pinned; a rename there must change copy.ts and this together.
  assert.deepEqual({ ...L }, {
    siteBook: "Book a court or lane",
    receiptBook: "Book with my pack",
    payWith: "How do you want to pay?",
    myPack: "My court pack",
    continueWithPack: "Continue with my court pack",
    cancel: "Cancel booking",
  });
  // Every label is quoted in a step, in the curly quotes the page uses elsewhere.
  for (const label of Object.values(L)) assert.ok(steps.some((s) => s.includes(`“${label}”`)), label);
  // This site's own labels, against the code that renders them: the booking button…
  for (const f of ["app/components/Hero.tsx", "app/components/Nav.tsx", "app/components/Footer.tsx"]) {
    assert.ok(code(read(f)).includes(L.siteBook), `${f} no longer says “${L.siteBook}”`);
  }
  // …the /my-bookings row's cancel button (pack rows use the same one)…
  assert.equal(L.cancel, C.COPY.cancelButton);
  assert.match(code(read("app/my-bookings/_components/BookingRow.tsx")), /\{COPY\.cancelButton\}/);
  assert.ok(steps[4].includes(`extonsports.com${B.MY_BOOKINGS_PATH} `));
  // …and the two places this site already names the receipt's button and the app's switch.
  assert.ok(C.PACK_BUY_COPY.receiptNote.includes(L.receiptBook));
  assert.ok(C.PACK_BUY_COPY.alreadyHave.includes(`“${L.myPack}”`));
  // The club's number is a tel: link on the page (PhoneText), as in the Booking and changes box.
  assert.deepEqual(C.phoneParts(steps[4], C.FALLBACK_PHONE).filter((p) => p.href), [
    { text: C.FALLBACK_PHONE, href: "tel:+14842522523" },
  ]);
});

test("How to use your pack: the cutoff is DEFAULT_CUTOFF_HOURS and the phone's days are DEVICE_MAX_AGE_S — no number typed (2026-10-25)", () => {
  const def = C.howToUsePack(HOWTO_OFFERS).steps;
  assert.ok(def[4].startsWith(`Need to cancel? At least ${C.DEFAULT_CUTOFF_HOURS} hours before, `));
  assert.ok(def[3].endsWith(`remembered for ${S.DEVICE_MAX_AGE_S / 86400} days.`));
  // Other values flow straight through.
  const other = C.howToUsePack(HOWTO_OFFERS, "610-555-0100", 48, 30).steps;
  assert.ok(other[4].startsWith("Need to cancel? At least 48 hours before, "));
  assert.ok(other[4].endsWith("Later than that, call 610-555-0100."));
  assert.ok(other[3].endsWith("remembered for 30 days."));
  // In the source: the defaults name the constants, and the function types no 24, 60, 90,
  // 120 or 12 (a window, the cutoff, the phone's days or the expiry).
  const src = code(read("lib/my-bookings/copy.ts"));
  const fn = src.slice(src.indexOf("export function howToUsePack("), src.indexOf("export function creditsText("));
  assert.ok(fn.length > 0);
  assert.match(fn, /hours = DEFAULT_CUTOFF_HOURS,/);
  assert.match(fn, /rememberDays = Math\.floor\(DEVICE_MAX_AGE_S \/ 86_400\),/);
  assert.doesNotMatch(fn, /\b(?:12|24|60|90|120)\b/);
});

test("How to use your pack: windows, expiry and units are the offers' own — a change on the platform changes the steps (2026-10-25)", () => {
  // Other windows and expiry, badminton only: "court", never "or lane".
  const bad = C.howToUsePack([{ ...OFFER, windowDays: 45, unusedMonths: 6 }, { ...OFFER_10, windowDays: 90, unusedMonths: 6 }]);
  assert.equal(
    bad.rules,
    "A 5-pack is good for 45 days from your first game and a 10-pack for 90. Book up to 45 or 90 days ahead. Unused packs expire 6 months after purchase. One sport per pack.",
  );
  assert.equal(bad.steps[1], "Choose your sport, date, time, courts and hours (1 credit = 1 court for 1 hour, whole hours only).");
  // One size on sale: one window.
  assert.equal(
    C.howToUsePack([OFFER]).rules,
    "A 5-pack is good for 60 days from your first game. Book up to 60 days ahead. Unused packs expire 12 months after purchase. One sport per pack.",
  );
  // Two sports selling one size with different windows: each offer is named, so the line is
  // never true of one sport and false of the other.
  assert.equal(
    C.howToUsePack([OFFER, { ...CRICKET_5, windowDays: 45 }]).rules,
    "Each pack is good for its own number of days from your first game: Badminton 5-pack 60, Cricket 5-pack 45. Book up to 45 or 60 days ahead. Unused packs expire 12 months after purchase. One sport per pack.",
  );
  // Cricket alone books lanes.
  assert.match(C.howToUsePack([CRICKET_5]).steps[1], /date, time, lanes and hours \(1 credit = 1 lane for 1 hour,/);
});

test("/court-packs: How to use your pack sits under the form, only on the on-sale branch — nothing new on 'not on sale' (2026-10-25)", () => {
  const page = code(read("app/court-packs/page.tsx"));
  const main = page.slice(page.indexOf("export default async function PackPage"));
  const onSale = main.slice(main.indexOf("{onSale ? ("), main.indexOf(") : ("));
  const notOnSale = main.slice(main.indexOf(") : ("));
  assert.ok(onSale.length > 0 && notOnSale.length > 0);
  // Right after the form, with the offers on sale and the page's fallback phone.
  assert.match(onSale, /<BuyForm[^>]*\/>\s*<HowToUse offers=\{onSale\.offers\} phone=\{FALLBACK_PHONE\} \/>/);
  assert.match(notOnSale, /\{PACK_BUY_COPY\.notOnSale\}/);
  assert.doesNotMatch(notOnSale, /HowToUse|howToUsePack|howToTitle/);
  assert.equal(page.match(/<HowToUse\b/g).length, 1, "rendered in one place");
  // The section lays out copy.ts's words and adds none of its own.
  const box = page.slice(page.indexOf("function HowToUse("), page.indexOf("export default async function PackPage"));
  assert.match(box, /howToUsePack\(offers, phone\)/);
  assert.match(box, /\{PACK_BUY_COPY\.howToTitle\}/);
  assert.match(box, /<PhoneText text=\{line\} phone=\{phone\} \/>/);
  assert.equal(C.PACK_BUY_COPY.howToTitle, "How to use your pack");
  // Still unlinked and out of search: nothing here touches the PACKS_LIVE gate.
  assert.equal(B.PACKS_LIVE, false);
});
