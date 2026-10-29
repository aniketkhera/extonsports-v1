/* What keeps extonsports.com/my-bookings private and honest, 2026-10-20.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   node:test on the pure modules — the same no-runner rule as
   app/board/board-lib.test.mjs, whose resolver hook is copied below — plus platform.ts
   with global fetch stubbed, so no call leaves this machine. Everything here passes `tsc`
   when broken: drop the Origin check and a cross-site form can press Cancel; give the
   cookie a Domain and the browser silently refuses it; let toView pass a field through
   and a token or an address reaches a page; map a timeout to "try again" and a guest
   whose refund already went through is told nothing happened; forget the relay secret's
   fail-closed check and the site calls the platform unauthenticated; read a 429 as
   "invalid" and a stranger's script expires every guest's email link (security review,
   2026-10-20). */
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
const G = await import("./guard.ts");
const V = await import("./view.ts");
const C = await import("./copy.ts");
// platform.ts reads its base URL once, at load; the relay secret it reads on every call.
process.env.ORANGISH_API_BASE = "https://platform.test";
delete process.env.EXTON_RELAY_SECRET;
const P = await import("./platform.ts");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21); // 43, base64url
const UUID = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";

/* ── guard ─────────────────────────────────────────────────────────────── */

function post(headers, url = "https://www.extonsports.com/api/my-bookings/cancel") {
  return new Request(url, { method: "POST", headers, body: "{}" });
}
const JSON_CT = { "content-type": "application/json" };
const OWN = "https://www.extonsports.com";

test("sameOriginProblem: same-origin JSON passes", () => {
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: OWN, "sec-fetch-site": "same-origin" })), null);
  assert.equal(G.sameOriginProblem(post({ "content-type": "application/json; charset=utf-8", origin: OWN })), null);
});

test("sameOriginProblem: a MISSING Origin is refused, not waved through", () => {
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT })), "no_origin");
});

test("sameOriginProblem: a foreign Origin, the apex, or http is refused", () => {
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: "https://evil.example" })), "cross_origin");
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: "https://extonsports.com" })), "cross_origin");
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: "http://www.extonsports.com" })), "cross_origin");
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: "null" })), "cross_origin");
});

test("sameOriginProblem: Sec-Fetch-Site other than same-origin is refused", () => {
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: OWN, "sec-fetch-site": "cross-site" })), "cross_site");
  assert.equal(G.sameOriginProblem(post({ ...JSON_CT, origin: OWN, "sec-fetch-site": "same-site" })), "cross_site");
});

test("sameOriginProblem: a form-encodable body type is refused (no preflight would guard it)", () => {
  assert.equal(G.sameOriginProblem(post({ origin: OWN, "content-type": "text/plain" })), "not_json");
  assert.equal(G.sameOriginProblem(post({ origin: OWN, "content-type": "application/x-www-form-urlencoded" })), "not_json");
  assert.equal(G.sameOriginProblem(post({ origin: OWN })), "not_json");
});

test("clientIp: Vercel's header, then x-real-ip, then the RIGHTMOST forwarded hop", () => {
  const r = (h) => new Request("https://x/", { headers: h });
  assert.equal(G.clientIp(r({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" })), "1.1.1.1");
  assert.equal(G.clientIp(r({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" })), "2.2.2.2");
  assert.equal(G.clientIp(r({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" })), "3.3.3.3");
  assert.equal(G.clientIp(r({})), "unknown");
  // The page's version (headers(), no Request) reads the same headers the same way.
  assert.equal(G.clientIpOf(new Headers({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" })), "3.3.3.3");
});

test("hit: a fixed window, refused past the limit, fresh after the window", () => {
  G.resetLimits();
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(G.hit("k", 3, 1000, t0 + i), false);
  assert.equal(G.hit("k", 3, 1000, t0 + 5), true);
  assert.equal(G.hit("k", 3, 1000, t0 + 1000), false);
  assert.equal(G.hit("other", 3, 1000, t0 + 5), false);
});

test("isEmailShape / CODE_RE / UUID_RE", () => {
  assert.equal(G.isEmailShape("a@b.co"), true);
  assert.equal(G.isEmailShape("a b@c.co"), false);
  assert.equal(G.isEmailShape("nope"), false);
  assert.equal(G.isEmailShape("x".repeat(250) + "@b.co"), false);
  assert.equal(G.isEmailShape(42), false);
  assert.equal(G.CODE_RE.test("012345"), true);
  assert.equal(G.CODE_RE.test("12345"), false);
  assert.equal(G.CODE_RE.test("1234567"), false);
  assert.equal(G.UUID_RE.test(UUID), true);
  assert.equal(G.UUID_RE.test("../../x"), false);
});

test("readJsonBody: an object only, and nothing over 4096 bytes", async () => {
  const r = (body, h = {}) => new Request("https://x/", { method: "POST", body, headers: h });
  assert.deepEqual(await G.readJsonBody(r('{"a":1}')), { a: 1 });
  assert.deepEqual(await G.readJsonBody(r("")), {});
  assert.equal(await G.readJsonBody(r("[1]")), null);
  assert.equal(await G.readJsonBody(r("not json")), null);
  assert.equal(await G.readJsonBody(r(JSON.stringify({ a: "x".repeat(5000) }))), null);
});

/* ── session cookies ───────────────────────────────────────────────────── */

test("TOKEN_RE: 43 base64url characters exactly", () => {
  assert.equal(TOKEN.length, 43);
  assert.equal(S.TOKEN_RE.test(TOKEN), true);
  assert.equal(S.TOKEN_RE.test(TOKEN.slice(1)), false); // 42
  assert.equal(S.TOKEN_RE.test(TOKEN + "a"), false); // 44
  assert.equal(S.TOKEN_RE.test("+" + TOKEN.slice(1)), false);
  assert.equal(S.TOKEN_RE.test("/" + TOKEN.slice(1)), false);
  assert.equal(S.TOKEN_RE.test(TOKEN.slice(1) + "="), false);
});

test("deviceCookie: __Host- name, httpOnly, Secure, Lax, Path=/, and NO domain", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  const c = S.deviceCookie(TOKEN, "2026-10-21T12:00:00Z", now);
  assert.equal(c.name, "__Host-exton_mb");
  assert.equal(c.value, TOKEN);
  assert.equal(c.options.httpOnly, true);
  assert.equal(c.options.secure, true);
  assert.equal(c.options.sameSite, "lax");
  assert.equal(c.options.path, "/");
  assert.equal("domain" in c.options, false);
  assert.equal(c.options.maxAge, 86400);
});

test("deviceCookie: maxAge follows the platform's expiry, capped at 90 days, never negative", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  assert.equal(S.deviceCookie(TOKEN, "2027-10-20T12:00:00Z", now).options.maxAge, 90 * 24 * 3600);
  assert.equal(S.deviceCookie(TOKEN, "2026-10-19T12:00:00Z", now).options.maxAge, 0);
});

test("deviceCookie: a bad date or token THROWS rather than defaulting to 90 days", () => {
  assert.throws(() => S.deviceCookie(TOKEN, "not a date"));
  assert.throws(() => S.deviceCookie(TOKEN, ""));
  assert.throws(() => S.deviceCookie(TOKEN, undefined));
  assert.throws(() => S.deviceCookie("short", "2026-10-21T12:00:00Z"));
});

test("replacedToken: after a new sign-in, the device token it replaces — and nothing else", () => {
  const OTHER = "B".repeat(43);
  assert.equal(S.replacedToken(null, TOKEN), null);
  assert.equal(S.replacedToken(TOKEN, TOKEN), null);
  assert.equal(S.replacedToken(OTHER, TOKEN), OTHER);
});

test("linkCookie lives 30 minutes; clearedCookie expires now, with the same attributes", () => {
  const l = S.linkCookie(TOKEN);
  assert.equal(l.name, "__Host-exton_mb_link");
  assert.equal(l.options.maxAge, 1800);
  assert.equal(l.options.httpOnly, true);
  const x = S.clearedCookie(S.DEVICE_COOKIE);
  assert.equal(x.value, "");
  assert.equal(x.options.maxAge, 0);
  assert.equal(x.options.secure, true);
  assert.equal(x.options.path, "/");
  assert.equal("domain" in x.options, false);
});

/* ── the allow-list ────────────────────────────────────────────────────── */

const ROW = {
  seriesId: UUID,
  sport: "Badminton",
  whenText: "Sat, Oct 24, 2026, 11:00 AM–12:00 PM",
  startsAt: "2026-10-24T15:00:00.000Z",
  cancelBy: "2026-10-23T15:00:00.000Z",
  cancelByText: "Fri 23 Oct, 11:00 AM",
  courts: ["BADMINTON 1", "BADMINTON 2"],
  amountPaidCents: 9000,
  status: "active",
  cancellable: true,
  blockedReason: null,
  refundedCents: null,
};
const LIST = {
  club: { name: "Exton Sports Center", phone: "484-252-2523" },
  email: "a•••@gmail.com",
  cutoffHours: 24,
  bookings: [ROW],
};

test("toView: a well-formed answer comes through", () => {
  const v = V.toView(LIST);
  assert.equal(v.club.phone, "484-252-2523");
  assert.equal(v.bookings.length, 1);
  assert.deepEqual(v.bookings[0].courts, ["BADMINTON 1", "BADMINTON 2"]);
});

test("toView: planted fields never reach a page — not at the top, not in a row", () => {
  const v = V.toView({
    ...LIST,
    deviceToken: TOKEN,
    profileId: UUID,
    club: { ...LIST.club, stripe_account_id: "acct_x" },
    bookings: [{ ...ROW, deviceToken: TOKEN, profileId: UUID, email: "real@person.com", hirer_email: "real@person.com" }],
  });
  // `packs` since the court pack (2026-10-21); lib/my-bookings/court-pack.test.mjs pins it.
  assert.deepEqual(Object.keys(v).sort(), ["bookings", "club", "cutoffHours", "email", "packs"]);
  assert.deepEqual(Object.keys(v.club).sort(), ["name", "phone"]);
  // The pack keys are on every row since 2026-10-21 ('card' and nulls on a card row);
  // packRef since review UI-2 (the platform's pack ref, so a row names WHICH pack).
  const PACK_KEYS = ["paidWith", "credits", "creditsReturned", "cancelledBy", "packName", "packRef"];
  assert.deepEqual(Object.keys(v.bookings[0]).sort(), [...Object.keys(ROW), ...PACK_KEYS].sort());
  assert.equal(JSON.stringify(v).includes(TOKEN), false);
  assert.equal(JSON.stringify(v).includes("real@person.com"), false);
});

test("toView: rows of the wrong shape are dropped, not repaired", () => {
  const bad = [
    { ...ROW, seriesId: "1" },
    { ...ROW, amountPaidCents: "9000" },
    { ...ROW, amountPaidCents: 90.5 },
    { ...ROW, status: "refunded" },
    { ...ROW, courts: [] },
    { ...ROW, courts: ["A", 2] },
    { ...ROW, cancellable: "yes" },
    { ...ROW, blockedReason: "because" },
    { ...ROW, startsAt: "tomorrow" },
    null,
    "row",
  ];
  const v = V.toView({ ...LIST, bookings: [...bad, ROW] });
  assert.equal(v.bookings.length, 1);
});

test("toView: a bad top level is null (=> 'unavailable'), never an empty list", () => {
  assert.equal(V.toView(null), null);
  assert.equal(V.toView({ ...LIST, bookings: "none" }), null);
  assert.equal(V.toView({ ...LIST, cutoffHours: "24" }), null);
  assert.equal(V.toView({ ...LIST, club: { name: "x", phone: "<script>" } }), null);
});

test("toView: only an ACTIVE booking can be cancellable, whatever the flag says", () => {
  const v = V.toView({ ...LIST, bookings: [{ ...ROW, status: "cancelled", refundedCents: 9000, cancellable: true }] });
  assert.equal(v.bookings[0].cancellable, false);
  assert.equal(v.bookings[0].refundedCents, 9000);
});

test("toView: sorted by start, soonest first", () => {
  const later = { ...ROW, seriesId: UUID.replace("3f", "4f"), startsAt: "2026-11-01T15:00:00Z" };
  const v = V.toView({ ...LIST, bookings: [later, ROW] });
  assert.deepEqual(v.bookings.map((b) => b.seriesId), [ROW.seriesId, later.seriesId]);
});

/* ── cancel answers ────────────────────────────────────────────────────── */

test("toCancelView: no answer (timeout) is 'unknown', NEVER try_again", () => {
  assert.deepEqual(V.toCancelView(0, null), { status: "unknown" });
  assert.deepEqual(V.toCancelView(500, { error: "x" }), { status: "unknown" });
  assert.deepEqual(V.toCancelView(502, null), { status: "unknown" });
  assert.deepEqual(V.toCancelView(200, { status: "weird" }), { status: "unknown" });
});

test("toCancelView: 409 too_late keeps the club's phone", () => {
  assert.deepEqual(V.toCancelView(409, { status: "too_late", phone: "484-252-2523" }), {
    status: "too_late",
    phone: "484-252-2523",
  });
  assert.deepEqual(V.toCancelView(409, { status: "needs_staff", phone: "<b>call</b>" }), { status: "needs_staff" });
});

test("toCancelView: the closed set, status by status", () => {
  assert.deepEqual(V.toCancelView(200, { status: "cancelled", refundedCents: 9000 }), { status: "cancelled", refundedCents: 9000 });
  assert.deepEqual(V.toCancelView(200, { status: "already_cancelled", refundedCents: 9000 }), {
    status: "already_cancelled",
    refundedCents: 9000,
  });
  assert.deepEqual(V.toCancelView(202, { status: "processing" }), { status: "processing" });
  assert.deepEqual(V.toCancelView(409, { status: "in_progress" }), { status: "in_progress" });
  assert.deepEqual(V.toCancelView(404, { status: "not_found" }), { status: "not_found" });
  assert.deepEqual(V.toCancelView(404, { error: "not_available" }), { status: "not_cancellable" });
  assert.deepEqual(V.toCancelView(401, { error: "signed_out" }), { status: "signed_out" });
  assert.deepEqual(V.toCancelView(503, { error: "try_again" }), { status: "try_again" });
  assert.deepEqual(V.toCancelView(429, {}), { status: "try_again" });
});

test("toCancelView: the platform's 403 (relay secret refused) is try_again — it is refused before anything happens", () => {
  // Second review, 2026-10-20: the platform answers 403 ONLY from its relay-secret check,
  // the first thing every endpoint does, so nothing was claimed or refunded. "Reload in a
  // minute to check" (unknown) sent the guest looking for a change that cannot have happened.
  assert.deepEqual(V.toCancelView(403, { error: "forbidden" }), { status: "try_again" });
  assert.deepEqual(V.toCancelView(403, null), { status: "try_again" });
});

test("only cancelled and already_cancelled count as success", () => {
  const all = ["cancelled", "already_cancelled", "processing", "too_late", "in_progress", "not_cancellable",
    "needs_staff", "not_found", "signed_out", "try_again", "unknown"];
  assert.deepEqual(all.filter((s) => V.isCancelSuccess({ status: s })), ["cancelled", "already_cancelled"]);
});

test("fromSiteCancel: this site's 200 carries the status; its 4xx refused before anything; the rest unknown", () => {
  assert.deepEqual(V.fromSiteCancel(200, { status: "cancelled", refundedCents: 4500 }), { status: "cancelled", refundedCents: 4500 });
  assert.deepEqual(V.fromSiteCancel(200, { status: "made_up" }), { status: "unknown" });
  assert.deepEqual(V.fromSiteCancel(403, { error: "forbidden" }), { status: "try_again" });
  assert.deepEqual(V.fromSiteCancel(429, { error: "slow_down" }), { status: "try_again" });
  assert.deepEqual(V.fromSiteCancel(0, null), { status: "unknown" });
  assert.deepEqual(V.fromSiteCancel(504, null), { status: "unknown" });
});

/* ── sign-in refusals (security review, 2026-10-20) ────────────────────── */

test("redeemRefusal: ONLY 'invalid' spends the parked link; a limit or an outage keeps it", () => {
  assert.deepEqual(V.redeemRefusal("invalid"), { status: 400, body: { error: "invalid" }, clearLink: true });
  assert.deepEqual(V.redeemRefusal("slow_down"), { status: 429, body: { error: "slow_down" }, clearLink: false });
  assert.deepEqual(V.redeemRefusal("try_again"), { status: 503, body: { error: "try_again" }, clearLink: false });
});

/* ── the relay to the platform (security review, 2026-10-20) ───────────── */

const SECRET = "s".repeat(20) + "+/=" + "Z".repeat(20); // 43, as `openssl rand -base64 32`
const IP = "203.0.113.7";

/** Replace global fetch for one test; every call is recorded, none leaves the machine. */
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

/** Every platform function once, with the answers the page would act on. */
async function callAll(ip = IP) {
  return {
    request: await P.requestLink("guest@example.com", ip),
    link: await P.redeem({ link: TOKEN }, ip),
    code: await P.redeem({ email: "guest@example.com", code: "012345" }, ip),
    list: await P.listBookings(TOKEN, ip),
    cancel: await P.cancelBooking(TOKEN, UUID, ip),
    signOut: await P.signOut(TOKEN, ip),
  };
}

test("relay secret unset, blank, short or malformed: NO call is made, and every answer is 'platform down'", async () => {
  for (const v of [undefined, "", "   ", "x".repeat(31), "with a space " + "x".repeat(40), "é".repeat(40)]) {
    const f = stubFetch(() => reply(200, {}));
    try {
      const r = await withSecret(v, () => callAll());
      assert.equal(f.calls.length, 0, JSON.stringify(v));
      assert.deepEqual(r, {
        request: "try_again",
        link: { ok: false, error: "try_again" },
        code: { ok: false, error: "try_again" },
        list: { kind: "unavailable" },
        cancel: { status: "try_again" },
        signOut: undefined,
      });
    } finally {
      f.restore();
    }
  }
});

test("with the secret: every call carries it and the visitor's IP — and no browser cookie", async () => {
  const f = stubFetch((url) => {
    if (url.endsWith("/guest-access/request")) return reply(202, { ok: true });
    if (url.endsWith("/guest-access/redeem")) return reply(400, { error: "invalid" });
    if (url.endsWith("/guest-bookings")) return reply(401, { error: "signed_out" });
    if (url.endsWith("/cancel")) return reply(409, { status: "in_progress" });
    return reply(200, { ok: true });
  });
  try {
    const r = await withSecret(SECRET, () => callAll());
    assert.equal(r.request, "ok");
    assert.equal(f.calls.length, 6);
    for (const c of f.calls) {
      assert.match(c.url, /^https:\/\/platform\.test\/api\/public\//);
      assert.equal(c.headers.get(P.RELAY_SECRET_HEADER), SECRET, c.url);
      assert.equal(c.headers.get(P.CLIENT_IP_HEADER), IP, c.url);
      assert.equal(c.headers.get("cookie"), null);
      assert.equal(c.init.cache, "no-store");
      // Neither the secret nor the IP rides in a body, where the platform might log it.
      assert.equal(String(c.init.body ?? "").includes(SECRET), false);
      assert.equal(String(c.init.body ?? "").includes(IP), false);
    }
    assert.equal(P.RELAY_SECRET_HEADER, "x-exton-relay-secret");
    assert.equal(P.CLIENT_IP_HEADER, "x-exton-client-ip");
    // The bearer only where a device acts; never on the sign-in calls.
    const bearer = f.calls.filter((c) => c.headers.get("authorization") === `Bearer ${TOKEN}`).map((c) => c.url);
    assert.deepEqual(bearer.map((u) => u.replace("https://platform.test", "")), [
      "/api/public/guest-bookings",
      `/api/public/guest-bookings/${UUID}/cancel`,
      "/api/public/guest-access/sign-out",
    ]);
  } finally {
    f.restore();
  }
});

test("the secret is trimmed: a value pasted with a trailing newline still matches", async () => {
  const f = stubFetch(() => reply(202, { ok: true }));
  try {
    await withSecret(`  ${SECRET}\n`, () => P.requestLink("guest@example.com", IP));
    assert.equal(f.calls[0].headers.get(P.RELAY_SECRET_HEADER), SECRET);
  } finally {
    f.restore();
  }
});

test("an 'IP' that is not an IP address is not forwarded (the call still goes)", async () => {
  for (const ip of ["unknown", "", "1.1.1.1, 2.2.2.2", "1.1.1.1\r\nx-evil: 1", "x".repeat(10), "1".repeat(46)]) {
    const f = stubFetch(() => reply(202, { ok: true }));
    try {
      await withSecret(SECRET, () => P.requestLink("guest@example.com", ip));
      assert.equal(f.calls.length, 1, JSON.stringify(ip));
      assert.equal(f.calls[0].headers.get(P.CLIENT_IP_HEADER), null, JSON.stringify(ip));
      assert.equal(f.calls[0].headers.get(P.RELAY_SECRET_HEADER), SECRET);
    } finally {
      f.restore();
    }
  }
  const f = stubFetch(() => reply(202, { ok: true }));
  try {
    await withSecret(SECRET, () => P.requestLink("guest@example.com", "2001:db8::1"));
    assert.equal(f.calls[0].headers.get(P.CLIENT_IP_HEADER), "2001:db8::1");
  } finally {
    f.restore();
  }
});

/** One platform answer, through one function, with the secret set. */
async function answer(fn, status, body) {
  const f = stubFetch(() => (status === "throw" ? Promise.reject(new TypeError("fetch failed")) : reply(status, body)));
  try {
    return await withSecret(SECRET, fn);
  } finally {
    f.restore();
  }
}

test("redeem: a 429 is slow_down (NOT invalid); only a 400 that says 'invalid' is invalid", async () => {
  const link = () => P.redeem({ link: TOKEN }, IP);
  assert.deepEqual(await answer(link, 429, { error: "rate_limited" }), { ok: false, error: "slow_down" });
  assert.deepEqual(await answer(link, 429), { ok: false, error: "slow_down" });
  assert.deepEqual(await answer(link, 400, { error: "invalid" }), { ok: false, error: "invalid" });
  assert.deepEqual(await answer(link, 400, { error: "bad_request" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 400), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 401, { error: "relay" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 403, {}), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 404, { error: "not_available" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 503, { error: "try_again" }), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, "throw"), { ok: false, error: "try_again" });
  assert.deepEqual(await answer(link, 200, { deviceToken: "short", expiresAt: "2027-01-01T00:00:00Z" }), {
    ok: false,
    error: "try_again",
  });
  assert.deepEqual(await answer(link, 200, { deviceToken: TOKEN, expiresAt: "2027-01-01T00:00:00Z" }), {
    ok: true,
    deviceToken: TOKEN,
    expiresAt: "2027-01-01T00:00:00Z",
  });
  const code = () => P.redeem({ email: "guest@example.com", code: "012345" }, IP);
  assert.deepEqual(await answer(code, 429, { error: "rate_limited" }), { ok: false, error: "slow_down" });
  assert.deepEqual(await answer(code, 400, { error: "invalid" }), { ok: false, error: "invalid" });
});

test("requestLink: the club-wide 'busy' 429 is try_again; a per-address 429 reads as everyone's sentence", async () => {
  const req = () => P.requestLink("guest@example.com", IP);
  assert.equal(await answer(req, 202, { ok: true }), "ok");
  assert.equal(await answer(req, 429, { error: "rate_limited" }), "ok");
  assert.equal(await answer(req, 429), "ok");
  assert.equal(await answer(req, 429, { error: "busy" }), "try_again");
  assert.equal(await answer(req, 400, { error: "bad_email" }), "bad_email");
  assert.equal(await answer(req, 400, { error: "bad_request" }), "try_again");
  assert.equal(await answer(req, 403, {}), "try_again");
  assert.equal(await answer(req, 404, { error: "not_available" }), "try_again");
  assert.equal(await answer(req, 503, { error: "try_again" }), "try_again");
  assert.equal(await answer(req, "throw"), "try_again");
});

test("listBookings / cancelBooking: a refused relay is never 'signed out' or 'cancelled'", async () => {
  const list = () => P.listBookings(TOKEN, IP);
  assert.deepEqual(await answer(list, 401, { error: "signed_out" }), { kind: "signed_out" });
  for (const s of [403, 404, 429, 503]) assert.deepEqual(await answer(list, s, { error: "x" }), { kind: "unavailable" }, String(s));
  assert.deepEqual(await answer(list, "throw"), { kind: "unavailable" });
  const cancel = () => P.cancelBooking(TOKEN, UUID, IP);
  assert.deepEqual(await answer(cancel, 503, { error: "try_again" }), { status: "try_again" });
  assert.deepEqual(await answer(cancel, "throw"), { status: "unknown" });
});

/* ── copy ──────────────────────────────────────────────────────────────── */

test("cancelMessage: the spec's sentence inside 24 hours, with the platform's phone", () => {
  assert.equal(C.cancelMessage({ status: "too_late", phone: "484-252-2523" }), "To cancel within 24 hours, call 484-252-2523.");
  assert.equal(C.cancelMessage({ status: "too_late" }, "(484) 252-2523"), "To cancel within 24 hours, call (484) 252-2523.");
});

test("cancelMessage: only success says cancelled; unknown says reload", () => {
  assert.match(C.cancelMessage({ status: "cancelled", refundedCents: 9000 }), /^Cancelled\. \$90\.00 is on its way back/);
  assert.equal(C.cancelMessage({ status: "unknown" }), "We couldn't confirm that. Reload this page in a minute to check.");
  for (const s of ["processing", "too_late", "in_progress", "not_cancellable", "needs_staff", "not_found", "signed_out", "try_again", "unknown"]) {
    assert.doesNotMatch(C.cancelMessage({ status: s }), /^(Cancelled|Already cancelled)/, s);
  }
});

test("money and the 'sent' sentence", () => {
  assert.equal(C.money(4500), "$45.00");
  assert.equal(C.money(9000), "$90.00");
  // The plain sentence while no pack is on sale (review R10, 2026-10-21); COPY.sentWithPack,
  // "…bookings or a 5-pack…", only once PACKS_LIVE is on (court-pack.test.mjs pins both).
  assert.equal(C.COPY.sent.startsWith("If this email has bookings with us, we've sent a link"), true);
});

test("the 'sent' sentence holds when the platform held a new email back (second review, 2026-10-20)", () => {
  // The platform no longer counts requests per address; it holds a new email only while
  // that inbox already has a live link, and a link can live 2 hours. So the sentence may
  // not promise a fresh email or "30 minutes", and must say an earlier email still works.
  assert.match(C.COPY.sent, /Any link or code from us that hasn.t expired still works\./);
  assert.doesNotMatch(C.COPY.sent, /30 minutes/);
});

test("telHref: a number a phone can dial, or null", () => {
  assert.equal(C.telHref("484-252-2523"), "tel:+14842522523");
  assert.equal(C.telHref("(484) 252-2523"), "tel:+14842522523");
  assert.equal(C.telHref("1-484-252-2523"), "tel:+14842522523");
  assert.equal(C.telHref("+1 484 252 2523"), "tel:+14842522523");
  assert.equal(C.telHref("+44 20 7946 0958"), "tel:+442079460958");
  assert.equal(C.telHref("252-2523"), null);
  assert.equal(C.telHref("call the club"), null);
  assert.equal(C.telHref(C.FALLBACK_PHONE), "tel:+14842522523");
});

test("phoneParts: the club's number inside a sentence becomes a tel: link; the rest stays text", () => {
  assert.deepEqual(C.phoneParts("To cancel within 24 hours, call 484-252-2523.", "484-252-2523"), [
    { text: "To cancel within 24 hours, call " },
    { text: "484-252-2523", href: "tel:+14842522523" },
    { text: "." },
  ]);
  assert.deepEqual(C.phoneParts(C.callClub("(484) 252-2523"), "(484) 252-2523")[1], {
    text: "(484) 252-2523",
    href: "tel:+14842522523",
  });
  assert.deepEqual(C.phoneParts("Nothing to dial here.", "484-252-2523"), [{ text: "Nothing to dial here." }]);
  assert.deepEqual(C.phoneParts("Call 252-2523.", "252-2523"), [{ text: "Call 252-2523." }]);
});

/* ── source reads ──────────────────────────────────────────────────────── */

const read = (p) => readFileSync(join(ROOT, p), "utf8");

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Code with comments removed — what can reach a page, roughly. Keeps "https://". */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("SiteChrome keeps analytics, the beacon and the WhatsApp bubble off /my-bookings", () => {
  const src = read("app/components/SiteChrome.tsx");
  assert.match(src, /PRIVATE_PATHS = \["\/my-bookings"\]/);
});

test("robots.ts disallows /my-bookings; the sitemap does not list it", () => {
  assert.match(read("app/robots.ts"), /disallow: \[[^\]]*'\/my-bookings'/);
  assert.doesNotMatch(read("app/sitemap.ts"), /my-bookings/);
});

test("no Orangish address or brand on the guest's pages, beyond the credit pill", () => {
  const files = [...walk(join(ROOT, "app", "my-bookings")), join(ROOT, "lib", "my-bookings", "copy.ts")];
  assert.ok(files.length >= 8);
  for (const f of files) {
    const left = code(readFileSync(f, "utf8"))
      .replace(/import OrangishPill from "\.\.\/components\/OrangishPill";/g, "")
      .replace(/<OrangishPill \/>/g, "");
    assert.doesNotMatch(left, /orangish/i, f);
  }
});

test("every text-white/NN on these pages is a step the light theme remaps", () => {
  // Light is the default theme; an unremapped step is white on white. /85 did exactly
  // that to the "Cancelled" sentence on the first render (2026-10-20).
  const css = read("app/globals.css");
  const remapped = new Set([...css.matchAll(/\[data-theme="light"\] \.text-white\\\/(\d+)\s/g)].map((m) => m[1]));
  assert.ok(remapped.has("70") && remapped.has("80"));
  for (const f of walk(join(ROOT, "app", "my-bookings"))) {
    for (const m of code(readFileSync(f, "utf8")).matchAll(/(?<![:\w-])text-white\/(\d+)/g)) {
      assert.ok(remapped.has(m[1]), `${f}: text-white/${m[1]} is not remapped for the light theme`);
    }
  }
});

test("the device token comes from the cookie, never a request body", () => {
  const cancel = code(read("app/api/my-bookings/cancel/route.ts"));
  assert.match(cancel, /readDeviceToken\(\)/);
  assert.doesNotMatch(cancel, /body\.(token|deviceToken)/);
});

test("route modules export only route fields (helpers live in lib/my-bookings)", () => {
  // Relative to the repo: the worktree's own directory name may contain "my-bookings".
  const routes = walk(join(ROOT, "app"))
    .filter((f) => /[\\/]route\.ts$/.test(f) && /my-bookings/.test(f.slice(ROOT.length)));
  // Six before the court pack. Its two (design §14, S2: the start route and the book
  // route) are allowed by name since 2026-10-21, so a route nobody planned still fails here.
  const PACK_ROUTES = ["app/api/my-bookings/pack/book/route.ts", "app/my-bookings/pack/start/route.ts"];
  assert.equal(routes.filter((f) => !PACK_ROUTES.includes(f.slice(ROOT.length + 1).split(sep).join("/"))).length, 6);
  for (const f of routes) {
    const names = [...readFileSync(f, "utf8").matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1]);
    for (const n of names) assert.ok(["runtime", "dynamic", "maxDuration", "GET", "POST"].includes(n), `${f}: ${n}`);
  }
});

/* ── the relay, from the source (security review, 2026-10-20) ──────────── */

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const appAndLib = () =>
  [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))].filter((f) => SOURCE_EXT.test(f) && !/\.test\.mjs$/.test(f));
const rel = (f) => f.slice(ROOT.length + 1).split(sep).join("/");

test("the relay secret stays on the server: read in platform.ts only, never NEXT_PUBLIC_", () => {
  const readers = appAndLib().filter((f) => /EXTON_RELAY_SECRET/.test(code(readFileSync(f, "utf8")))).map(rel);
  assert.deepEqual(readers, ["lib/my-bookings/platform.ts"]);
  for (const f of appAndLib()) assert.doesNotMatch(readFileSync(f, "utf8"), /NEXT_PUBLIC_\w*RELAY/, rel(f));
});

test("platform.ts is imported only by the my-bookings route handlers and the server page", () => {
  const importers = appAndLib()
    .filter((f) => /from\s+["'](?:@\/lib\/my-bookings|\.)\/platform["']/.test(readFileSync(f, "utf8")))
    .map(rel)
    .sort();
  const SIGN_IN = [
    "app/api/my-bookings/cancel/route.ts",
    "app/api/my-bookings/forget/route.ts",
    "app/api/my-bookings/open/route.ts",
    "app/api/my-bookings/request/route.ts",
    "app/api/my-bookings/verify/route.ts",
    "app/my-bookings/page.tsx",
  ];
  // The court pack's server pages and routes, by name (design §14, S2 and S4; 2026-10-21;
  // moved from app/5-pack and app/api/5-pack with the 2026-10-22 rename).
  // Any other importer — above all a "use client" one — still fails.
  const PACK = [
    "app/api/court-packs/checkout/route.ts",
    // The coupon's Apply (2026-10-29): a server route, like checkout. No "use client".
    "app/api/court-packs/quote/route.ts",
    "app/court-packs/page.tsx",
    "app/court-packs/terms/page.tsx",
    "app/api/my-bookings/pack/book/route.ts",
    "app/my-bookings/pack/page.tsx",
    "app/my-bookings/pack/ready/page.tsx",
    // The short links /court-packs/badminton and /cricket (2026-10-25): a server route that
    // asks the same offers the page does and redirects. No "use client", checked below.
    "app/court-packs/[sport]/route.ts",
  ];
  assert.deepEqual(importers.filter((f) => !PACK.includes(f)), SIGN_IN);
  // Every name on the list is a real importer: a list left on a moved path covers nothing.
  for (const f of PACK) assert.ok(importers.includes(f), `allow-list names a file that does not import platform.ts: ${f}`);
  for (const f of importers) assert.doesNotMatch(read(f), /^\s*["']use client["']/m, f);
});

test("every route that calls the platform runs the per-IP limit FIRST, and forwards the IP", () => {
  // open was the one without a limit on the first pass: a script could fake the Origin
  // and the link cookie and hammer the platform's redeem.
  for (const name of ["request", "verify", "open", "cancel", "forget"]) {
    const src = code(read(`app/api/my-bookings/${name}/route.ts`));
    const limit = src.indexOf("hit(`" + (name === "request" ? "req" : name) + ":${ip}`");
    const call = src.search(/\b(requestLink|redeem|cancelBooking|signOut)\(/);
    assert.ok(limit > 0, `${name}: no per-IP hit()`);
    assert.ok(call > limit, `${name}: the platform is called before the limit`);
    assert.match(src, /\b(requestLink|redeem|cancelBooking|signOut)\([^)]*\bip\)/, `${name}: the IP is not forwarded`);
  }
  assert.match(code(read("app/my-bookings/page.tsx")), /listBookings\(token, clientIpOf\(await headers\(\)\)\)/);
});

test("open and verify answer a refused sign-in through redeemRefusal (a 429 keeps the link)", () => {
  const open = code(read("app/api/my-bookings/open/route.ts"));
  assert.match(open, /redeemRefusal\(r\.error\)/);
  assert.match(open, /clearLink \? clearCookie\(res, LINK_COOKIE\) : res/);
  assert.match(code(read("app/api/my-bookings/verify/route.ts")), /redeemRefusal\(r\.error\)/);
  // The button shows "too many tries" for a 429, not "this link has expired".
  assert.match(code(read("app/my-bookings/_components/OpenButton.tsx")), /r\.status === 429 \? "slow"/);
});

/* ── second review (2026-10-20) ────────────────────────────────────────── */

test("a new sign-in revokes the device token it replaces (open and verify)", () => {
  // Otherwise each repeat sign-in on one browser leaves a live session nobody holds, and the
  // platform keeps only five per guest: the guest's OTHER devices get signed out instead.
  for (const name of ["open", "verify"]) {
    const src = code(read(`app/api/my-bookings/${name}/route.ts`));
    const previous = src.indexOf("const previous = await readDeviceToken()");
    const redeemAt = src.search(/\bredeem\(\{/);
    const revoke = src.indexOf("await signOut(stale, ip)");
    assert.ok(previous > 0 && previous < redeemAt, `${name}: the old token is not read before the redeem`);
    assert.ok(revoke > redeemAt, `${name}: the old token is not revoked after the new sign-in`);
    assert.match(src, /const stale = replacedToken\(previous, r\.deviceToken\)/, name);
    assert.match(src, /if \(stale\) await signOut\(stale, ip\)/, name);
  }
});

test("every sentence with the club's phone renders through PhoneText, so the number is a tel: link", () => {
  for (const f of [
    "app/my-bookings/page.tsx",
    "app/my-bookings/_components/BookingRow.tsx",
    "app/my-bookings/_components/OpenButton.tsx",
    "app/my-bookings/_components/RequestPanel.tsx",
    "app/my-bookings/_components/CodeForm.tsx",
    // The court pack's pages (integration, 2026-10-21): every one that can say "call …".
    "app/my-bookings/pack/page.tsx",
    "app/my-bookings/_components/PackConfirm.tsx",
    "app/my-bookings/pack/ready/page.tsx",
    "app/my-bookings/pack/ready/PurchaseStatus.tsx",
    "app/court-packs/BuyForm.tsx",
    "app/court-packs/terms/page.tsx",
  ]) {
    const src = code(read(f));
    assert.match(src, /<PhoneText /, f);
    // Not rendered as a bare JSX child (as a PhoneText prop is fine).
    assert.doesNotMatch(
      src,
      />\s*\{\s*(?:\w+\.)?(callClub|tooLate|cancelTryAgain|cancelMessage|listUnavailable|platformDown|refusalText|bookMessage|rowPackTooLate|purchaseUnknown|purchasePendingLate|checkoutMessage|termsUnavailable)\(/,
      f,
    );
    assert.doesNotMatch(src, />\s*\{(error|standing|message)\}\s*</, f);
  }
  assert.match(code(read("app/my-bookings/_components/PhoneText.tsx")), /phoneParts\(text, phone\)/);
});

test("the guest's pages link to no app.orangish.io address — not through a lib/booking.ts constant, a function that builds one, or a link the platform sent — beyond the booking-form exceptions the design allows", () => {
  // Owner, 2026-10-18: guests see extonsports.com only. The empty list's "Book a court or
  // lane" used BOOK_COURT_URL, an app.orangish.io address the text check above cannot see.
  //
  // Integration, 2026-10-21 (S1's and S3's note for the reviewer): the court pack builds
  // app links with FUNCTIONS (bookWithPackUrl, bookByCardUrl), and keeps one the platform
  // sends (the booking terms, through appHref) — none of which the constant check saw. The
  // design puts a few of them on these pages ON PURPOSE (orangish-app docs/court-packs.md
  // §0: the booking form is the app's), and only these:
  //   §8.1 the pack page — "Book a court", "Pick another time", "Pay by card (instead)",
  //        "Book again with my pack" (the form), and the terms box's link (the platform's
  //        booking terms and waiver, which the guest agrees to there);
  //   §8.3 a pack card — "Book a court with my pack" (the form, pack mode);
  //   §8.2 the ready page — "Book your first game"; /court-packs (/5-pack until 2026-10-22)
  //        — "Already have a pack? Book a court" (the form, pack mode).
  // Anything else on these pages that reaches the platform's origin fails here.
  const booking = code(read("lib/booking.ts"));
  const appUrls = [...read("lib/booking.ts").matchAll(/export const (\w+) = `\$\{APP_URL\}/g)].map((m) => m[1]);
  assert.ok(appUrls.includes("BOOK_COURT_URL") && appUrls.length >= 5);
  // Every exported FUNCTION of lib/booking.ts whose body names APP_URL or one of those
  // constants — found from the source, so the next one is caught without editing this.
  const names = new RegExp(`\\b(?:APP_URL|${appUrls.join("|")})\\b`);
  const appFns = [...booking.matchAll(/export function (\w+)[\s\S]*?\r?\n\}/g)]
    .filter((m) => names.test(m[0]))
    .map((m) => m[1]);
  for (const f of ["appHref", "bookByCardUrl", "bookWithPackUrl"]) assert.ok(appFns.includes(f), f);
  // What view.ts BUILDS with them, the one place it does: a pack card's bookUrl, a quote's
  // cardUrl and its terms url. A new link field there must be added below.
  const view = code(read("lib/my-bookings/view.ts"));
  assert.match(view, /bookUrl: bookWithPackUrl\(sportId\)/);
  assert.match(view, /cardUrl: bookByCardUrl\(sel\)/);
  assert.match(view, /const url = terms && appHref\(terms\.url\)/);
  for (const f of appFns) assert.ok(view.split(new RegExp(`\\b${f}\\(`)).length - 1 <= 1, `view.ts: ${f} used twice`);
  const CARRIED = { ".bookUrl": /\.bookUrl\b/, ".cardUrl": /\.cardUrl\b/, "terms.url": /\bterms\.url\b/ };

  const ALLOWED = {
    "app/my-bookings/pack/page.tsx": ["bookWithPackUrl", "bookByCardUrl", ".cardUrl", "terms.url"],
    "app/my-bookings/_components/PackCard.tsx": [".bookUrl"],
    "app/my-bookings/pack/ready/page.tsx": ["bookWithPackUrl"],
    "app/court-packs/BuyForm.tsx": ["bookWithPackUrl"],
  };
  // 2026-10-22: the buy pages moved to app/court-packs and app/api/court-packs. A listed
  // directory that is gone FAILS here — walking a missing one would quietly cover nothing.
  const DIRS = ["app/my-bookings", "app/court-packs", "app/api/my-bookings", "app/api/court-packs"];
  for (const d of DIRS) assert.ok(statSync(join(ROOT, ...d.split("/"))).isDirectory(), `missing: ${d}`);
  const pages = DIRS
    .flatMap((d) => walk(join(ROOT, ...d.split("/"))))
    .filter((f) => SOURCE_EXT.test(f));
  assert.ok(pages.length >= 25, String(pages.length));
  for (const f of pages) {
    const src = code(readFileSync(f, "utf8"));
    const used = [
      ...appUrls.filter((n) => new RegExp(`\\b${n}\\b`).test(src)),
      ...appFns.filter((n) => new RegExp(`\\b${n}\\b`).test(src)),
      ...Object.keys(CARRIED).filter((k) => CARRIED[k].test(src)),
    ];
    const allowed = ALLOWED[rel(f)] ?? [];
    for (const u of used) assert.ok(allowed.includes(u), `${rel(f)}: ${u} — an app.orangish.io link the design does not put here`);
  }
  for (const f of Object.keys(ALLOWED)) assert.ok(pages.map(rel).includes(f), `allow-list names a file that is gone: ${f}`);
  // The exceptions are the BOOKING FORM: both builders land on BOOK_COURT_URL and nowhere
  // else on the platform. (The terms link is the platform's own, origin-checked by appHref.)
  assert.match(booking, /return `\$\{BOOK_COURT_URL\}\?\$\{p\}`/);
  for (const fn of ["bookWithPackUrl", "bookByCardUrl"]) {
    const body = booking.match(new RegExp(`export function ${fn}[\\s\\S]*?\\r?\\n\\}`))[0];
    assert.match(body, /return `\$\{BOOK_COURT_URL\}\?\$\{p\}`/, fn);
  }
  // The link carriers are handed to ONE client component each, by the one page allowed them.
  const importers = (name) => appAndLib()
    .filter((f) => new RegExp(`import \\w+(?:, \\{[^}]*\\})? from ["'][^"']*/${name}["']`).test(readFileSync(f, "utf8")))
    .map(rel);
  assert.deepEqual(importers("PackConfirm"), ["app/my-bookings/pack/page.tsx"]);
  assert.deepEqual(importers("BuyForm"), ["app/court-packs/page.tsx"]);

  const list = code(read("app/my-bookings/_components/BookingList.tsx"));
  assert.match(list, /const BOOK_HERE = "\/#top";/);
  assert.match(list, /href=\{BOOK_HERE\}/);
  assert.doesNotMatch(list, /target="_blank"/);
});

/* ── reconciled with the shipped "Email my bookings" (2026-10-22) ─────────────
   When this branch was rebased onto master, the site already had a hero "My bookings"
   button that opens the Email-my-bookings popup (behind BOOKING_LIST_EMAIL_LIVE). The
   defaults put to Aniket for review: the hero keeps that ONE "My bookings"; /my-bookings
   is reached from the footer's "Manage or cancel a booking" and a "Booked online and need
   to cancel? Sign in" line inside the popup, both behind MY_BOOKINGS_LIVE alone; the two
   switches stay independent; and /my-bookings tells members and on-account bookers, who
   never get a sign-in link, where to go instead, in words that are the same for everyone. */

const B = await import("../booking.ts");
const PP = await import("../../app/components/my-bookings-pure.ts");

test("MY_BOOKINGS_LIVE and BOOKING_LIST_EMAIL_LIVE are two switches, neither made from the other; this one ships off", () => {
  assert.equal(B.MY_BOOKINGS_LIVE, false, "no link to /my-bookings ships before switch-on step 9");
  assert.equal(typeof B.BOOKING_LIST_EMAIL_LIVE, "boolean");
  assert.equal(B.MY_BOOKINGS_PATH, "/my-bookings");
  const src = code(read("lib/booking.ts")).replace(/\r\n/g, "\n");
  assert.match(src, /export const MY_BOOKINGS_LIVE = false\n/);
  assert.match(src, /export const BOOKING_LIST_EMAIL_LIVE = (true|false)\n/);
});

test("the hero has ONE 'My bookings': the shipped popup button, and no link of its own to /my-bookings", () => {
  const hero = code(read("app/components/Hero.tsx"));
  const closers = [...hero.matchAll(/>\s*My bookings\s*<\/(\w+)>/g)].map((m) => m[1]);
  assert.deepEqual(closers, ["button"], "exactly one, and it is the popup's <button>");
  assert.doesNotMatch(hero, /\bMY_BOOKINGS_(LIVE|PATH)\b|\/my-bookings/, "the branch's second hero <a> is gone");
  assert.match(hero, /\{BOOKING_LIST_EMAIL_LIVE && \(/, "the button is still behind the email popup's own switch");
});

test("the popup's 'Booked online and need to cancel? Sign in' line: behind MY_BOOKINGS_LIVE alone, a plain same-tab link", () => {
  assert.equal(PP.COPY.signInLead + PP.COPY.signInLink, "Booked online and need to cancel? Sign in");
  const popup = code(read("app/components/MyBookingsEmail.tsx"));
  assert.match(popup, /import \{ MY_BOOKINGS_LIVE, MY_BOOKINGS_PATH \} from "\.\.\/\.\.\/lib\/booking";/);
  // The only place the popup names /my-bookings, wrapped in the gate and nothing else: no
  // answer, address or state decides whether it shows.
  assert.equal(popup.match(/\bMY_BOOKINGS_PATH\b/g).length, 2, "the import and the one href");
  assert.equal(popup.match(/\bMY_BOOKINGS_LIVE\b/g).length, 2, "the import and the one gate");
  const gate = popup.indexOf("{MY_BOOKINGS_LIVE && (");
  const block = popup.slice(gate, popup.indexOf(")}", popup.indexOf("</p>", gate)) + 2);
  assert.ok(gate > popup.indexOf("</form>"), "under the form, after Send");
  assert.match(block, /^\{MY_BOOKINGS_LIVE && \(\s*<p [^>]*>\s*\{COPY\.signInLead\}\s*<a\s/);
  assert.match(block, /href=\{MY_BOOKINGS_PATH\}/);
  assert.match(block, /\{COPY\.signInLink\}\s*<\/a>\s*<\/p>\s*\)\}$/);
  assert.doesNotMatch(block, /target=|onClick|fetch\(/, "a plain link in the same tab, nothing posted");
  assert.ok(popup.indexOf("ref={signInRef}") > gate, "the trap's ref is on that link");
  // The popup is never mounted on the guest's private path, so /my-bookings makes no
  // browser call to the platform (this page's "extonsports.com only" rule).
  for (const f of walk(join(ROOT, "app", "my-bookings"))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /MyBookingsEmail|my-bookings-pure|BOOKING_LIST_EMAIL_URL/, rel(f));
  }
});

test("footer PLAY: Book, Calendar, then the gated 'Manage or cancel a booking' to /my-bookings, then Pay", () => {
  const footer = code(read("app/components/Footer.tsx"));
  const book = footer.indexOf('{ label: "Book a court or lane", href: BOOK_COURT_URL }');
  const cal = footer.indexOf('{ label: "Calendar of bookings", href: "/calendar", calendar: true }');
  const mine = footer.indexOf('...(MY_BOOKINGS_LIVE ? [{ label: "Manage or cancel a booking", href: MY_BOOKINGS_PATH }] : [])');
  const pay = footer.indexOf('{ label: "Make an adhoc payment", href: PAY_URL }');
  assert.ok(book > 0 && cal > book && mine > cal && pay > mine, `order: book=${book} cal=${cal} mine=${mine} pay=${pay}`);
  assert.doesNotMatch(footer, /label: "My bookings"/, "'My bookings' is the hero's popup, not this link");
});

test("the members line: static, the same for everyone, never a promise the popup cannot keep", () => {
  const phone = C.FALLBACK_PHONE;
  const live = C.otherBookings(phone, true);
  assert.equal(
    live.before + live.link + live.after,
    "Booked as a member, or on account? Those bookings don't get a sign-in link here. Use \"My bookings\" on the home page to have them emailed to you, or call (484) 252-2523.",
  );
  // The link is the hero button's own label, so a visitor can find it. Review fixes,
  // 2026-10-22: it said "Email my bookings", the popup's title, which nobody sees until
  // they have found and pressed that button.
  assert.equal(live.link, "My bookings");
  assert.notEqual(live.link, PP.COPY.title);
  const hero = code(read("app/components/Hero.tsx"));
  assert.equal(hero.match(new RegExp(`>\\s*${live.link}\\s*</button>`, "g"))?.length, 1, "the hero's one button with that label");
  // With the popup switched off it does not point at a button that is not there.
  const off = C.otherBookings(phone, false);
  assert.equal(off.link, undefined);
  assert.equal(off.before + off.after, "Booked as a member, or on account? Those bookings don't get a sign-in link here. Call (484) 252-2523.");
  for (const l of [live, off]) {
    assert.ok(l.after.includes(phone), "the phone is in `after`, so it renders as a tel: link");
    assert.doesNotMatch(l.before + (l.link ?? "") + l.after, /cancel|refund|we've sent|no bookings|not found/i);
  }
  const panel = code(read("app/my-bookings/_components/RequestPanel.tsx"));
  // The switch comes from lib/booking, a constant. Court packs (merged 2026-10-25) import
  // PACKS_LIVE from the same module on the same line, so the name is pinned, not the list.
  assert.match(panel, /import \{[^}]*\bBOOKING_LIST_EMAIL_LIVE\b[^}]*\} from "@\/lib\/booking";/);
  assert.match(panel, /otherBookings\(FALLBACK_PHONE, BOOKING_LIST_EMAIL_LIVE\)/, "fed by the switch, never by an answer");
  assert.match(panel, /<PhoneText text=\{line\.after\} phone=\{FALLBACK_PHONE\} \/>/);
  assert.match(panel, /const HOME_PANEL = "\/#top";/);
  assert.match(panel, /<a href=\{HOME_PANEL\} className="underline underline-offset-2">/, "this site's home page, same tab");
  assert.equal(panel.match(/<OtherBookings \/>/g).length, 1, "one line, in one place");
  // Review fixes, 2026-10-22: after whichever screen `state` picked, not inside one of them,
  // and with no props and no read of the panel's state, so no answer can reach it.
  assert.match(panel, /return \(\s*<div>\s*\{step\}\s*<OtherBookings \/>\s*<\/div>\s*\);\s*\}/, "after the screen, whatever the screen");
  const at = panel.indexOf("function OtherBookings() {");
  assert.ok(at > 0, "OtherBookings takes no props");
  assert.doesNotMatch(panel.slice(at), /\b(state|step|email|note|error)\b/, "reads nothing the visitor typed or the platform answered");
});

test("the page is called 'Manage or cancel a booking', as the footer link is; it never calls itself 'My bookings' (review fixes, 2026-10-22)", () => {
  // On the home page "My bookings" is the hero button that opens the "Email my bookings"
  // popup, a list by email. This page signs in and cancels, so it takes the words of the
  // footer link that leads here, in its heading and its <title>.
  assert.equal(C.COPY.title, "Manage or cancel a booking");
  const footer = code(read("app/components/Footer.tsx"));
  assert.ok(footer.includes(`{ label: "${C.COPY.title}", href: MY_BOOKINGS_PATH }`), "the link and the page it opens say the same thing");
  const layout = code(read("app/my-bookings/layout.tsx"));
  assert.ok(
    layout.includes('title: { absolute: "Manage or cancel a booking · Exton Sports Center" },'),
    "the <title> is the heading plus the club",
  );
  assert.ok(layout.includes(`"${C.COPY.title} · Exton Sports Center"`), "and stays in step with COPY.title");
  // Every heading on the path is COPY.title: each of the page's screens, and the landing
  // the emailed link opens.
  const page = code(read("app/my-bookings/page.tsx"));
  const headings = page.match(/<Heading>/g)?.length ?? 0;
  assert.ok(headings >= 1);
  assert.equal(page.match(/<Heading>\{COPY\.title\}<\/Heading>/g)?.length, headings);
  // The landing the emailed link opens: COPY.title, or — for a guest who arrived from a court
  // pack booking (merged 2026-10-25) — the pack's own heading, which is not "My bookings" either.
  assert.match(code(read("app/my-bookings/open/page.tsx")), /<h1 [^>]*>\s*\{(?:sel \? PACK_COPY\.title : )?COPY\.title\}\s*<\/h1>/);
  assert.doesNotMatch(C.PACK_COPY.title, /My bookings/, "the pack landing's heading");
  // Nothing on the path names the page "My bookings". (The members line's "My bookings" is
  // the home page's button, and lives in otherBookings, not COPY: see the rendered tests.)
  for (const [k, v] of Object.entries(C.COPY)) assert.doesNotMatch(v, /My bookings/, `COPY.${k}`);
  // 2026-10-25 (site review, low): the court pack's sentences too. The pack booking's
  // 'unknown' still said "Reload My bookings" after the rename, because this scan read COPY
  // alone. Every fixed pack sentence, and every message the pack pages build — after Book,
  // for each answer with a card and without, each refusal, and each buy-form refusal.
  const text = (v) => (typeof v === "function" ? v(C.FALLBACK_PHONE) : v);
  for (const [name, obj] of Object.entries({ PACK_COPY: C.PACK_COPY, PACK_SIGNIN: C.PACK_SIGNIN, PACK_BUY_COPY: C.PACK_BUY_COPY })) {
    for (const [k, v] of Object.entries(obj)) assert.doesNotMatch(text(v), /My bookings/, `${name}.${k}`);
  }
  const BOOK = ["booked", "already", ...V.PACK_REFUSALS, "taken", "started", "no_rate", "club_closed_hours", "changed",
    "credits_changed", "terms_required", "terms_changed", "bad_phone", "signed_out", "off", "slow_down", "try_again", "unknown"];
  for (const status of BOOK) {
    for (const card of [true, false]) {
      assert.doesNotMatch(C.bookMessage({ status }, C.FALLBACK_PHONE, card), /My bookings/, `bookMessage ${status} card=${card}`);
    }
  }
  const bare = { need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null, maxDays: null };
  const ctx = { sport: "Badminton", unit: "court", need: 1, email: null, phone: C.FALLBACK_PHONE, date: "2026-11-02", today: "2026-10-25", card: true };
  for (const reason of V.PACK_REFUSALS) assert.doesNotMatch(C.refusalText({ ...bare, reason }, ctx), /My bookings/, `refusalText ${reason}`);
  for (const e of ["bad_email", "terms_required", "terms_changed", "bad_sport", "bad_size", "club_not_payable", "coupon_invalid", "off", "slow_down", "try_again"]) {
    assert.doesNotMatch(C.checkoutMessage(e), /My bookings/, `checkoutMessage ${e}`);
  }
  // …and 'unknown' names the page the way its button does (court-pack.test.mjs pins the words).
  assert.ok(C.bookMessage({ status: "unknown" }).includes(C.COPY.title));
  for (const f of [...walk(join(ROOT, "app", "my-bookings")), ...walk(join(ROOT, "app", "court-packs"))]) {
    assert.doesNotMatch(code(readFileSync(f, "utf8")), /My bookings/, rel(f));
  }
  // The URL is unchanged: emails already in guests' inboxes link to it.
  assert.equal(B.MY_BOOKINGS_PATH, "/my-bookings");
});

/* ── the request panel, rendered (review fixes, 2026-10-22) ──────────────────
   The members line sat inside the first screen only, so it vanished on the "sent" screen —
   the one a member is left waiting on, for a link that never comes — and a source regex
   cannot see which screen an element is on. So these render the real RequestPanel with
   react-dom/server. Its .tsx files are compiled here by the project's own TypeScript (JSX
   out, types dropped; `tsc` checks the types), "@/" resolves to the repo root as in
   tsconfig.json, and an import of RequestPanel.tsx?initial=<state> starts its one state
   hook in that state: the screen a guest reaches by pressing "Send me a link" or "I have a
   code", without a browser. Nothing is pressed and nothing is posted. */

const ts = (await import("typescript")).default;
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const STATE_HOOK = 'useState<"idle" | "sending" | "sent" | "code">("idle")';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ?? "";
    let base = null;
    if (specifier.startsWith("@/")) base = join(ROOT, specifier.slice(2));
    else if (/^\.{1,2}\//.test(specifier) && /\.tsx(\?|$)/.test(parent)) base = fileURLToPath(new URL(specifier, parent));
    if (base) {
      for (const ext of ["", ".tsx", ".ts"]) {
        if (existsSync(base + ext) && statSync(base + ext).isFile()) return { url: pathToFileURL(base + ext).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!/\.tsx(\?|$)/.test(url)) return nextLoad(url, context);
    const u = new URL(url);
    const file = fileURLToPath(u);
    let src = readFileSync(file, "utf8");
    const initial = u.searchParams.get("initial");
    if (initial) {
      // Exactly one, or the knob turned nothing and every test below would be vacuous.
      if (src.split(STATE_HOOK).length !== 2) throw new Error(`${file}: expected the panel's one state hook, ${STATE_HOOK}`);
      src = src.replace(STATE_HOOK, STATE_HOOK.replace('("idle")', `(${JSON.stringify(initial)})`));
    }
    const out = ts.transpileModule(src, {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  },
});

async function renderPanel(initial, props = {}) {
  const { default: RequestPanel } = await import(`../../app/my-bookings/_components/RequestPanel.tsx?initial=${initial}`);
  return renderToStaticMarkup(createElement(RequestPanel, props));
}
const textOf = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const MEMBERS = (() => {
  const l = C.otherBookings(C.FALLBACK_PHONE, B.BOOKING_LIST_EMAIL_LIVE);
  return l.before + (l.link ?? "") + l.after;
})();
/** The members line's own <p>: once, the panel's last element, and the whole sentence. */
function membersLine(html, where) {
  const found = html.match(/<p class="[^"]*">Booked as a member[\s\S]*?<\/p>/g) ?? [];
  assert.equal(found.length, 1, `${where}: the members line, once`);
  assert.ok(html.endsWith(found[0] + "</div>"), `${where}: at the foot of the panel`);
  assert.equal(textOf(found[0]), MEMBERS, where);
  return found[0];
}

test("rendered: the first screen carries the members line under the form, with the signed-out note or without", async () => {
  const idle = await renderPanel("idle");
  assert.ok(textOf(idle).includes(C.COPY.lead), "this is the first screen");
  assert.ok(idle.indexOf("</form>") > 0 && idle.indexOf("</form>") < idle.indexOf("Booked as a member"), "under the form");
  const line = membersLine(idle, "idle");
  const note = await renderPanel("idle", { note: C.COPY.signedOut });
  assert.ok(textOf(note).includes(C.COPY.signedOut));
  assert.equal(membersLine(note, "idle, signed out"), line);
  const sending = await renderPanel("sending");
  assert.ok(textOf(sending).includes(C.COPY.sending), "this is the form while it sends");
  assert.equal(membersLine(sending, "sending"), line);
});

test("rendered: the 'sent' screen, after Send me a link, keeps the members line word for word (review fixes, 2026-10-22)", async () => {
  const sent = await renderPanel("sent");
  const words = textOf(sent);
  assert.ok(words.includes(C.COPY.sent), "this is the sent screen");
  assert.ok(words.includes(C.COPY.codeLabel), "with its code field");
  assert.ok(!words.includes(C.COPY.sendButton), "and not the request form");
  // The same bytes as the first screen: the line says nothing new once an address has been
  // sent, so it cannot tell a stranger whether that address has bookings.
  assert.equal(membersLine(sent, "sent"), membersLine(await renderPanel("idle"), "idle"));
});

test("rendered: the 'I have a code' screen keeps the members line word for word (review fixes, 2026-10-22)", async () => {
  const codeScreen = await renderPanel("code");
  const words = textOf(codeScreen);
  assert.ok(words.includes(C.COPY.codeLead), "this is the code screen");
  assert.ok(words.includes(C.COPY.codeLabel));
  assert.ok(!words.includes(C.COPY.sendButton), "and not the request form");
  assert.equal(membersLine(codeScreen, "code"), membersLine(await renderPanel("idle"), "idle"));
});

test("rendered: the line's 'My bookings' is a same-tab link to the home page's button, and the only 'My bookings' on the panel", async () => {
  for (const s of ["idle", "sending", "sent", "code"]) {
    const html = await renderPanel(s);
    const line = membersLine(html, s);
    assert.ok(line.includes('<a href="tel:+14842522523"'), `${s}: the phone dials`);
    if (B.BOOKING_LIST_EMAIL_LIVE) {
      assert.ok(line.includes('&quot;<a href="/#top" class="underline underline-offset-2">My bookings</a>&quot;'), s);
      assert.equal(textOf(html).split("My bookings").length, 2, `${s}: the panel never calls itself that`);
    } else {
      assert.doesNotMatch(textOf(html), /My bookings/, s);
    }
    assert.doesNotMatch(line, /target=|app\.orangish\.io/, s);
  }
});

test("npm test runs every .test.mjs in app/ and lib/, this file included", () => {
  // The rebase of 2026-10-22 merged master's eight files with this one by hand; a list that
  // drops a file still passes, silently, so the list is checked against the tree.
  const script = JSON.parse(read("package.json")).scripts.test;
  const listed = script.split(/\s+/).filter((w) => w.endsWith(".test.mjs")).sort();
  const found = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))]
    .filter((f) => f.endsWith(".test.mjs"))
    .map(rel)
    .sort();
  assert.deepEqual(listed, found);
  assert.ok(listed.includes("lib/my-bookings/my-bookings.test.mjs"));
});
