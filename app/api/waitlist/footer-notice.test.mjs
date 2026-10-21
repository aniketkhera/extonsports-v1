/* The footer bar's "Join our mailing list" (POST /api/waitlist) sends the new staff
   notice, 2026-10-21 (app/api/waitlist/footer-notice.ts, wired by route.ts beside it).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   Aniket, 2026-10-21: the footer's signups get the same new notice as the My bookings
   popup, for Exton only, without changing mailer-admin (a package several sites share).
   So the footer still runs mailer-admin's own subscribe route, unedited; footer-notice.ts
   only hands it a copy of the config with no notify list (so its plain notice is off) and
   sends the new one itself, for a genuinely new address only.

   These tests run the REAL package route. Only `fetch` is fake: it answers the PostgREST
   calls from an in-memory table and records Resend calls instead of sending them, so
   nothing here can reach Supabase or Resend. Each case runs twice on twin stores, once
   through the package as it was wired before (createSubscribeRoute(config)) and once
   through the wrapper, and the two must leave the same rows, send the same welcome, and
   answer the browser byte for byte the same. Only the staff notice may differ. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* As in board-lib.test.mjs, plus one: mailer-admin ships TypeScript source, which Node
   will not strip under node_modules, so its files are stripped here. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? ".ts" : ".js"), context);
    }
  },
  load(url, context, nextLoad) {
    if (/\/node_modules\/mailer-admin\/src\/.+\.ts$/.test(url)) {
      return { format: "module", source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), "utf8")), shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(path.join(HERE, rel), "utf8");

// Fake credentials, set before the config loads; the fake fetch below is the only network.
delete process.env.MAILER_SUPABASE_URL;
delete process.env.MAILER_SUPABASE_SERVICE_ROLE_KEY;
delete process.env.RESEND_BASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mailers.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.RESEND_API_KEY = "re_test_not_a_key";

/* ── the only network: an in-memory PostgREST + a Resend that records ─────── */

let backend = null;
globalThis.fetch = async (input, init = {}) => {
  if (!backend) throw new Error(`fetch with no fake backend: ${String(input)}`);
  return backend.handle(new URL(String(input)), init);
};

const WELCOME = { subject: "Welcome to Exton Sports", body_md: "Hello **there**.", enabled: true };

/** PostgREST's ilike as the routes use it: `_` one character, `*`/`%` any run. */
function ilike(pattern, value) {
  if (typeof value !== "string") return false;
  const re = "^" + pattern.split("").map((ch) => (ch === "_" ? "." : ch === "*" || ch === "%" ? ".*" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("") + "$";
  return new RegExp(re, "is").test(value);
}
function matches(row, col, spec) {
  if (spec === "is.null") return row[col] == null;
  if (spec === "not.is.null") return row[col] != null;
  if (spec.startsWith("eq.")) return row[col] === spec.slice(3);
  if (spec.startsWith("ilike.")) return ilike(spec.slice(6), row[col]);
  if (spec.startsWith("gte.")) return row[col] >= spec.slice(4);
  throw new Error(`fake PostgREST: unsupported filter ${col}=${spec}`);
}

function fakeBackend({ subscribers = [], welcome = WELCOME, fail = () => false } = {}) {
  let n = 0;
  const rows = subscribers.map((r) => ({
    id: `id-${++n}`, unsubscribe_token: `tok-${n}`, unsubscribed_at: null, tags: [], ...r,
  }));
  const db = [];     // every PostgREST call: { method, table, q, body }
  const emails = []; // every Resend send, as the API received it
  async function handle(url, init) {
    const method = (init.method || "GET").toUpperCase();
    if (url.origin === "https://api.resend.com") {
      assert.equal(`${method} ${url.pathname}`, "POST /emails", "only single sends are expected");
      const body = JSON.parse(init.body);
      if (fail({ email: body })) return Response.json({ name: "application_error", message: "fake Resend down" }, { status: 500 });
      emails.push(body);
      return Response.json({ id: `em_${emails.length}` });
    }
    if (url.origin !== "https://mailers.example.test") throw new Error(`unexpected fetch ${url.origin}`);
    const table = url.pathname.replace(/^\/rest\/v1\//, "");
    const q = Object.fromEntries(url.searchParams);
    const call = { method, table, q, body: init.body ? JSON.parse(init.body) : undefined };
    db.push(call);
    if (fail(call)) return new Response('{"message":"fake PostgREST down"}', { status: 503 });
    if (table === "welcome_emails" && method === "GET") return Response.json(welcome ? [welcome] : []);
    assert.equal(table, "subscribers", `unexpected table ${table}`);
    const filters = Object.entries(q).filter(([k]) => !["select", "limit", "offset", "order"].includes(k));
    const hit = (r) => filters.every(([k, v]) => matches(r, k, v));
    if (method === "GET") {
      const cols = (q.select || "*").split(",");
      const out = rows.filter(hit).slice(0, q.limit ? Number(q.limit) : undefined)
        .map((r) => (cols[0] === "*" ? { ...r } : Object.fromEntries(cols.map((c) => [c, r[c] ?? null]))));
      return Response.json(out);
    }
    if (method === "HEAD") {
      assert.match(new Headers(init.headers).get("prefer") || "", /count=exact/);
      return new Response(null, { status: 200, headers: { "content-range": `*/${rows.filter(hit).length}` } });
    }
    if (method === "POST") {
      const row = JSON.parse(init.body);
      if (rows.some((r) => r.property === row.property && r.email === row.email)) {
        return new Response('{"code":"23505","message":"duplicate key"}', { status: 409 });
      }
      const saved = { id: `id-${++n}`, unsubscribe_token: `tok-${n}`, unsubscribed_at: null, ...row };
      rows.push(saved);
      return Response.json([saved], { status: 201 });
    }
    if (method === "PATCH") {
      const patch = JSON.parse(init.body);
      for (const r of rows.filter(hit)) Object.assign(r, patch);
      return new Response(null, { status: 204 });
    }
    throw new Error(`fake PostgREST: unsupported ${method}`);
  }
  return { rows, db, emails, handle };
}

/* ── the two routes under test ─────────────────────────────────────────────── */

const { createSubscribeRoute } = await import("mailer-admin/api/subscribe");
const { NextRequest } = await import("next/server");
const F = await import("./footer-notice.ts");
const { config } = await import("../../../mailer-admin.config.ts");

// The real config, with test addresses in place of the staff list.
const CFG = { ...config, notifyEmail: ["owner@example.test", "desk@example.test"] };
const AT = new Date("2026-10-21T20:18:00Z");

// mailer-admin's rate limiter is one module-level map keyed by IP, shared by every route
// built here, so each request gets its own address unless a test means otherwise.
let ipSeq = 0;
const freshIp = () => `198.51.100.${++ipSeq}`;

function post(body, { ip = freshIp(), headers = {}, raw } = {}) {
  return new NextRequest("https://extonsports.com/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1`, ...headers },
    body: raw ?? JSON.stringify(body),
  });
}

/** Run one request through the package as wired before 2026-10-21 (its own plain
 *  notice on) and one through the wrapper, each on its own copy of the same store. */
async function twin(seed, makeRequest, { cfg = CFG } = {}) {
  const before = fakeBackend(seed);
  backend = before;
  const beforeRes = await createSubscribeRoute(cfg).POST(makeRequest());

  const after = fakeBackend(seed);
  backend = after;
  const deferred = [];
  const logs = [];
  const { POST } = F.createFooterSubscribe(cfg, { defer: (w) => deferred.push(w), now: () => AT, log: (m) => logs.push(m) });
  const afterRes = await POST(makeRequest());
  const emailsAtResponse = after.emails.length;
  for (const w of deferred.splice(0)) await w();
  backend = null;
  return {
    before, after, logs, emailsAtResponse,
    beforeRes: await snapshot(beforeRes), afterRes: await snapshot(afterRes),
  };
}

async function snapshot(res) {
  return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
}

const ROW_KEYS = ["property", "email", "unsubscribed_at", "source", "first_name", "last_name", "tags", "referrer", "utm_source", "utm_medium", "utm_campaign", "country", "region", "city"];
const rowsOf = (be) => be.rows.map((r) => Object.fromEntries(ROW_KEYS.map((k) => [k, r[k] ?? null])));
const isNotify = (e) => Array.isArray(e.to) && e.to.includes("owner@example.test");
const welcomes = (be) => be.emails.filter((e) => !isNotify(e)).map((e) => ({ from: e.from, to: e.to, subject: e.subject }));
const notices = (be) => be.emails.filter(isNotify);

/** What the browser and the subscriber see must not move: same answer, same rows, same welcome. */
function assertSamePublicBehaviour(t, label) {
  assert.deepEqual(t.afterRes, t.beforeRes, `${label}: the browser's answer`);
  assert.deepEqual(rowsOf(t.after), rowsOf(t.before), `${label}: the subscribers table`);
  assert.deepEqual(welcomes(t.after), welcomes(t.before), `${label}: the welcome email`);
}

const words = (html) => html
  .replace(/<div style="display:none[^"]*">[\s\S]*?<\/div>/, "")
  .replace(/<wbr>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

const SIGNUP = {
  name: "Priya K", email: "Priya.K@Gmail.com",
  referrer: "https://www.google.com/search?q=badminton+exton",
  utm_source: "instagram", utm_medium: "social", utm_campaign: "fall-open-house",
};
const GEO = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "PA", "x-vercel-ip-city": "West%20Chester" };
const ACTIVE_TWO = [
  { property: "extonsports", email: "a@example.com" },
  { property: "extonsports", email: "b@example.com" },
  { property: "extonsports", email: "gone@example.com", unsubscribed_at: "2026-09-01T00:00:00Z" },
  { property: "squashtigers", email: "c@example.com" },
];

/* ── a brand-new address ─────────────────────────────────────────────────── */

test("a NEW address: the package does exactly what it did; the staff get the new notice, not the plain one", async () => {
  const t = await twin({ subscribers: ACTIVE_TWO }, () => post(SIGNUP, { headers: GEO }));
  assertSamePublicBehaviour(t, "new");
  assert.equal(t.afterRes.status, 200);
  assert.deepEqual(JSON.parse(t.afterRes.body), { success: true });

  // The package's own work, unchanged: one row with name, UTM, referrer, geo; one welcome.
  const row = t.after.rows.find((r) => r.email === "priya.k@gmail.com");
  assert.equal(row.first_name, "Priya");
  assert.equal(row.utm_campaign, "fall-open-house");
  assert.equal(row.city, "West Chester");
  assert.deepEqual(welcomes(t.after), [{ from: "Exton Sports Center <noreply@extonsports.com>", to: "priya.k@gmail.com", subject: WELCOME.subject }]);

  // Before: mailer-admin's plain notice. After: only ours.
  assert.equal(notices(t.before).length, 1);
  assert.match(notices(t.before)[0].subject, /^New Exton Sports Center signup/);
  const sent = notices(t.after);
  assert.equal(sent.length, 1, "exactly one notice");
  const n = sent[0];
  assert.deepEqual(n.to, ["owner@example.test", "desk@example.test"]);
  assert.equal(n.from, "Exton Sports Center <noreply@extonsports.com>");
  assert.equal(n.reply_to, "info@extonsports.com");
  assert.equal(n.subject, "New signup: priya.k@gmail.com");
  const w = words(n.html);
  for (const s of [
    "Joined from the mailing-list form on extonsports.com, and our welcome email has gone out.",
    "Name Priya K",
    "When Wed, Oct 21, 2026 · 4:18 PM ET",
    "Near West Chester, PA (approximate)",
    "Signed up via Mailing-list form utm: instagram / social / fall-open-house · from google.com",
    // Two active Exton rows before, plus this one; the unsubscribed and the other
    // property's rows do not count.
    "On the list now 3 people",
  ]) assert.ok(w.includes(s), `missing: ${s}\n${w}`);
  assert.doesNotMatch(n.html, /Open subscribers|\/admin|search\?q=/);
  assert.ok(n.text.includes("New signup: priya.k@gmail.com"));
});

test("the notice is sent after the answer, never before it (route.ts runs it in after())", async () => {
  const t = await twin({}, () => post({ email: "new@example.com" }));
  // At the moment the wrapper answered, only the package's welcome had gone.
  assert.equal(t.emailsAtResponse, 1);
  assert.equal(notices(t.after).length, 1);
});

/* ── never for an address the list already has ───────────────────────────── */

test("an address already ACTIVE: same answer, no row change, no welcome, and no notice", async () => {
  const seed = { subscribers: [{ property: "extonsports", email: "priya.k@gmail.com", source: "my-bookings-popup" }] };
  const t = await twin(seed, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "active");
  assert.equal(t.after.emails.length, 0);
  assert.equal(t.before.emails.length, 0);
});

test("an UNSUBSCRIBED address signing up again on the footer: the package resubscribes it, as before; no notice", async () => {
  const seed = { subscribers: [{ property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" }] };
  const t = await twin(seed, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "resubscribe");
  assert.equal(t.after.rows[0].unsubscribed_at, null, "the explicit footer signup still clears the opt-out");
  assert.ok(t.after.db.some((c) => c.method === "PATCH"));
  assert.equal(t.after.emails.length, 0, "no welcome again, and no notice");
});

test("a row stored in another case or with spaces counts as the same person: no notice (the package's behaviour is its own)", async () => {
  // mailer-admin dedupes on the exact lower-cased address, so it adds a second row here and
  // welcomes it, and its plain notice called that a new signup. Not this one: the staff
  // notice uses the popup's lookup (any case, spaces either side), and says nothing.
  const seed = { subscribers: [{ property: "extonsports", email: " Priya.K@Gmail.com ", unsubscribed_at: "2026-09-30T14:00:00Z" }] };
  const t = await twin(seed, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "look-alike");
  assert.equal(notices(t.before).length, 1, "the package alone would have announced it");
  assert.equal(notices(t.after).length, 0);
});

test("the same address on ANOTHER property's list does not stop Exton's notice", async () => {
  const seed = { subscribers: [{ property: "squashtigers", email: "priya.k@gmail.com" }] };
  const t = await twin(seed, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "other property");
  assert.equal(notices(t.after).length, 1);
});

/* ── doubt means no notice ───────────────────────────────────────────────── */

test("the lookup before the signup fails: the package still signs them up; no notice (fail closed)", async () => {
  const fail = (c) => c.method === "GET" && c.table === "subscribers" && /^ilike\./.test(c.q?.email || "");
  const t = await twin({ fail }, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "lookup down");
  assert.equal(welcomes(t.after).length, 1, "the package's own path was unaffected");
  assert.equal(notices(t.after).length, 0);
  assert.equal(t.logs.length, 1);
  assert.doesNotMatch(t.logs.join("\n"), /priya/i, "the log never carries the address");
});

test("the package's insert fails: no row, so no notice", async () => {
  const fail = (c) => c.method === "POST" && c.table === "subscribers";
  const t = await twin({ fail }, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "insert refused");
  assert.equal(t.after.rows.length, 0);
  assert.equal(notices(t.after).length, 0);
  assert.equal(notices(t.before).length, 0);
});

test("no database configured: the package's answer, no lookups, no emails", async () => {
  const cfg = { ...CFG, supabase: () => ({}) };
  const t = await twin({}, () => post(SIGNUP), { cfg });
  assertSamePublicBehaviour(t, "unconfigured");
  assert.equal(t.after.db.length, 0);
  assert.equal(t.after.emails.length, 0);
});

/* ── the welcome sentence tells the truth ────────────────────────────────── */

test("welcome switched off (the row, or the site switch): no welcome, and the notice says so", async () => {
  for (const [label, seed, cfg] of [
    ["row disabled", { welcome: { ...WELCOME, enabled: false } }, CFG],
    ["no row", { welcome: null }, CFG],
    ["blank body", { welcome: { ...WELCOME, body_md: " " } }, CFG],
    ["welcomeEmails false", {}, { ...CFG, welcomeEmails: false }],
  ]) {
    const t = await twin(seed, () => post({ email: "new@example.com" }), { cfg });
    assertSamePublicBehaviour(t, label);
    assert.equal(welcomes(t.after).length, 0, label);
    const w = words(notices(t.after)[0].html);
    assert.ok(w.includes("Joined from the mailing-list form on extonsports.com. Our welcome email is switched off, so none was sent."), `${label}: ${w}`);
  }
});

test("the welcome row cannot be read: the notice makes no claim about the welcome", async () => {
  const fail = (c) => c.table === "welcome_emails";
  const t = await twin({ fail }, () => post({ email: "new@example.com" }));
  assertSamePublicBehaviour(t, "welcome row down");
  const w = words(notices(t.after)[0].html);
  assert.ok(w.includes("Joined from the mailing-list form on extonsports.com. When"), w);
  assert.doesNotMatch(w, /welcome email/);
});

test("the list count fails: that row is left out, the rest goes", async () => {
  const fail = (c) => c.method === "HEAD";
  const t = await twin({ fail }, () => post({ email: "new@example.com" }));
  const w = words(notices(t.after)[0].html);
  assert.doesNotMatch(w, /On the list now/);
  assert.ok(w.includes("New signup") || w.includes("NEW SIGNUP"));
});

test("the notice fails to send: the visitor's answer was already the package's, and it is only logged", async () => {
  const fail = (c) => !!c.email && isNotify(c.email);
  const t = await twin({ fail }, () => post(SIGNUP));
  assertSamePublicBehaviour(t, "notice down");
  assert.equal(notices(t.after).length, 0);
  assert.equal(t.logs.length, 1);
  assert.doesNotMatch(t.logs[0], /priya/i);
});

/* ── requests the package turns away are turned away the same ─────────────── */

test("malformed: not JSON, no address, a bad address → the package's own 400, and the wrapper looks nothing up", async () => {
  for (const [label, make] of [
    ["not json", () => post(null, { raw: "{not json" })],
    ["no address", () => post({ name: "Priya" })],
    ["bad address", () => post({ email: "a@b" })],
    ["an array", () => post(["p@x.com"])],
  ]) {
    const t = await twin({}, make);
    assertSamePublicBehaviour(t, label);
    assert.equal(t.afterRes.status, 400, label);
    assert.equal(t.after.db.length, 0, label);
    assert.equal(t.after.emails.length, 0, label);
  }
});

test("per IP: the package's 5 a minute still holds; the 6th is its own 429 and the wrapper looks nothing up", async () => {
  const be = fakeBackend();
  backend = be;
  const deferred = [];
  const { POST } = F.createFooterSubscribe(CFG, { defer: (w) => deferred.push(w), now: () => AT, log: () => {} });
  const ip = "203.0.113.77";
  for (let i = 0; i < 5; i++) assert.equal((await POST(post({ email: `p${i}@example.com` }, { ip }))).status, 200, `request ${i + 1}`);
  const before = be.db.length;
  const sixth = await POST(post({ email: "p6@example.com" }, { ip }));
  assert.equal(sixth.status, 429);
  assert.equal(be.db.length, before, "no lookup for a request the package refuses");
  for (const w of deferred.splice(0)) await w();
  assert.equal(notices(be).length, 5);
  backend = null;
});

test("a site with a honeypot: a filled one gets the package's silent success, and no lookup or notice", async () => {
  const cfg = { ...CFG, honeypotField: "company" };
  const t = await twin({}, () => post({ email: "bot@example.com", company: "Spam LLC" }), { cfg });
  assertSamePublicBehaviour(t, "honeypot");
  assert.equal(t.after.db.length, 0);
  assert.equal(t.after.emails.length, 0);
});

/* ── the wiring ──────────────────────────────────────────────────────────── */

test("route.ts: the package's route through the wrapper, the notice in after(), and mailer-admin left alone", () => {
  const route = read("route.ts");
  assert.match(route, /import \{[^}]*\bafter\b[^}]*\} from ['"]next\/server['"]/);
  assert.match(route, /createFooterSubscribe\(config,/);
  assert.match(route, /after\(/);
  const core = read("footer-notice.ts");
  assert.match(core, /createSubscribeRoute\(\{ \.\.\.cfg, notifyEmail: null \}\)/, "the package's plain notice is switched off by config, not by editing it");
  assert.doesNotMatch(core, /updateRows|insertRow/, "the wrapper writes nothing; every write is the package's");
});
