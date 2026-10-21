/* The "add me to the mailing list" box in the My bookings popup, 2026-10-21
   (app/api/mailing-list-optin/optin-core.ts, wired by route.ts beside it).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   Aniket, 2026-10-21: "also adda a checkbox, checked by default - add to our mailing list?"
   A box that is ticked before anyone touches it may only ever ADD A NEW address. It must
   never undo an unsubscribe, and mailer-admin's shared subscribe route does exactly that on
   any repeat signup (it clears unsubscribed_at). So this route is its own: it looks for the
   address in ANY state, and when it finds one it does nothing at all. The database and the
   email layer are mocks here; nothing in this file can reach Supabase or Resend.
   Every rule below passes `tsc` when broken. */
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

const C = await import("./optin-core.ts");

/* ── the fakes ───────────────────────────────────────────────────────────── */

const SITE = {
  property: "extonsports",
  brandName: "Exton Sports Center",
  notifyEmail: ["owner@example.test", "desk@example.test"],
  welcomeEmails: true,
};
const WELCOME = { subject: "Welcome to Exton Sports", body_md: "Hello **there**.", enabled: true };

/** A fake `subscribers` + `welcome_emails` store that records every call made to it. The
 *  route is handed ONLY selectRows and insertRow (no update, no delete), and the Proxy turns
 *  any other method into a recorded call that throws, so a test sees it. */
function fakeDb({ subscribers = [], welcome = WELCOME, configured = true, selectFails = false, insertFails = false } = {}) {
  const calls = [];
  const rows = subscribers.map((r) => ({ ...r }));
  const impl = {
    configured: () => configured,
    async selectRows(table, opts) {
      calls.push({ op: "select", table, opts });
      if (selectFails) throw new Error("supabase select subscribers: 503 down");
      if (table === "welcome_emails") return welcome ? [welcome] : [];
      // PostgREST ilike, as the route uses it: `_` any one character, `*` (PostgREST's alias
      // for `%`) and `%` any run of characters, newlines included (flag s, as in Postgres),
      // case-insensitive, anchored at both ends.
      const pattern = opts.filters.email.replace(/^ilike\./, "");
      const re = new RegExp("^" + pattern.split("").map((ch) => (ch === "_" ? "." : ch === "*" || ch === "%" ? ".*" : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("") + "$", "is");
      const prop = opts.filters.property.replace(/^eq\./, "");
      return rows.filter((r) => r.property === prop && re.test(r.email)).slice(0, opts.limit ?? 1000).map((r) => ({ email: r.email }));
    },
    async insertRow(table, row, prefer) {
      calls.push({ op: "insert", table, row, prefer });
      if (insertFails) throw new Error('supabase insert subscribers: 409 {"code":"23505"}');
      const saved = { ...row, unsubscribe_token: "tok-123", unsubscribed_at: null };
      rows.push(saved);
      return saved;
    },
  };
  const db = new Proxy(impl, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === "symbol" || prop === "then") return undefined;
      return (...args) => { calls.push({ op: String(prop), args }); throw new Error(`db.${String(prop)} must never be called`); };
    },
  });
  return { db, calls, rows };
}

function fakeMail({ sendFails = () => false } = {}) {
  const sent = [];
  const welcomeRenders = [];
  return {
    sent,
    welcomeRenders,
    mail: {
      async send(a) { if (sendFails(a)) throw new Error("Resend send failed"); sent.push(a); },
      welcomeHtml(a) { welcomeRenders.push(a); return `<html>${a.subject}|${a.bodyMd}|${a.token}</html>`; },
    },
  };
}

/* The staff notice is lib/signup-notice.ts's (2026-10-21), shared with the footer. Its
   send goes through the same fake as the welcome, so `sent` holds both, in order. */
const AT = new Date("2026-10-21T20:18:00Z");
const BRAND = {
  name: "Exton Sports Center",
  host: "extonsports.com",
  logoUrl: "https://extonsports.com/logo.png",
  theme: { accent: "#F37A4A", pageBg: "#FDF4EE", panelBg: "#FFFFFF", headerBg: "#FBF3EC", border: "#E8D5C8", borderSoft: "#F4E8DD", text: "#0D0D0D", mutedText: "#8C7B6E" },
};

function deps({ db, mail, allow = () => true, site = SITE, count = async () => 412 }) {
  const logs = [];
  const notice = { brand: BRAND, countActive: count, send: (a) => mail.send(a), log: (m) => logs.push(m) };
  return { logs, deps: { site, db, mail, notice, now: () => AT, allow, log: (m) => logs.push(m) } };
}

/** The notice's words, tags dropped, for reading a sentence as a person would. */
const words = (html) => html
  .replace(/<div style="display:none[^"]*">[\s\S]*?<\/div>/, "")
  .replace(/<wbr>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&#39;/g, "'").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

/** A request the way route.ts hands it over: headers + a json() reader. */
function req(body, { ip = "203.0.113.9", contentType = "application/json", headers = {}, raw } = {}) {
  const h = new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1`, ...(contentType ? { "content-type": contentType } : {}), ...headers });
  return { headers: h, json: async () => (raw !== undefined ? JSON.parse(raw) : body) };
}

const ACCEPTED = { status: 202, body: { success: true } };

/* ── the never-resubscribe rule ─────────────────────────────────────────── */

test("a NEW address: inserted with source my-bookings-popup, welcomed, owner notified", async () => {
  const { db, calls, rows } = fakeDb();
  const { mail, sent, welcomeRenders } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "  Priya.K@Gmail.com ", website: "" }, {
    headers: { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "PA", "x-vercel-ip-city": "West%20Chester" },
  }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED);
  assert.equal(calls.length, 0, "nothing touches the database before the response is sent");
  assert.equal(typeof reply.work, "function");

  assert.equal(await reply.work(), "added");
  const insert = calls.find((c) => c.op === "insert");
  assert.equal(insert.table, "subscribers");
  assert.deepEqual(insert.row, {
    property: "extonsports", email: "priya.k@gmail.com", source: "my-bookings-popup",
    country: "US", region: "PA", city: "West Chester",
  });
  assert.equal(rows.length, 1);

  // The welcome is the footer's: the property's welcome_emails row, through the same shell,
  // with the new row's own unsubscribe token.
  assert.deepEqual(welcomeRenders, [{ subject: WELCOME.subject, bodyMd: WELCOME.body_md, token: "tok-123" }]);
  const welcome = sent.find((s) => s.to === "priya.k@gmail.com");
  assert.equal(welcome.subject, WELCOME.subject);
  assert.match(welcome.html, /tok-123/);

  // And the staff hear of it in the new notice (2026-10-21): where it came from, that the
  // welcome went out, roughly where they are, and how many are on the list now.
  const notify = sent.find((s) => Array.isArray(s.to));
  assert.deepEqual(notify.to, SITE.notifyEmail);
  assert.equal(notify.subject, "New signup: priya.k@gmail.com");
  const w = words(notify.html);
  for (const s of [
    "Joined from the My bookings popup on extonsports.com. The mailing-list box was ticked, and our welcome email has gone out.",
    "When Wed, Oct 21, 2026 · 4:18 PM ET",
    "Near West Chester, PA (approximate)",
    "Signed up via My bookings popup",
    "On the list now 412 people",
  ]) assert.ok(w.includes(s), `missing: ${s}\n${w}`);
  assert.doesNotMatch(notify.html, /Open subscribers|\/admin/, "information only: no button, no admin link");
  assert.ok(notify.text.includes("New signup: priya.k@gmail.com"), "with a plain-text part");
  assert.equal(sent.length, 2);
  assert.equal(sent.indexOf(welcome) < sent.indexOf(notify), true, "the welcome is tried first, so the notice can say how it went");
});

test("an address already ACTIVE on the list: nothing written, nothing sent", async () => {
  const existing = { property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: null, source: "homepage" };
  const { db, calls, rows } = fakeDb({ subscribers: [existing] });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "priya.k@gmail.com", website: "" }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED);
  assert.equal(await reply.work(), "exists");
  assert.deepEqual(calls.map((c) => c.op), ["select"], "one look, no write of any kind");
  assert.deepEqual(rows, [existing], "the row is exactly as it was (source, acquisition and all)");
  assert.equal(sent.length, 0, "no welcome, no owner notify");
});

test("an address that UNSUBSCRIBED: nothing at all, and unsubscribed_at is untouched", async () => {
  const gone = { property: "extonsports", email: "priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" };
  const { db, calls, rows } = fakeDb({ subscribers: [gone] });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "priya.k@gmail.com", website: "" }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED, "the same answer as a new address");
  assert.equal(await reply.work(), "exists");
  assert.deepEqual(calls.map((c) => c.op), ["select"]);
  assert.equal(rows[0].unsubscribed_at, "2026-09-30T14:00:00Z");
  assert.deepEqual(rows, [gone]);
  assert.equal(sent.length, 0);
});

test("an unsubscribed row stored in another CASE still counts as the same person", async () => {
  // Every writer lowercases today, but the unique key (property, email) is case-sensitive, so
  // an older or hand-entered "Priya.K@Gmail.com" would let an eq-lookup miss and a fresh
  // lowercase row walk straight past the opt-out. The lookup is ilike, then compared exactly.
  const gone = { property: "extonsports", email: "Priya.K@Gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" };
  const { db, calls } = fakeDb({ subscribers: [gone] });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "priya.k@gmail.com" }), d);
  assert.equal(await reply.work(), "exists");
  assert.ok(!calls.some((c) => c.op === "insert"));
  assert.equal(sent.length, 0);
});

test("an unsubscribed row stored with SPACES around the address still counts (review, 2026-10-21)", async () => {
  // Every writer trims today, but a row typed in by hand (" priya.k@gmail.com", a pasted
  // tab or newline) would slip past a whole-value match, and the box would then add the
  // address again and email it. The lookup is `*address*`, and the rows that come back are
  // trimmed and lower-cased before the exact comparison.
  for (const stored of [" priya.k@gmail.com", "Priya.K@Gmail.com  ", "\tpriya.k@gmail.com\n"]) {
    const gone = { property: "extonsports", email: stored, unsubscribed_at: "2026-09-30T14:00:00Z" };
    const { db, calls, rows } = fakeDb({ subscribers: [gone] });
    const { mail, sent } = fakeMail();
    const { deps: d } = deps({ db, mail });
    const reply = await C.handleOptin(req({ email: "priya.k@gmail.com" }), d);
    assert.equal(await reply.work(), "exists", JSON.stringify(stored));
    assert.equal(calls[0].opts.filters.email, "ilike.*priya.k@gmail.com*", "the lookup tolerates anything either side");
    assert.deepEqual(calls.map((c) => c.op), ["select"], JSON.stringify(stored));
    assert.deepEqual(rows, [gone]);
    assert.equal(sent.length, 0);
  }
});

test("a different address that merely CONTAINS this one does not block it", async () => {
  // The wider lookup brings back look-alikes; only an exact match (after trim and case)
  // counts, so "old.priya.k@gmail.com" or "priya.k@gmail.com.au" on the list, even
  // unsubscribed, does not stop a genuinely new "priya.k@gmail.com" being added.
  const others = [
    { property: "extonsports", email: "old.priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" },
    { property: "extonsports", email: "priya.k@gmail.com.au", unsubscribed_at: null },
  ];
  const { db, calls } = fakeDb({ subscribers: others });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "priya.k@gmail.com" }), d);
  assert.equal(await reply.work(), "added");
  assert.equal(calls.filter((c) => c.op === "insert").length, 1);
  assert.equal(sent.length, 2, "the welcome and the owner notify");
});

test("the same address on ANOTHER property's list is not this one: Exton adds it", async () => {
  const elsewhere = { property: "squashtigers", email: "priya.k@gmail.com", unsubscribed_at: "2026-09-30T14:00:00Z" };
  const { db, calls } = fakeDb({ subscribers: [elsewhere] });
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "priya.k@gmail.com" }), d);
  assert.equal(await reply.work(), "added");
  assert.equal(calls[0].opts.filters.property, "eq.extonsports", "the look is scoped to Exton's property");
});

test("the lookup cannot be widened by the address: LIKE wildcards are neutralised", () => {
  // `%` and `*` (PostgREST's alias for %) are legal in an address's local part. Unescaped,
  // "%@gmail.com" would match every Gmail row. Each becomes `_` (one character), and the
  // rows that come back are then compared exactly.
  assert.equal(C.likePattern("a%b_c*d@x.com"), "a_b_c_d@x.com");
  assert.equal(C.likePattern("priya.k@gmail.com"), "priya.k@gmail.com");
});

test("a lookup that fails or comes back full means NO insert (fail closed)", async () => {
  {
    const { db, calls } = fakeDb({ selectFails: true });
    const { mail, sent } = fakeMail();
    const { deps: d, logs } = deps({ db, mail });
    const reply = await C.handleOptin(req({ email: "new@example.com" }), d);
    assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED);
    assert.equal(await reply.work(), "error");
    assert.ok(!calls.some((c) => c.op === "insert"));
    assert.equal(sent.length, 0);
    assert.equal(logs.length, 1);
    assert.doesNotMatch(logs[0], /new@example\.com/, "the log never carries the address");
  }
  {
    // As many look-alikes as the limit: the exact one could be past the end, so don't guess.
    const crowd = Array.from({ length: C.LOOKUP_LIMIT }, (_, i) => ({ property: "extonsports", email: `a${i % 10}b@x.com`, unsubscribed_at: null }));
    const { db, calls } = fakeDb({ subscribers: crowd });
    const { mail } = fakeMail();
    const { deps: d } = deps({ db, mail });
    const reply = await C.handleOptin(req({ email: "a_b@x.com" }), d);
    assert.equal(await reply.work(), "exists");
    assert.ok(!calls.some((c) => c.op === "insert"));
  }
});

test("an insert the database refuses (lost a race to another signup) sends nothing", async () => {
  // A plain INSERT never modifies an existing row; the unique (property, email) key turns a
  // concurrent duplicate into a 409, and that is the end of it.
  const { db } = fakeDb({ insertFails: true });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "new@example.com" }), d);
  assert.equal(await reply.work(), "error");
  assert.equal(sent.length, 0);
});

test("no database configured: nothing is attempted, and the visitor sees the same 202", async () => {
  const { db, calls } = fakeDb({ configured: false });
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "new@example.com" }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED);
  assert.equal(await reply.work(), "skipped");
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 0);
});

/* ── the welcome and the notify are the footer's, and independent ────────── */

test("welcome off (site switch, disabled row, blank subject): no welcome, owner still told", async () => {
  for (const [label, site, welcome] of [
    ["welcomeEmails false", { ...SITE, welcomeEmails: false }, WELCOME],
    ["row disabled", SITE, { ...WELCOME, enabled: false }],
    ["no row", SITE, null],
    ["blank subject", SITE, { ...WELCOME, subject: "  " }],
    ["blank body", SITE, { ...WELCOME, body_md: "" }],
  ]) {
    const { db } = fakeDb({ welcome });
    const { mail, sent } = fakeMail();
    const { deps: d } = deps({ db, mail, site });
    const reply = await C.handleOptin(req({ email: "new@example.com" }), d);
    assert.equal(await reply.work(), "added", label);
    assert.equal(sent.length, 1, label);
    assert.ok(Array.isArray(sent[0].to), `${label}: the one email is the owner notify`);
    // ...and it does not claim a welcome that was never sent (2026-10-21).
    assert.ok(words(sent[0].html).includes("The mailing-list box was ticked. Our welcome email is switched off, so none was sent."), label);
    assert.doesNotMatch(words(sent[0].html), /has gone out/, label);
  }
});

test("a welcome that fails to send does not stop the owner notify, and vice versa", async () => {
  {
    const { db } = fakeDb();
    const { mail, sent } = fakeMail({ sendFails: (a) => a.to === "new@example.com" });
    const { deps: d } = deps({ db, mail });
    assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
    assert.equal(sent.length, 1);
    assert.ok(Array.isArray(sent[0].to));
    assert.ok(words(sent[0].html).includes("The mailing-list box was ticked, but our welcome email did not go out."), "the notice says the welcome failed");
  }
  {
    const { db } = fakeDb();
    const { mail, sent } = fakeMail({ sendFails: (a) => Array.isArray(a.to) });
    const { deps: d } = deps({ db, mail });
    assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "new@example.com");
  }
  {
    const { db } = fakeDb();
    const { mail, sent } = fakeMail();
    const { deps: d } = deps({ db, mail, site: { ...SITE, notifyEmail: null } });
    assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
    assert.deepEqual(sent.map((s) => s.to), ["new@example.com"], "no notify list, no notify");
  }
});

test("a new row with no unsubscribe token gets no welcome (never an email without a working unsubscribe)", async () => {
  const store = fakeDb();
  const tokenless = { configured: () => true, selectRows: (t, o) => store.db.selectRows(t, o), insertRow: async () => ({}) };
  const { mail, sent, welcomeRenders } = fakeMail();
  const { deps: d } = deps({ db: tokenless, mail });
  assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
  assert.equal(welcomeRenders.length, 0);
  assert.deepEqual(sent.map((s) => Array.isArray(s.to)), [true], "only the owner notify");
  assert.ok(words(sent[0].html).includes("but our welcome email did not go out."));
});

test("a welcome lookup that fails: no welcome, and the notice does not claim one", async () => {
  const store = fakeDb();
  const flaky = {
    configured: () => true,
    selectRows: (t, o) => (t === "welcome_emails" ? Promise.reject(new Error("supabase select welcome_emails: 503")) : store.db.selectRows(t, o)),
    insertRow: (t, r) => store.db.insertRow(t, r),
  };
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db: flaky, mail });
  assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
  assert.equal(sent.length, 1);
  assert.ok(words(sent[0].html).includes("but our welcome email did not go out."));
});

test("a list count that fails leaves that row out; the notice still goes", async () => {
  const { db } = fakeDb();
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail, count: async () => { throw new Error("count subscribers: 503"); } });
  assert.equal(await (await C.handleOptin(req({ email: "new@example.com" }), d)).work(), "added");
  const notify = sent.find((s) => Array.isArray(s.to));
  assert.doesNotMatch(words(notify.html), /On the list now/);
});

test("the notice escapes what it prints (a city header is the visitor's to forge)", async () => {
  const { db } = fakeDb();
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "new@example.com" }, {
    headers: { "x-vercel-ip-city": encodeURIComponent('"><img src=x onerror=alert(1)>'), "x-vercel-ip-country-region": "%3Cb%3E" },
  }), d);
  await reply.work();
  const notify = sent.find((s) => Array.isArray(s.to));
  assert.doesNotMatch(notify.html, /<img src=x|<b>/);
  assert.match(notify.html, /&quot;&gt;&lt;img src=x/);
  // The old hand-rolled notifyHtml is gone: one renderer for the popup and the footer.
  assert.equal("notifyHtml" in C, false);
  assert.match(read("optin-core.ts"), /from ['"]\.\.\/\.\.\/\.\.\/lib\/signup-notice['"]/);
});

/* ── the answer never says whether the address was there ─────────────────── */

test("new, active and unsubscribed get byte-identical answers, before any lookup", async () => {
  const answers = [];
  for (const subscribers of [
    [],
    [{ property: "extonsports", email: "p@x.com", unsubscribed_at: null }],
    [{ property: "extonsports", email: "p@x.com", unsubscribed_at: "2026-09-30T14:00:00Z" }],
  ]) {
    const { db, calls } = fakeDb({ subscribers });
    const { mail } = fakeMail();
    const { deps: d } = deps({ db, mail });
    const reply = await C.handleOptin(req({ email: "p@x.com" }), d);
    assert.equal(calls.length, 0, "the answer is decided before the database is asked anything");
    answers.push(JSON.stringify({ status: reply.status, body: reply.body }));
    await reply.work();
  }
  assert.equal(new Set(answers).size, 1, answers.join(" | "));
});

test("route.ts answers first and does the work in after(), so timing gives nothing away either", () => {
  const route = read("route.ts");
  assert.match(route, /import \{[^}]*\bafter\b[^}]*\} from ['"]next\/server['"]/);
  assert.match(route, /after\(/);
  assert.match(route, /handleOptin\(/);
  // The route is handed no update path at all: no updateRows, no upsert, no resubscribe.
  assert.doesNotMatch(route, /updateRows|resolution=merge|createSubscribeRoute|resubscribe/);
  const core = read("optin-core.ts");
  assert.doesNotMatch(core, /updateRows|unsubscribed_at\s*:|resolution=merge/);
});

/* ── the honeypot, the per-IP limit, and malformed requests ─────────────── */

test("honeypot filled: the same 202, and no work at all", async () => {
  const { db, calls } = fakeDb();
  const { mail, sent } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "bot@example.com", website: "http://spam.example" }), d);
  assert.deepEqual({ status: reply.status, body: reply.body }, ACCEPTED);
  assert.equal(reply.work, null);
  assert.equal(calls.length, 0);
  assert.equal(sent.length, 0);
  // Whitespace only is not a filled trap (a person's autofill can leave a space).
  const ok = await C.handleOptin(req({ email: "p@x.com", website: "   " }), d);
  assert.equal(typeof ok.work, "function");
});

test("per IP: 5 a minute, like the footer's subscribe route; the 6th is 429 and does nothing", async () => {
  let now = 1_000_000;
  const allow = C.createRateLimiter(C.OPTIN_LIMIT, C.OPTIN_WINDOW_MS, () => now);
  assert.equal(C.OPTIN_LIMIT, 5);
  assert.equal(C.OPTIN_WINDOW_MS, 60_000);
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail, allow });
  for (let i = 0; i < 5; i++) {
    const r = await C.handleOptin(req({ email: `p${i}@x.com` }), d);
    assert.equal(r.status, 202, `request ${i + 1}`);
  }
  const sixth = await C.handleOptin(req({ email: "p6@x.com" }), d);
  assert.equal(sixth.status, 429);
  assert.equal(sixth.work, null);
  assert.equal(calls.length, 0);
  // Another IP has its own allowance; the first IP's returns when the window turns over.
  assert.equal((await C.handleOptin(req({ email: "q@x.com" }, { ip: "198.51.100.7" }), d)).status, 202);
  now += 60_000;
  assert.equal((await C.handleOptin(req({ email: "p7@x.com" }), d)).status, 202);
});

test("clientIp: the first X-Forwarded-For hop, else X-Real-IP, else 'unknown'", () => {
  assert.equal(C.clientIp(new Headers({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.1" })), "203.0.113.9");
  assert.equal(C.clientIp(new Headers({ "x-real-ip": "198.51.100.7" })), "198.51.100.7");
  assert.equal(C.clientIp(new Headers()), "unknown");
});

test("malformed: not JSON, the wrong content type, or not an address → 4xx and no work", async () => {
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const cases = [
    [req(null, { raw: "{not json" }), 400],
    [req(["p@x.com"]), 400],
    [req("p@x.com"), 400],
    // text/plain is a "simple" cross-site request a third-party page could fire without a
    // preflight; this route only takes JSON, which a foreign origin cannot send unasked.
    [req({ email: "p@x.com" }, { contentType: "text/plain" }), 415],
    [req({ email: "p@x.com" }, { contentType: null }), 415],
    [req({ email: "" }), 400],
    [req({}), 400],
    [req({ email: 42 }), 400],
    [req({ email: "a@b" }), 400],
    [req({ email: "x@stub.orangish.invalid" }), 400],
    [req({ email: "a".repeat(250) + "@b.co" }), 400],
  ];
  for (const [r, status] of cases) {
    const reply = await C.handleOptin(r, d);
    assert.equal(reply.status, status, JSON.stringify(reply.body));
    assert.equal(reply.work, null);
  }
  assert.equal(calls.length, 0);
});

test("the source is the route's, not the browser's", async () => {
  const { db, calls } = fakeDb();
  const { mail } = fakeMail();
  const { deps: d } = deps({ db, mail });
  const reply = await C.handleOptin(req({ email: "p@x.com", source: "homepage", property: "squashtigers", tags: ["vip"] }), d);
  await reply.work();
  const insert = calls.find((c) => c.op === "insert");
  assert.equal(insert.row.source, "my-bookings-popup");
  assert.equal(insert.row.property, "extonsports");
  assert.equal("tags" in insert.row, false);
});

test("geoFrom: Vercel's headers, decoded; a malformed one is null, never a 500", () => {
  assert.deepEqual(C.geoFrom(new Headers({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "PA", "x-vercel-ip-city": "S%C3%A3o%20Paulo" })),
    { country: "US", region: "PA", city: "São Paulo" });
  assert.deepEqual(C.geoFrom(new Headers({ "x-vercel-ip-city": "%E0%A4%A" })), { country: null, region: null, city: null });
  assert.deepEqual(C.geoFrom(new Headers()), { country: null, region: null, city: null });
});
