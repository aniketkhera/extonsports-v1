/* The court 5-pack's booking pages on extonsports.com, 2026-10-21 (S2).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." — orangish-app docs/court-packs.md
   §8.1 and §13. The app form's "Continue with my 5-pack" lands on GET
   /my-bookings/pack/start, which parks the slot in __Host-exton_pack_sel and 303s to
   /my-bookings/pack; that page signs the guest in if it must, and its Book button POSTs
   /api/my-bookings/pack/book, which spends the credit through the platform.

   The two ROUTES run here for real — next/server loads under node; next/headers'
   cookies() is replaced by a jar this file fills, and global fetch by a stub, so no call
   leaves this machine. The pages and client components are TSX, which node cannot load,
   so they are pinned by source reads (and were render-checked against a local dev server
   with every non-localhost request blocked, 2026-10-21).

   Everything here passes `tsc` when broken: let the start route copy the query string and
   the guest's address rides into a cookie; book the cookie's slot without checking it is
   the one the page showed and a second tab books a slot the guest never saw; forget to
   clear the slot after a booking and a reload offers to book it again; read a book timeout
   as "nothing happened"; let a `next` come from anywhere and a sign-in can be sent off-site. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// next/headers' cookies() reads this jar. A data: module, so nothing outside this file is
// involved; the routes reach it through lib/my-bookings/session-server.ts.
const HEADERS_STUB =
  "data:text/javascript," +
  encodeURIComponent(
    "export async function cookies() {" +
      " const jar = globalThis.__packJar ?? new Map();" +
      " return { get: (n) => (jar.has(n) ? { name: n, value: jar.get(n) } : undefined) };" +
      "}" +
      " export async function headers() { return new Headers(); }",
  );

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers") return { url: HEADERS_STUB, shortCircuit: true };
    // The tsconfig alias the routes import through: @/x is the repo's own x.ts.
    if (specifier.startsWith("@/")) {
      return nextResolve(pathToFileURL(join(ROOT, specifier.slice(2))).href + ".ts", context);
    }
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? ".ts" : ".js"), context);
    }
  },
});

// platform.ts reads its base URL once, at load; the relay secret on every call. The secret
// is set so the book route actually reaches the (stubbed) platform.
process.env.ORANGISH_API_BASE = "https://platform.test";
process.env.EXTON_RELAY_SECRET = "s".repeat(40);

const S = await import("./session.ts");
const G = await import("./guard.ts");
const V = await import("./view.ts");

const SPORT = "bfff160c-1111-4c2b-9e1f-0a1b2c3d4e5f";
const COURT = "aaaa160c-2222-4c2b-9e1f-0a1b2c3d4e5f";
const SERIES = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21); // 43, base64url
const KEY = "Ab3_-cdEfGhIjKlMnOpQrS"; // 22, the request key shape
const OWN = "https://www.extonsports.com";
const SEL = { sportId: SPORT, date: "2026-10-25", startTime: "18:00", hours: 1, courts: 2, preferCourtId: null };

/** Every Set-Cookie on a response, by name: { value, attrs (lower-case keys) }. */
function cookiesOf(res) {
  const out = {};
  for (const line of res.headers.getSetCookie()) {
    const [pair, ...rest] = line.split(/;\s*/);
    const i = pair.indexOf("=");
    const attrs = {};
    for (const a of rest) {
      const j = a.indexOf("=");
      attrs[(j < 0 ? a : a.slice(0, j)).toLowerCase()] = j < 0 ? true : a.slice(j + 1);
    }
    out[pair.slice(0, i)] = { value: pair.slice(i + 1), attrs };
  }
  return out;
}

/* ── GET /my-bookings/pack/start ─────────────────────────────────────── */

const start = await import("../../app/my-bookings/pack/start/route.ts");
const startReq = (qs) => new Request(`${OWN}/my-bookings/pack/start?${qs}`);
const GOOD_QS = `s=${SPORT}&d=2026-10-25&t=18:00&h=1&n=2`;

test("start: a good link parks the slot and 303s to /my-bookings/pack, private and no-referrer", async () => {
  const res = await start.GET(startReq(GOOD_QS));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), `${OWN}/my-bookings/pack`);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  const c = cookiesOf(res)[S.PACK_SEL_COOKIE];
  assert.ok(c, "no selection cookie");
  assert.deepEqual(S.decodePackSel(c.value), SEL);
  // __Host-: Secure, Path=/ and NO Domain, or the browser drops it silently.
  assert.equal(c.attrs.secure, true);
  assert.equal(c.attrs.httponly, true);
  assert.equal(c.attrs.path, "/");
  assert.equal(String(c.attrs.samesite).toLowerCase(), "lax");
  assert.equal(c.attrs["max-age"], String(S.PACK_SEL_MAX_AGE_S));
  assert.equal("domain" in c.attrs, false);
  // Only the slot is set: the device and link cookies are not this route's business.
  assert.deepEqual(Object.keys(cookiesOf(res)), [S.PACK_SEL_COOKIE]);
});

test("start: a chosen court is parked too", async () => {
  const res = await start.GET(startReq(`${GOOD_QS}&c=${COURT}`));
  assert.equal(S.decodePackSel(cookiesOf(res)[S.PACK_SEL_COOKIE].value).preferCourtId, COURT);
});

test("start: ⛔ an email (or any other parameter) never reaches the cookie or the next URL", async () => {
  const res = await start.GET(startReq(`${GOOD_QS}&email=alex%40example.com&name=Alex&next=https://evil.example/`));
  const c = cookiesOf(res)[S.PACK_SEL_COOKIE];
  assert.deepEqual(S.decodePackSel(c.value), SEL);
  const raw = Buffer.from(c.value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  assert.doesNotMatch(raw, /@|alex|Alex|evil/);
  // The Location is the bare page: nothing from the query string is carried on.
  assert.equal(res.headers.get("location"), `${OWN}/my-bookings/pack`);
});

test("start: a bad or tampered link CLEARS any slot parked earlier, and still lands on the page", async () => {
  for (const qs of ["", `${GOOD_QS}&h=4`, `${GOOD_QS}&s=${SPORT}`, `s=x&d=2026-10-25&t=18:00&h=1&n=2`]) {
    const res = await start.GET(startReq(qs));
    assert.equal(res.status, 303, qs);
    assert.equal(res.headers.get("location"), `${OWN}/my-bookings/pack`, qs);
    const c = cookiesOf(res)[S.PACK_SEL_COOKIE];
    assert.ok(c, `${qs}: the old slot is not cleared`);
    assert.equal(c.value, "", qs);
    assert.equal(c.attrs["max-age"], "0", qs);
  }
});

test("start: GET only — it exports no POST", () => {
  assert.equal(typeof start.GET, "function");
  assert.equal(start.POST, undefined);
});

/* ── POST /api/my-bookings/pack/book ─────────────────────────────────── */

const book = await import("../../app/api/my-bookings/pack/book/route.ts");

const PARKED = S.packSelCookie(SEL).value;
const BODY = { sel: SEL, requestKey: KEY, agreeTerms: true, termsVersion: "2026-10-13", expectCredits: 2 };
const BOOKED = {
  status: "booked",
  booking: {
    seriesId: SERIES,
    whenText: "Sun, Oct 25 · 6:00–7:00 PM",
    courts: ["BADMINTON 1", "BADMINTON 2"],
    credits: 2,
    lightsNote: "Lights come on 15 minutes before you play.",
    holderEmail: "alex@example.com", // planted: must not reach the page
  },
  pack: { name: "Badminton 5-pack", creditsLeft: 3, creditsTotal: 5, validUntilText: "Dec 24", clockText: null, packId: SERIES },
  redemptionId: SERIES,
};

let calls = [];
let reply = () => Response.json(BOOKED);

function bookReq(body = BODY, headers = {}) {
  return new Request(`${OWN}/api/my-bookings/pack/book`, {
    method: "POST",
    headers: {
      origin: OWN,
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-real-ip": "203.0.113.7",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  G.resetLimits();
  calls = [];
  reply = () => Response.json(BOOKED);
  globalThis.__packJar = new Map([
    [S.DEVICE_COOKIE, TOKEN],
    [S.PACK_SEL_COOKIE, PARKED],
  ]);
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return reply();
  };
});

test("book: booked — the cookie's slot is sent with the device token and the IP, and the slot is CLEARED", async () => {
  const res = await book.POST(bookReq({ ...BODY, phone: " 484-252-2523 " }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  const body = await res.json();
  // Through the allow-list: the planted address and ids never reach the page.
  assert.deepEqual(body, V.toBooked(200, BOOKED));
  assert.equal(body.status, "booked");
  assert.doesNotMatch(JSON.stringify(body), /alex@|packId|redemptionId|holderEmail/);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://platform.test/api/public/guest-packs/book");
  const h = calls[0].init.headers;
  assert.equal(h.Authorization, `Bearer ${TOKEN}`);
  assert.equal(h["x-exton-client-ip"], "203.0.113.7");
  const sent = JSON.parse(calls[0].init.body);
  assert.deepEqual(sent.sel, SEL);
  assert.equal(sent.requestKey, KEY);
  assert.equal(sent.agreeTerms, true);
  assert.equal(sent.termsVersion, "2026-10-13");
  assert.equal(sent.expectCredits, 2);
  assert.equal(sent.phone, "484-252-2523");

  const set = cookiesOf(res);
  assert.equal(set[S.PACK_SEL_COOKIE]?.attrs["max-age"], "0", "the slot is not cleared after booking");
  assert.equal(S.DEVICE_COOKIE in set, false, "the device cookie must survive a booking");
});

test("book: 'already' (the same request key booked before) also clears the slot", async () => {
  reply = () => Response.json({ ...BOOKED, status: "already" });
  const res = await book.POST(bookReq());
  assert.equal((await res.json()).status, "already");
  assert.equal(cookiesOf(res)[S.PACK_SEL_COOKIE]?.attrs["max-age"], "0");
});

test("book: a refusal, or a 'nothing was booked', KEEPS the slot — the guest may still pay by card for it", async () => {
  const cases = [
    [() => Response.json({ status: "not_enough_credits", need: 2, creditsLeft: 1 }, { status: 409 }), "not_enough_credits"],
    [() => Response.json({ status: "taken", message: "x" }, { status: 409 }), "taken"],
    [() => Response.json({ error: "try_again" }, { status: 503 }), "try_again"],
    [() => Response.json({ error: "slow_down" }, { status: 429 }), "slow_down"],
  ];
  for (const [r, status] of cases) {
    G.resetLimits();
    reply = r;
    const res = await book.POST(bookReq());
    assert.equal((await res.json()).status, status, status);
    assert.equal(S.PACK_SEL_COOKIE in cookiesOf(res), false, `${status}: the slot was cleared`);
  }
});

test("book: ⚠️ a timeout or a 5xx is 'unknown' (check My bookings), never 'try again' — and the slot is CLEARED", async () => {
  // The credit may already be spent. Keeping the slot would let a reload mint a NEW request
  // key, and a second press would then book (and spend) the same slot twice.
  const cases = [
    () => new Response("", { status: 502 }),
    () => Response.json({ error: "unknown" }, { status: 500 }),
    () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    },
  ];
  for (const r of cases) {
    G.resetLimits();
    reply = r;
    const res = await book.POST(bookReq());
    assert.equal((await res.json()).status, "unknown");
    assert.equal(cookiesOf(res)[S.PACK_SEL_COOKIE]?.attrs["max-age"], "0", "the slot survives a doubt");
    assert.equal(S.DEVICE_COOKIE in cookiesOf(res), false);
  }
});

test("book: the platform's 401 is signed_out, and this browser stops presenting the device cookie", async () => {
  reply = () => Response.json({ error: "unauthorized" }, { status: 401 });
  const res = await book.POST(bookReq());
  assert.equal((await res.json()).status, "signed_out");
  assert.equal(cookiesOf(res)[S.DEVICE_COOKIE]?.attrs["max-age"], "0");
  assert.equal(S.PACK_SEL_COOKIE in cookiesOf(res), false, "the slot survives a sign-out");
});

test("book: no device cookie is signed_out, and the platform is not called", async () => {
  globalThis.__packJar.delete(S.DEVICE_COOKIE);
  assert.equal((await (await book.POST(bookReq())).json()).status, "signed_out");
  assert.equal(calls.length, 0);
});

test("book: no parked slot (it lives 30 minutes) is 'changed', and the platform is not called", async () => {
  globalThis.__packJar.delete(S.PACK_SEL_COOKIE);
  assert.equal((await (await book.POST(bookReq())).json()).status, "changed");
  assert.equal(calls.length, 0);
});

test("book: ⛔ a slot other than the one the page showed (re-parked in another tab) is 'changed', never booked", async () => {
  const others = [
    { ...SEL, date: "2026-10-26" },
    { ...SEL, startTime: "19:00" },
    { ...SEL, courts: 1 },
    { ...SEL, hours: 2 },
    { ...SEL, sportId: COURT },
    { ...SEL, preferCourtId: COURT },
    null,
    "x",
  ];
  for (const sel of others) {
    const res = await book.POST(bookReq({ ...BODY, sel }));
    assert.equal((await res.json()).status, "changed", JSON.stringify(sel));
  }
  assert.equal(calls.length, 0);
});

test("book: the box not ticked is terms_required; a bad phone is bad_phone — neither calls the platform", async () => {
  for (const agreeTerms of [false, undefined, "true", 1]) {
    const res = await book.POST(bookReq({ ...BODY, agreeTerms }));
    assert.equal((await res.json()).status, "terms_required", String(agreeTerms));
  }
  for (const phone of ["call me", "1".repeat(40), "<b>"]) {
    const res = await book.POST(bookReq({ ...BODY, phone }));
    assert.equal((await res.json()).status, "bad_phone", phone);
  }
  assert.equal(calls.length, 0);
  // Blank is "no phone": booked, and nothing sent for it.
  const res = await book.POST(bookReq({ ...BODY, phone: "   " }));
  assert.equal((await res.json()).status, "booked");
  assert.equal("phone" in JSON.parse(calls[0].init.body), false);
});

test("book: a malformed request key, terms version or credit count is 400 (=> try again), not sent", async () => {
  const bad = [
    { requestKey: "short" },
    { requestKey: KEY + "x" },
    { requestKey: undefined },
    { termsVersion: "" },
    { termsVersion: "v".repeat(41) },
    { termsVersion: 7 },
    { expectCredits: 0 },
    { expectCredits: 21 },
    { expectCredits: 1.5 },
    { expectCredits: "2" },
    { phone: 4842522523 },
  ];
  for (const b of bad) {
    G.resetLimits(); // eleven cases: the per-IP limit is not what is under test
    const res = await book.POST(bookReq({ ...BODY, ...b }));
    assert.equal(res.status, 400, JSON.stringify(b));
    assert.equal(V.fromSiteBook(res.status, await res.json()).status, "try_again", JSON.stringify(b));
  }
  assert.equal(calls.length, 0);
});

test("book: cross-site, no Origin, or a form body is 403; oversized or non-JSON is 400 — nothing sent", async () => {
  assert.equal((await book.POST(bookReq(BODY, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await book.POST(bookReq(BODY, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await book.POST(bookReq(BODY, { "content-type": "text/plain" }))).status, 403);
  const noOrigin = new Request(`${OWN}/api/my-bookings/pack/book`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(BODY),
  });
  assert.equal((await book.POST(noOrigin)).status, 403);
  assert.equal((await book.POST(bookReq("{not json"))).status, 400);
  assert.equal((await book.POST(bookReq({ ...BODY, pad: "x".repeat(5000) }))).status, 400);
  assert.equal(calls.length, 0);
});

test("book: the per-IP limit refuses the 11th press in ten minutes, before the platform is called", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await book.POST(bookReq())).status, 200);
  const res = await book.POST(bookReq());
  assert.equal(res.status, 429);
  assert.equal(V.fromSiteBook(res.status, await res.json()).status, "slow_down");
  assert.equal(calls.length, 10);
  // Another visitor is not affected.
  assert.equal((await book.POST(bookReq(BODY, { "x-real-ip": "203.0.113.8" }))).status, 200);
});

test("book: maxDuration covers packBook's 25 s wait (S1: at least 30)", () => {
  assert.ok(Number.isInteger(book.maxDuration) && book.maxDuration >= 30, String(book.maxDuration));
  assert.equal(book.GET, undefined);
});

/* ── source reads ──────────────────────────────────────────────────────── */

const read = (p) => readFileSync(join(ROOT, p), "utf8");
/** Code with comments removed. Keeps "https://". */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const rel = (f) => f.slice(ROOT.length + 1).split(sep).join("/");
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const sources = () =>
  [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))].filter((f) => SOURCE.test(f) && !/\.test\.mjs$/.test(f));
const isClient = (src) => /^\s*["']use client["']/m.test(src);

const PAGE = "app/my-bookings/pack/page.tsx";
const CONFIRM = "app/my-bookings/_components/PackConfirm.tsx";
const BOOK_ROUTE = "app/api/my-bookings/pack/book/route.ts";

test("the book route runs the per-IP limit FIRST and forwards the IP (S1's ask; the five sign-in routes' rule)", () => {
  const src = code(read(BOOK_ROUTE));
  const cross = src.indexOf("refuseCrossSite(req)");
  const body = src.indexOf("readJsonBody(req)");
  const limit = src.indexOf("hit(`pack-book:${ip}`");
  const call = src.search(/\bpackBook\(/);
  assert.ok(cross > 0 && cross < body && body < limit, "refuseCrossSite → readJsonBody → hit, in that order");
  assert.ok(call > limit, "the platform is called before the limit");
  assert.match(src, /\bpackBook\([^)]*\bip\)/, "the IP is not forwarded");
  // The device token is the cookie's, never the body's.
  assert.match(src, /readDeviceToken\(\)/);
  assert.doesNotMatch(src, /body\.(token|deviceToken)/);
});

test("every POST route that uses lib/my-bookings starts with refuseCrossSite — the pack book route included", () => {
  const routes = walk(join(ROOT, "app", "api")).filter(
    (f) => /[\\/]route\.ts$/.test(f) && /@\/lib\/my-bookings\//.test(readFileSync(f, "utf8")),
  );
  assert.ok(routes.map(rel).includes(BOOK_ROUTE));
  for (const f of routes) {
    const src = code(readFileSync(f, "utf8"));
    if (!/export async function POST/.test(src)) continue;
    assert.match(
      src,
      /export async function POST\(req: Request\) \{\s*const refused = refuseCrossSite\(req\)\s*if \(refused\) return refused/,
      rel(f),
    );
  }
});

test("⛔ no \"use client\" file imports platform.ts or session-server.ts (the relay secret and cookies stay on the server)", () => {
  const clients = sources().filter((f) => isClient(readFileSync(f, "utf8")));
  assert.ok(clients.map(rel).includes(CONFIRM), "PackConfirm is a client component");
  for (const f of clients) {
    assert.doesNotMatch(
      readFileSync(f, "utf8"),
      /from\s+["'](?:@\/lib\/my-bookings\/|\.{1,2}\/(?:[\w.-]+\/)*)(?:platform|session-server)["']/,
      rel(f),
    );
  }
});

test("a sign-in's `next` is allow-listed where it is USED: every navigation goes through nextPathOf", () => {
  for (const f of [
    "app/my-bookings/_components/CodeForm.tsx",
    "app/my-bookings/_components/OpenButton.tsx",
    "app/my-bookings/_components/NotYou.tsx",
  ]) {
    const src = code(read(f));
    assert.match(src, /window\.location\.assign\(nextPathOf\(next\)\)/, f);
    for (const m of src.matchAll(/window\.location\.assign\(([^)]*)\)/g)) {
      assert.match(m[1], /^nextPathOf\(next$/, `${f}: assign(${m[1]})`);
    }
    assert.match(src, /next\?: NextPath/, `${f}: next is not typed to the allow-list`);
  }
  // RequestPanel only hands its `next` on, to CodeForm.
  const panel = code(read("app/my-bookings/_components/RequestPanel.tsx"));
  assert.doesNotMatch(panel, /window\.location/);
  assert.match(panel, /<CodeForm [^>]*next=\{next\}/);
});

test("the emailed link resumes the pack booking: /my-bookings/open sends the guest on to the pack page only while a slot is parked", () => {
  const src = code(read("app/my-bookings/open/page.tsx"));
  assert.match(src, /await readPackSelection\(\)/);
  assert.match(src, /const next: NextPath = sel \? "\/my-bookings\/pack" : "\/my-bookings"/);
  assert.match(src, /<OpenButton [^>]*next=\{next\}/);
  // "Send a new link" goes back to where the guest was, too.
  assert.match(src, /href=\{next\}/);
});

test("the pack page: quote with the device token and the visitor's IP; a fresh request key per render; sign-in comes back here", () => {
  const src = code(read(PAGE));
  assert.match(src, /export const dynamic = "force-dynamic"/);
  assert.match(src, /await readPackSelection\(\)/);
  assert.match(src, /await packQuote\(sel, clientIpOf\(await headers\(\)\), token\)/);
  assert.match(src, /requestKey=\{mintRequestKey\(\)\}/);
  assert.match(src, /<RequestPanel [^>]*next="\/my-bookings\/pack"/);
  assert.match(src, /<NotYou [^>]*next="\/my-bookings\/pack"/);
  // The Book form appears only for a 'match' quote with a choice (view.ts nulls both otherwise).
  assert.match(src, /view\.session === "match" && view\.choice/);
});

test("PACKS_LIVE gates every link to /5-pack on the booking pages (they deploy unlinked)", () => {
  for (const f of [PAGE, CONFIRM]) {
    const src = code(read(f));
    for (const line of src.split("\n")) {
      if (!/\bPACK_PATH\b/.test(line) || /^\s*import\b/.test(line)) continue;
      assert.match(line, /PACKS_LIVE \?/, `${f}: an ungated /5-pack link: ${line.trim()}`);
    }
  }
  // The buy link is passed down already gated, never rebuilt in the client component.
  assert.doesNotMatch(code(read(CONFIRM)), /\bPACK_PATH\b|\bPACKS_LIVE\b/);
});

test("the booking pages print every sentence with the club's phone through PhoneText", () => {
  for (const f of [PAGE, CONFIRM]) {
    const src = code(read(f));
    assert.match(src, /<PhoneText /, f);
    assert.doesNotMatch(src, />\s*\{\s*(refusalText|bookMessage)\(/, f);
  }
});

test("the booked screen's Cancel goes to My bookings with the series, and its Book again to OUR pack link", () => {
  const src = code(read(CONFIRM));
  assert.match(src, /`\/my-bookings\?cancel=\$\{encodeURIComponent\(/);
  assert.match(src, /href=\{bookAgainUrl\}/);
  // The book answer is read through this site's allow-list, never trusted raw.
  assert.match(src, /fromSiteBook\(r\.status, r\.json\)/);
  assert.match(src, /postJson\("\/api\/my-bookings\/pack\/book", \{/);
});
