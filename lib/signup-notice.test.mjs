/* Exton's "new signup" notice to the staff, 2026-10-21 (lib/signup-notice.ts, sent by
   lib/signup-notice-send.ts from both the My bookings popup and the footer bar).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   Aniket, 2026-10-21, on the plain notice: "need it to be better looking". He approved a
   mockup in the mailer's own look, then "for the first one, leave it out for everyone":
   the mockup's "Open subscribers" button goes, for every recipient. So the notice is
   information only, and these tests pin that it carries no button and no admin link.
   They also pin the honesty rule: the sentence says the welcome email went out only when
   it did. Nothing here can reach Supabase or Resend: every fetch is a fake. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* As in board-lib.test.mjs: retry extensionless relative imports as .ts, and bare
   ones ("next/server") as .js. And one more: mailer-admin ships TypeScript source,
   which Node will not strip under node_modules, so its files are stripped here. */
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

// The config reads these when it loads. Fake values only, set before the import, so
// nothing below can find a real key or a real database.
delete process.env.MAILER_SUPABASE_URL;
delete process.env.MAILER_SUPABASE_SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mailers.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
process.env.RESEND_API_KEY = "re_test_not_a_key";
// The owner's rule (2026-10-21) is that Exton mail comes from extonsports.com. An old
// RESEND_FROM left in an environment must not be able to undo it.
process.env.RESEND_FROM = "Exton Sports <noreply@orangish.io>";

const N = await import("./signup-notice.ts");
const S = await import("./signup-notice-send.ts");
const { config } = await import("../mailer-admin.config.ts");

const BRAND = {
  name: "Exton Sports Center",
  host: "extonsports.com",
  logoUrl: "https://extonsports.com/logo.png",
  theme: config.theme,
};

// 4:18 PM in Exton on 21 Oct 2026 (EDT, UTC-4).
const AT = new Date("2026-10-21T20:18:00Z");
const GEO = { country: "US", region: "PA", city: "West Chester" };

const popup = (over = {}) => N.renderSignupNotice(BRAND, {
  email: "priya.k@gmail.com", source: "popup", welcome: "sent", at: AT, geo: GEO, listCount: 412, ...over,
});
const footer = (over = {}) => N.renderSignupNotice(BRAND, {
  email: "priya.k@gmail.com", source: "footer", welcome: "sent", at: AT, geo: GEO, listCount: 412, ...over,
});

/** The visible words of the HTML, so a test can read a sentence the way a person does. */
const words = (html) => html
  .replace(/<div style="display:none[^"]*">[\s\S]*?<\/div>/, "")
  .replace(/<wbr>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&middot;/g, "·").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

/* ── what it says ────────────────────────────────────────────────────────── */

test("the popup notice: subject, header, pill, the address, the sentence, the four rows, the footer line", () => {
  const n = popup();
  assert.equal(n.subject, "New signup: priya.k@gmail.com");
  assert.match(n.html, /<img src="https:\/\/extonsports\.com\/logo\.png"/);
  const w = words(n.html);
  for (const s of [
    "EXTON SPORTS CENTER", "Mailing list", "NEW SIGNUP", "priya.k@gmail.com",
    "Joined from the My bookings popup on extonsports.com. The mailing-list box was ticked, and our welcome email has gone out.",
    "When Wed, Oct 21, 2026 · 4:18 PM ET",
    "Near West Chester, PA (approximate)",
    "Signed up via My bookings popup",
    "On the list now 412 people",
    "You get this because you're set to receive signup notices for extonsports.com.",
  ]) assert.ok(w.includes(s), `missing: ${s}\n${w}`);
  assert.match(n.html, /<a href="mailto:priya\.k@gmail\.com"/);
  // On a phone the big address wraps after the "@", never mid-word (the first render broke
  // "example.co" / "m"); <wbr> is not copied, so the address pastes clean.
  assert.match(n.html, />priya\.k@<wbr>gmail\.com<\/a>/);
  assert.doesNotMatch(n.html, /break-all/);
});

test("the footer notice says where it came from in its own words", () => {
  const w = words(footer().html);
  assert.ok(w.includes("Joined from the mailing-list form on extonsports.com, and our welcome email has gone out."), w);
  assert.ok(w.includes("Signed up via Mailing-list form"), w);
  assert.doesNotMatch(w, /My bookings|box was ticked/);
});

test("NO button and NO admin link, for anyone (Aniket, 2026-10-21: 'leave it out for everyone')", () => {
  for (const n of [popup(), footer({ name: "Priya K", acquisition: { utm_source: "instagram", referrer: "https://www.google.com/" } })]) {
    assert.doesNotMatch(n.html, /Open subscribers|\/admin|<button|<form/i);
    assert.doesNotMatch(n.text, /Open subscribers|\/admin|https?:\/\//i);
    // The only link is the address itself; the only other URL is the logo.
    const hrefs = [...n.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(hrefs, ["mailto:priya.k@gmail.com"]);
  }
});

test("the welcome sentence never claims an email that did not go out", () => {
  const cases = [
    ["popup", "off", "Joined from the My bookings popup on extonsports.com. The mailing-list box was ticked. Our welcome email is switched off, so none was sent."],
    ["popup", "failed", "Joined from the My bookings popup on extonsports.com. The mailing-list box was ticked, but our welcome email did not go out."],
    ["popup", "unknown", "Joined from the My bookings popup on extonsports.com. The mailing-list box was ticked."],
    ["footer", "off", "Joined from the mailing-list form on extonsports.com. Our welcome email is switched off, so none was sent."],
    ["footer", "failed", "Joined from the mailing-list form on extonsports.com, but our welcome email did not go out."],
    ["footer", "unknown", "Joined from the mailing-list form on extonsports.com."],
  ];
  for (const [source, welcome, sentence] of cases) {
    const n = N.renderSignupNotice(BRAND, { email: "p@x.com", source, welcome, at: AT, geo: GEO, listCount: 3 });
    const w = words(n.html);
    assert.ok(w.includes(sentence), `${source}/${welcome}: ${w}`);
    assert.ok(n.text.includes(sentence), `${source}/${welcome} (text): ${n.text}`);
    assert.doesNotMatch(w, /has gone out/, `${source}/${welcome}`);
  }
});

test("When: Exton's clock, EDT and EST alike, with ordinary spaces (ICU's U+202F replaced)", () => {
  assert.equal(N.formatWhen(AT), "Wed, Oct 21, 2026 · 4:18 PM ET");
  assert.equal(N.formatWhen(new Date("2026-12-01T17:05:00Z")), "Tue, Dec 1, 2026 · 12:05 PM ET");
  assert.equal(N.formatWhen(new Date("2026-11-01T04:30:00Z")), "Sun, Nov 1, 2026 · 12:30 AM ET");
  assert.doesNotMatch(N.formatWhen(AT), /[  ]/);
  // In the HTML the time holds together, so a phone breaks the line at the dot, not
  // between "4:18" and "PM" (it did in the mockup).
  assert.match(popup().html, /4:18&nbsp;PM&nbsp;ET/);
});

test("Near: city and region, a country only outside the US, and no row at all when unknown", () => {
  assert.equal(N.formatNear(GEO), "West Chester, PA");
  assert.equal(N.formatNear({ country: "CA", region: "ON", city: "Toronto" }), "Toronto, ON, Canada");
  assert.equal(N.formatNear({ country: "IN", region: null, city: null }), "India");
  assert.equal(N.formatNear({ country: "US", region: null, city: null }), "United States");
  assert.equal(N.formatNear({ country: null, region: null, city: null }), null);
  assert.equal(N.formatNear(undefined), null);
  const n = popup({ geo: { country: null, region: null, city: null } });
  assert.doesNotMatch(words(n.html), /\bNear\b|approximate/);
  assert.doesNotMatch(n.text, /Near:/);
});

test("On the list now: people, one person, thousands, and no row when the count failed", () => {
  assert.ok(words(popup({ listCount: 1 }).html).includes("On the list now 1 person"));
  assert.ok(words(popup({ listCount: 1204 }).html).includes("On the list now 1,204 people"));
  for (const listCount of [null, undefined, -1, Number.NaN]) {
    const n = popup({ listCount });
    assert.doesNotMatch(words(n.html), /On the list now/, String(listCount));
    assert.doesNotMatch(n.text, /On the list now/, String(listCount));
  }
});

test("the footer's campaign and referrer, briefly: UTM values and the referring site, never its path", () => {
  const n = footer({ acquisition: {
    utm_source: "instagram", utm_medium: "social", utm_campaign: "fall-open-house",
    referrer: "https://www.google.com/search?q=priya.k%40gmail.com&tok=secret",
  } });
  const w = words(n.html);
  assert.ok(w.includes("Signed up via Mailing-list form utm: instagram / social / fall-open-house · from google.com"), w);
  assert.doesNotMatch(n.html + n.text, /search\?|tok=|secret/);
  // Only what is present; a referrer from our own pages says nothing, so it is left out.
  assert.ok(words(footer({ acquisition: { utm_campaign: "spring" } }).html).includes("Signed up via Mailing-list form utm: spring"));
  assert.ok(words(footer({ acquisition: { referrer: "https://extonsports.com/badminton" } }).html).includes("Signed up via Mailing-list form On the list now"));
  assert.ok(words(footer({ acquisition: { referrer: "not a url" } }).html).includes("Signed up via Mailing-list form On the list now"));
  // A very long value is cut, not printed whole.
  const long = footer({ acquisition: { utm_campaign: "x".repeat(300) } });
  assert.doesNotMatch(long.html, /x{61}/);
  // The popup has no acquisition, whatever it is handed.
  assert.ok(words(popup({ acquisition: { utm_source: "instagram" } }).html).includes("Signed up via My bookings popup On the list now"));
});

test("a footer name (the bar asks for one) is shown; a blank one is not", () => {
  assert.ok(words(footer({ name: "Priya K" }).html).includes("Name Priya K"));
  assert.ok(footer({ name: "Priya K" }).text.includes("Name:"));
  assert.doesNotMatch(words(footer({ name: "  " }).html), /\bName\b/);
  assert.doesNotMatch(words(footer({}).html), /\bName\b/);
});

test("the plain-text part carries the same facts", () => {
  const t = footer({ name: "Priya K", acquisition: { utm_source: "instagram" } }).text;
  for (const s of [
    "New signup: priya.k@gmail.com",
    "Joined from the mailing-list form on extonsports.com, and our welcome email has gone out.",
    "Wed, Oct 21, 2026 · 4:18 PM ET", "West Chester, PA (approximate)",
    "Mailing-list form (utm: instagram)", "412 people", "Priya K",
    "You get this because you're set to receive signup notices for extonsports.com.",
  ]) assert.ok(t.includes(s), `missing: ${s}\n${t}`);
  assert.doesNotMatch(t, /<[a-z]/i);
});

/* ── safe to send ────────────────────────────────────────────────────────── */

test("everything printed is escaped, and nothing can break the subject line", () => {
  const n = N.renderSignupNotice(BRAND, {
    email: `a"<b>'@x.com`, source: "footer", welcome: "sent", at: AT,
    geo: { country: "US", region: "<i>", city: '"><img src=x onerror=alert(1)>' },
    name: "<script>alert(1)</script>",
    acquisition: { utm_source: "<b>bold</b>", referrer: "https://evil.example/<x>" },
    listCount: 2,
  });
  assert.doesNotMatch(n.html, /<b>bold|<script|<img src=x|<i>|"<b>/);
  assert.match(n.html, /href="mailto:a&quot;&lt;b&gt;&#39;@x\.com"/);
  const sneaky = N.renderSignupNotice(BRAND, { email: "p@x.com\r\nBcc: z@y.com", source: "popup", welcome: "sent", at: AT });
  assert.doesNotMatch(sneaky.subject, /[\r\n]/);
});

test("email-safe: tables and inline styles only, no <style>, no script, no external CSS", () => {
  const { html } = popup();
  assert.match(html, /^<!DOCTYPE html>/);
  assert.doesNotMatch(html, /<style|<script|<link/i);
  assert.match(html, /<table role="presentation"/);
  // The mailer theme: cream page, white card, the accent on the brand line.
  assert.match(html, /background:#FDF4EE/);
  assert.match(html, /background:#FFFFFF/);
  assert.match(html, /color:#F37A4A/);
});

/* ── sending it ──────────────────────────────────────────────────────────── */

function noticeDeps({ count = async () => 412, sendFails = false } = {}) {
  const sent = [];
  const logs = [];
  return {
    sent, logs,
    deps: {
      brand: BRAND,
      countActive: count,
      async send(a) { if (sendFails) throw new Error("Resend send failed for priya.k@gmail.com"); sent.push(a); },
      log: (m) => logs.push(m),
    },
  };
}
const INPUT = { email: "priya.k@gmail.com", source: "popup", welcome: "sent", at: AT, geo: GEO };

test("sendSignupNotice: one email to the notify list, with the html and the text", async () => {
  const { deps, sent } = noticeDeps();
  assert.equal(await N.sendSignupNotice(["owner@example.test", "desk@example.test"], INPUT, deps), "sent");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["owner@example.test", "desk@example.test"]);
  assert.equal(sent[0].subject, "New signup: priya.k@gmail.com");
  assert.ok(sent[0].html.includes("412 people"));
  assert.ok(sent[0].text.includes("412 people"));
});

test("sendSignupNotice: nobody to tell → nothing sent, and the count is not even asked", async () => {
  for (const to of [null, undefined, "", [], ["", "  "]]) {
    let asked = false;
    const { deps, sent } = noticeDeps({ count: async () => { asked = true; return 1; } });
    assert.equal(await N.sendSignupNotice(to, INPUT, deps), "skipped", JSON.stringify(to));
    assert.equal(sent.length, 0);
    assert.equal(asked, false);
  }
});

test("sendSignupNotice: a failed count leaves its row out; the notice still goes", async () => {
  const { deps, sent, logs } = noticeDeps({ count: async () => { throw new Error("count subscribers: 503"); } });
  assert.equal(await N.sendSignupNotice("owner@example.test", INPUT, deps), "sent");
  assert.doesNotMatch(sent[0].html, /On the list now/);
  assert.equal(logs.length, 1);
});

test("sendSignupNotice: a failed send is logged without the address and never throws", async () => {
  const { deps, logs } = noticeDeps({ sendFails: true });
  assert.equal(await N.sendSignupNotice("owner@example.test", INPUT, deps), "failed");
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /priya/);
});

/* ── the count ───────────────────────────────────────────────────────────── */

test("countActiveSubscribers: one HEAD asking PostgREST for an exact count of Exton's active rows", async () => {
  const calls = [];
  const fake = async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 200, headers: { "content-range": "*/412" } });
  };
  assert.equal(await N.countActiveSubscribers({ url: "https://db.example.test/", key: "k" }, "extonsports", fake), 412);
  const u = new URL(calls[0].url);
  assert.equal(u.origin + u.pathname, "https://db.example.test/rest/v1/subscribers");
  assert.equal(u.searchParams.get("property"), "eq.extonsports");
  assert.equal(u.searchParams.get("unsubscribed_at"), "is.null");
  assert.equal(calls[0].init.method, "HEAD");
  assert.equal(calls[0].init.headers.Prefer, "count=exact");
  // PostgREST's other spelling of the same answer.
  const ranged = async () => new Response(null, { status: 206, headers: { "content-range": "0-0/1204" } });
  assert.equal(await N.countActiveSubscribers({ url: "https://db.example.test", key: "k" }, "extonsports", ranged), 1204);
});

test("countActiveSubscribers: no database, an error status or no total → it throws (the row is left out)", async () => {
  const never = async () => { throw new Error("must not be called"); };
  await assert.rejects(N.countActiveSubscribers({ url: "", key: "k" }, "extonsports", never));
  await assert.rejects(N.countActiveSubscribers({ url: "https://db.example.test", key: "" }, "extonsports", never));
  await assert.rejects(N.countActiveSubscribers({ url: "https://db.example.test", key: "k" }, "extonsports",
    async () => new Response(null, { status: 503 })));
  await assert.rejects(N.countActiveSubscribers({ url: "https://db.example.test", key: "k" }, "extonsports",
    async () => new Response(null, { status: 200, headers: { "content-range": "*/*" } })));
});

/* ── who it comes from (Aniket, 2026-10-21) ──────────────────────────────── */

test("every Exton mailing-list email is from Exton Sports Center <noreply@extonsports.com>, whatever RESEND_FROM says", () => {
  assert.equal(process.env.RESEND_FROM, "Exton Sports <noreply@orangish.io>", "the test really did set a stale RESEND_FROM");
  assert.equal(config.resend.from, "Exton Sports Center <noreply@extonsports.com>");
  assert.equal(config.email.replyTo, "info@extonsports.com");
  // The source must not read it either (a later edit could re-add the fallback).
  assert.doesNotMatch(read("../mailer-admin.config.ts"), /process\.env\.RESEND_FROM|orangish\.io>/);
});

test("the notice goes through Resend from the config's sender, with Reply-To and the text part", async () => {
  const requests = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === "https://api.resend.com/emails") {
      requests.push(JSON.parse(init.body));
      return Response.json({ id: "email-test-1" });
    }
    if (u.startsWith("https://mailers.example.test/rest/v1/subscribers")) {
      return new Response(null, { status: 200, headers: { "content-range": "*/7" } });
    }
    throw new Error(`unexpected fetch ${u}`);
  };
  try {
    const deps = S.noticeDepsFor(config);
    assert.deepEqual(deps.brand, { name: "Exton Sports Center", host: "extonsports.com", logoUrl: "https://extonsports.com/logo.png", theme: config.theme });
    assert.equal(await N.sendSignupNotice(["owner@example.test"], INPUT, deps), "sent");
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(requests.length, 1);
  const r = requests[0];
  assert.equal(r.from, "Exton Sports Center <noreply@extonsports.com>");
  assert.equal(r.reply_to, "info@extonsports.com");
  assert.deepEqual(r.to, ["owner@example.test"]);
  assert.equal(r.subject, "New signup: priya.k@gmail.com");
  assert.ok(r.html.includes("7 people"));
  assert.ok(r.text.includes("7 people"));
});
