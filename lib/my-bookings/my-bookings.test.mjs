/* What keeps extonsports.com/my-bookings private and honest, 2026-10-20.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   node:test on the pure modules only — the same no-runner rule as
   app/board/board-lib.test.mjs, whose resolver hook is copied below. Everything here
   passes `tsc` when broken: drop the Origin check and a cross-site form can press Cancel;
   give the cookie a Domain and the browser silently refuses it; let toView pass a field
   through and a token or an address reaches a page; map a timeout to "try again" and a
   guest whose refund already went through is told nothing happened. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
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
const G = await import("./guard.ts");
const V = await import("./view.ts");
const C = await import("./copy.ts");

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
  assert.deepEqual(Object.keys(v).sort(), ["bookings", "club", "cutoffHours", "email"]);
  assert.deepEqual(Object.keys(v.club).sort(), ["name", "phone"]);
  assert.deepEqual(Object.keys(v.bookings[0]).sort(), Object.keys(ROW).sort());
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
  assert.equal(C.COPY.sent.startsWith("If this email has bookings with us, we've sent a link."), true);
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
  assert.equal(routes.length, 6);
  for (const f of routes) {
    const names = [...readFileSync(f, "utf8").matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1]);
    for (const n of names) assert.ok(["runtime", "dynamic", "maxDuration", "GET", "POST"].includes(n), `${f}: ${n}`);
  }
});
