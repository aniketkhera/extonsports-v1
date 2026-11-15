/* The waiver signing link's mailing-list box, 2026-11-15
   (app/api/mailing-list-optin/server/server-core.ts, wired by route.ts beside it).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   The platform's server posts {email, source: "waiver-link"} with a shared secret when a
   waiver signer leaves the default-ticked mailing-list box ticked. The insert-only rule is
   the popup's (../optin-core.test.mjs pins it in full); this file pins the server route's
   own terms: the secret, the total cap, the source, no geo, and that the rule still holds
   through it. The database and email are mocks; nothing here reaches Supabase or Resend. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(HERE, rel), "utf8");

const S = await import("./server-core.ts");
const C = await import("../optin-core.ts");

/* ── the fakes (as in ../optin-core.test.mjs) ─────────────────────────────── */

const SITE = {
  property: "extonsports",
  brandName: "Exton Sports Center",
  notifyEmail: ["owner@example.test"],
  welcomeEmails: true,
};
const WELCOME = { subject: "Welcome to Exton Sports", body_md: "Hello.", enabled: true };
const SECRET = "test-secret-0123456789abcdef";

function fakeDb({ subscribers = [] } = {}) {
  const calls = [];
  const rows = subscribers.map((r) => ({ ...r }));
  const impl = {
    configured: () => true,
    async selectRows(table, opts) {
      calls.push({ op: "select", table, opts });
      if (table === "welcome_emails") return [WELCOME];
      const pattern = opts.filters.email.replace(/^ilike\./, "");
      const re = new RegExp("^" + pattern.split("").map((ch) => (ch === "_" ? "." : ch === "*" || ch === "%" ? ".*" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("") + "$", "is");
      const prop = opts.filters.property.replace(/^eq\./, "");
      return rows.filter((r) => r.property === prop && re.test(r.email)).slice(0, opts.limit ?? 1000).map((r) => ({ email: r.email }));
    },
    async insertRow(table, row) {
      calls.push({ op: "insert", table, row });
      const saved = { ...row, unsubscribe_token: "tok-123", unsubscribed_at: null };
      rows.push(saved);
      return saved;
    },
  };
  // Any other method (an update, a delete) is recorded and throws, so a test sees it.
  const db = new Proxy(impl, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === "symbol" || prop === "then") return undefined;
      return (...args) => { calls.push({ op: String(prop), args }); throw new Error(`db.${String(prop)} must never be called`); };
    },
  });
  return { db, calls, rows };
}

function fakeMail() {
  const sent = [];
  return { sent, mail: { async send(a) { sent.push(a); }, welcomeHtml: (a) => `<html>${a.subject}|${a.token}</html>` } };
}

const BRAND = {
  name: "Exton Sports Center",
  host: "extonsports.com",
  theme: { accent: "#F37A4A", pageBg: "#FDF4EE", panelBg: "#FFFFFF", headerBg: "#FBF3EC", border: "#E8D5C8", borderSoft: "#F4E8DD", text: "#0D0D0D", mutedText: "#8C7B6E" },
};

function deps({ db, mail, secret = SECRET, allow = () => true }) {
  const logs = [];
  const notice = { brand: BRAND, countActive: async () => 412, send: (a) => mail.send(a), log: (m) => logs.push(m) };
  return {
    logs,
    deps: { site: SITE, db, mail, notice, now: () => new Date("2026-11-15T15:00:00Z"), secret: () => secret, allow, log: (m) => logs.push(m) },
  };
}

function req(body, { auth = `Bearer ${SECRET}`, headers = {}, raw } = {}) {
  const h = new Headers({ "content-type": "application/json", ...(auth ? { authorization: auth } : {}), ...headers });
  return { headers: h, json: async () => (raw !== undefined ? JSON.parse(raw) : body) };
}

const OK = { status: 200, body: { ok: true } };
const GOOD = { email: "priya.k@gmail.com", source: "waiver-link" };
const words = (html) => html.replace(/<div style="display:none[^"]*">[\s\S]*?<\/div>/, "").replace(/<wbr>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/ ([.,])/g, "$1").trim();

/* ── the secret ─────────────────────────────────────────────────────────── */

test("EXTON_OPTIN_SECRET unset or blank: 503 not configured, and nothing done", async () => {
  for (const secret of [undefined, "", "   "]) {
    const { db, calls } = fakeDb();
    const { mail, sent } = fakeMail();
    const { deps: base, logs } = deps({ db, mail });
    // Not through deps()'s default, which would turn `undefined` back into SECRET.
    const d = { ...base, secret: () => secret };
    const reply = await S.handleServerOptin(req(GOOD), d);
    assert.deepEqual({ status: reply.status, body: reply.body }, { status: 503, body: { error: "not configured" } }, JSON.stringify(secret));
    assert.equal(reply.work, null);
    assert.equal(calls.length, 0);
    assert.equal(sent.length, 0);
    assert.equal(logs.length, 1, "the operator is told why");
  }
  // Even with a Bearer that would equal a blank secret: no secret is never "matches".
  const { db } = fakeDb();
  const { mail } = fakeMail();
  assert.equal((await S.handleServerOptin(req(GOOD, { auth: "Bearer " }), deps({ db, mail, secret: "" }).deps)).status, 503);
});

test("a missing or wrong secret: 401 unauthorized, no work, and the body is never read", async () => {
  for (const auth of [
    null,
    "",
    SECRET,                       // no scheme
    `Basic ${SECRET}`,
    "Bearer",
    "Bearer ",
    "Bearer wrong",
    `Bearer ${SECRET}x`,
    `Bearer ${SECRET.slice(0, -1)}`,
    `Bearer ${SECRET.toUpperCase()}`,
  ]) {
    const { db, calls } = fakeDb();
    const { mail, sent } = fakeMail();
    const { deps: d } = deps({ db, mail });
    let read = false;
    const r = req(GOOD, { auth });
    const reply = await S.handleServerOptin({ headers: r.headers, json: async () => { read = true; return GOOD; } }, d);
    assert.deepEqual({ status: reply.status, body: reply.body }, { status: 401, body: { error: "unauthorized" } }, String(auth));
    assert.equal(reply.work, null);
    assert.equal(read, false, `${auth}: the body is not read before the secret checks out`);
    assert.equal(calls.length, 0);
    assert.equal(sent.length, 0);
  }
});

test("the right secret: case-insensitive scheme, spaces around it (in the header or the env) forgiven", async () => {
  for (const [auth, secret] of [
    [`Bearer ${SECRET}`, SECRET],
    [`bearer ${SECRET}`, SECRET],
    [`Bearer   ${SECRET}  `, SECRET],
    [`Bearer ${SECRET}`, `  ${SECRET}\n`],
  ]) {
    const { db } = fakeDb();
    const { mail } = fakeMail();
    const reply = await S.handleServerOptin(req(GOOD, { auth }), deps({ db, mail, secret }).deps);
    assert.deepEqual({ status: reply.status, body: reply.body }, OK, auth);
  }
});

test("secretMatches: constant-time over SHA-256 digests, so unequal lengths compare without throwing", () => {
  assert.equal(S.secretMatches("abc", "abc"), true);
  assert.equal(S.secretMatches("abc", "abd"), false);
  assert.equal(S.secretMatches("a", "a".repeat(500)), false);
  assert.equal(S.secretMatches("", "x"), false);
  const core = read("server-core.ts");
  assert.match(core, /timingSafeEqual/);
  assert.doesNotMatch(core, /given\s*===\s*secret|secret\s*===\s*given/, "never a plain === on the secret");
});

/* ── the source, and the rule through this route ────────────────────────── */

test("a NEW address: 200 {ok:true}, inserted with source waiver-link and no geo, welcomed, staff told it came from the waiver", async () => {
  const { db, calls, rows } = fakeDb();
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  // Vercel's geo headers on this request describe the PLATFORM's server, not the signer.
  const reply = await S.handleServerOptin(req({ email: "  Priya.K@Gmail.com ", source: "waiver-link" }, {
    headers: { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "VA", "x-vercel-ip-city": "Ashburn" },
  }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, OK);
  assert.equal(calls.length, 0, "nothing touches the database before the answer");

  assert.equal(await reply.work(), "added");
  const insert = calls.find((c) => c.op === "insert");
  assert.deepEqual(insert.row, {
    property: "extonsports", email: "priya.k@gmail.com", source: "waiver-link",
    country: null, region: null, city: null,
  });
  assert.equal(rows.length, 1);

  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, "priya.k@gmail.com", "the welcome first");
  assert.equal(sent[0].subject, WELCOME.subject);
  const notice = sent[1];
  assert.deepEqual(notice.to, SITE.notifyEmail);
  const w = words(notice.html);
  assert.ok(w.includes("Joined from the waiver signing link. The mailing-list box was ticked, and our welcome email has gone out."), w);
  assert.ok(w.includes("Signed up via Waiver signing link"), w);
  assert.doesNotMatch(w, /Ashburn|\bNear\b|My bookings/);
});

test("the source the caller sends must be waiver-link, and the row's source is the route's", async () => {
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail });
  for (const source of [undefined, "", "my-bookings-popup", "homepage", "Waiver-Link", " waiver-link", ["waiver-link"], 1]) {
    const reply = await S.handleServerOptin(req({ email: "p@x.com", source }), d);
    assert.equal(reply.status, 400, JSON.stringify(source));
    assert.equal(reply.work, null);
  }
  assert.equal(calls.length, 0);
  // Extra fields are ignored, never stored.
  const reply = await S.handleServerOptin(req({ email: "p@x.com", source: "waiver-link", property: "squashtigers", tags: ["vip"] }), d);
  await reply.work();
  const insert = calls.find((c) => c.op === "insert");
  assert.equal(insert.row.source, "waiver-link");
  assert.equal(insert.row.property, "extonsports");
  assert.equal("tags" in insert.row, false);
});

test("insert-only holds through this route: active or UNSUBSCRIBED, any case or spacing, means nothing at all", async () => {
  for (const existing of [
    { property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: null, source: "homepage" },
    { property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" },
    { property: "extonsports", email: " Priya.K@Gmail.com\t", unsubscribed_at: "2026-09-30T14:00:00Z" },
  ]) {
    const { db, calls, rows } = fakeDb({ subscribers: [existing] });
    const { mail, sent } = fakeMail();
    const { deps: d } = deps({ db, mail });
    const reply = await S.handleServerOptin(req(GOOD), d);
    assert.deepEqual({ status: reply.status, body: reply.body }, OK, "the same answer as a new address");
    assert.equal(await reply.work(), "exists", existing.email);
    assert.deepEqual(calls.map((c) => c.op), ["select"], "one look, no write of any kind");
    assert.deepEqual(rows, [existing], "the row is exactly as it was, unsubscribed_at and all");
    assert.equal(sent.length, 0, "no welcome, no staff notice");
  }
});

test("new, active and unsubscribed get byte-identical answers, before any lookup (never reveal)", async () => {
  const answers = [];
  for (const subscribers of [
    [],
    [{ property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: null }],
    [{ property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" }],
  ]) {
    const { db, calls } = fakeDb({ subscribers });
    const { mail } = fakeMail();
    const reply = await S.handleServerOptin(req(GOOD), deps({ db, mail }).deps);
    assert.equal(calls.length, 0);
    answers.push(JSON.stringify({ status: reply.status, body: reply.body }));
    await reply.work();
  }
  assert.deepEqual([...new Set(answers)], [JSON.stringify(OK)]);
});

test("malformed: not JSON, not an object, or not an address → 400 and no work", async () => {
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail });
  for (const r of [
    req(null, { raw: "{not json" }),
    req(["p@x.com"]),
    req("p@x.com"),
    req(null),
    req({ source: "waiver-link" }),
    req({ email: "", source: "waiver-link" }),
    req({ email: 42, source: "waiver-link" }),
    req({ email: "a@b", source: "waiver-link" }),
    req({ email: "a".repeat(250) + "@b.co", source: "waiver-link" }),
  ]) {
    const reply = await S.handleServerOptin(r, d);
    assert.equal(reply.status, 400, JSON.stringify(reply.body));
    assert.equal(reply.work, null);
  }
  assert.equal(calls.length, 0);
});

/* ── the total cap ──────────────────────────────────────────────────────── */

test("a total of 30 a minute, whoever calls; the 31st is 429; a bad secret uses none of it", async () => {
  assert.equal(S.SERVER_LIMIT, 30);
  assert.equal(S.SERVER_WINDOW_MS, 60_000);
  let now = 1_000_000;
  const allow = S.createTotalCap(S.SERVER_LIMIT, S.SERVER_WINDOW_MS, () => now);
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail, allow });
  // Unauthorised calls first: they are refused before the cap is counted.
  for (let i = 0; i < 50; i++) assert.equal((await S.handleServerOptin(req(GOOD, { auth: "Bearer nope" }), d)).status, 401);
  for (let i = 0; i < 30; i++) {
    const ip = `203.0.113.${i}`; // a different IP each time changes nothing: the cap is total
    assert.equal((await S.handleServerOptin(req({ email: `p${i}@x.com`, source: "waiver-link" }, { headers: { "x-forwarded-for": ip } }), d)).status, 200, `call ${i + 1}`);
  }
  const over = await S.handleServerOptin(req(GOOD, { headers: { "x-forwarded-for": "198.51.100.7" } }), d);
  assert.equal(over.status, 429);
  assert.equal(over.work, null);
  assert.equal(calls.length, 0);
  now += 60_000;
  assert.equal((await S.handleServerOptin(req(GOOD), d)).status, 200, "the window turns over");
});

/* ── the popup is unchanged, and the wiring ─────────────────────────────── */

test("the popup's origin is unchanged: my-bookings-popup, and the notice's 'popup'", async () => {
  assert.equal(C.OPTIN_SOURCE, "my-bookings-popup");
  assert.deepEqual(C.POPUP_ORIGIN, { source: "my-bookings-popup", notice: "popup" });
  assert.deepEqual(S.WAIVER_ORIGIN, { source: "waiver-link", notice: "waiver" });
  // addIfNew with no origin is the popup's.
  const { db, calls } = fakeDb();
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  assert.equal(await C.addIfNew("p@x.com", { country: null, region: null, city: null }, d), "added");
  assert.equal(calls.find((c) => c.op === "insert").row.source, "my-bookings-popup");
  assert.ok(words(sent[1].html).includes("Joined from the My bookings popup on extonsports.com."));
});

test("route.ts answers first and works in after(); neither route nor the shared wiring has an update path", () => {
  const route = read("route.ts");
  assert.match(route, /import \{[^}]*\bafter\b[^}]*\} from ['"]next\/server['"]/);
  assert.match(route, /after\(/);
  assert.match(route, /handleServerOptin\(/);
  assert.match(route, /process\.env\.EXTON_OPTIN_SECRET/);
  assert.match(route, /createTotalCap\(/);
  for (const [name, src] of [["server/route.ts", route], ["server-core.ts", read("server-core.ts")], ["live-deps.ts", read("../live-deps.ts")], ["../route.ts", read("../route.ts")]]) {
    assert.doesNotMatch(src, /updateRows|resolution=merge|createSubscribeRoute|resubscribe|unsubscribed_at\s*:/, name);
  }
  // Both routes take their database and email from the one shared module.
  assert.match(read("../route.ts"), /from ['"]\.\/live-deps['"]/);
  assert.match(route, /from ['"]\.\.\/live-deps['"]/);
});
