/* What keeps "Email my bookings" honest, 2026-10-21 (app/components/my-bookings-pure.ts).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   Aniket, 2026-10-21: "someone enters their email id and we email them their current and
   forthcoming bookings ... one email id, press send and the popup disappears". The popup
   POSTs straight to the platform (orangish-app app/api/public/booking-list-email), and the
   platform answers 202 for EVERY well-formed address, whether it has bookings or not.
   Every rule below passes `tsc` when broken: a body field renamed is a 400 the visitor
   reads as "couldn't send"; a toast that varies with the response would tell a stranger
   whether an address books here; credentials left on would send cookies cross-site. */
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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const P = await import("./my-bookings-pure.ts");
const B = await import("../../lib/booking.ts");

/* ── the endpoint ─────────────────────────────────────────────────────────── */

test("the popup posts to the platform's booking-list-email route, for Exton's slug", () => {
  assert.match(B.BOOKING_LIST_EMAIL_URL, /\/api\/public\/booking-list-email$/);
  if (!process.env.NEXT_PUBLIC_ORANGISH_APP_URL) {
    assert.equal(B.BOOKING_LIST_EMAIL_URL, "https://app.orangish.io/api/public/booking-list-email");
  }
  // The platform's locations.slug, not a town name (memory: a wrong slug fails silently).
  assert.equal(B.BOOKING_LIST_CLUB, "exton-sports");
  assert.equal(typeof B.BOOKING_LIST_EMAIL_LIVE, "boolean");
});

/* ── the address check ───────────────────────────────────────────────────── */

test("EMAIL_RE is the platform's, character for character", () => {
  // orangish-app origin/master app/api/public/enquiry/route.ts (and workshop-registration):
  // the route refuses with 400 exactly what this refuses, so the popup never shows "sent"
  // for an address the platform would have bounced, nor refuses one it would take.
  assert.equal(
    P.EMAIL_RE.source,
    "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$",
  );
  assert.equal(P.EMAIL_RE.flags, "");
});

test("isEmailShaped: the cases the platform accepts", () => {
  for (const ok of ["a@b.co", "priya.k@gmail.com", "first.last+tag@sub.example.org", "o'neil@example.com",
    "  padded@example.com  ", "UPPER@EXAMPLE.COM"]) {
    assert.equal(P.isEmailShaped(ok), true, ok);
  }
});

test("isEmailShaped: the cases the platform refuses with invalid_email", () => {
  const long = "a".repeat(250) + "@b.co"; // 255 > 254
  for (const bad of ["", "   ", "a@b", "a b@c.com", "@x.com", "a@.com", "a@b..com", "a@-b.com",
    "no-at-sign.com", "a@b.com.", long, "x@stub.orangish.invalid", "y@b.INVALID"]) {
    assert.equal(P.isEmailShaped(bad), false, JSON.stringify(bad));
  }
  for (const notString of [null, undefined, 42, {}, ["a@b.co"]]) {
    assert.equal(P.isEmailShaped(notString), false, String(notString));
  }
});

/* ── what goes over the wire ─────────────────────────────────────────────── */

test("requestBody is exactly {club, email, website}: trimmed, honeypot empty", () => {
  assert.deepEqual(P.requestBody("  priya.k@gmail.com "), { club: "exton-sports", email: "priya.k@gmail.com", website: "" });
  assert.deepEqual(Object.keys(P.requestBody("a@b.co")).sort(), ["club", "email", "website"]);
  // A filled honeypot is forwarded untouched: the platform answers the same 202 and drops it.
  assert.equal(P.requestBody("a@b.co", "http://spam.example").website, "http://spam.example");
});

test("fetchInit: JSON (so the browser preflights), CORS, and no cookies", () => {
  const init = P.fetchInit("a@b.co");
  assert.equal(init.method, "POST");
  assert.equal(init.mode, "cors");
  assert.equal(init.credentials, "omit");
  assert.deepEqual(init.headers, { "Content-Type": "application/json" });
  assert.deepEqual(JSON.parse(init.body), { club: "exton-sports", email: "a@b.co", website: "" });
});

/* ── what the visitor is told ─────────────────────────────────────────────── */

test("outcomeFor: 202 is sent, 400 is invalid, everything else is failed", () => {
  assert.equal(P.outcomeFor(202), "sent");
  assert.equal(P.outcomeFor(400), "invalid");
  // 200 is not the contract: a route that ever answers 200 has changed shape, so say so.
  for (const s of [0, 200, 204, 403, 404, 413, 415, 429, 500, 502, 503]) {
    assert.equal(P.outcomeFor(s), "failed", String(s));
  }
});

test("sendBookingList never throws: network errors and timeouts are 'failed'", async () => {
  const seen = [];
  const ok = async (url, init) => { seen.push({ url, init }); return { status: 202 }; };
  assert.equal(await P.sendBookingList("a@b.co", { fetchImpl: ok, url: "http://stub/x" }), "sent");
  assert.equal(seen[0].url, "http://stub/x");
  assert.equal(seen[0].init.credentials, "omit");
  assert.ok(seen[0].init.signal, "a timeout signal is attached");
  await P.sendBookingList("a@b.co", { fetchImpl: ok, website: "filled-by-a-bot" });
  assert.equal(JSON.parse(seen[1].init.body).website, "filled-by-a-bot", "the honeypot reaches the platform");

  assert.equal(await P.sendBookingList("a@b.co", { fetchImpl: async () => ({ status: 400 }) }), "invalid");
  assert.equal(await P.sendBookingList("a@b.co", { fetchImpl: async () => ({ status: 404 }) }), "failed");
  assert.equal(await P.sendBookingList("a@b.co", { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }), "failed");

  const hang = (_url, init) => new Promise((_, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason));
  });
  assert.equal(await P.sendBookingList("a@b.co", { fetchImpl: hang, timeoutMs: 20 }), "failed");
});

test("sendBookingList refuses a malformed address locally and sends nothing", async () => {
  let called = false;
  const spy = async () => { called = true; return { status: 202 }; };
  assert.equal(await P.sendBookingList("a@b", { fetchImpl: spy }), "invalid");
  assert.equal(called, false);
});

test("the copy is the approved copy, and the toast is ONE sentence whatever happens", () => {
  assert.equal(P.COPY.title, "Email my bookings");
  assert.equal(P.COPY.line, "We'll email you today's and upcoming bookings.");
  assert.equal(P.COPY.toast, "Sent. If that email has bookings with us, they're on their way.");
  assert.equal(P.COPY.invalid, "Please enter a valid email address.");
  assert.equal(P.COPY.failed, "We couldn't send that just now. Please try again, or call (484) 252-2523.");
  assert.equal(P.COPY.send, "Send");
  // About 4 s (spec), long enough to read eleven words, short enough not to linger.
  assert.ok(P.TOAST_MS >= 3500 && P.TOAST_MS <= 5000, String(P.TOAST_MS));
  // Nothing in the copy may depend on the address or the response.
  assert.doesNotMatch(Object.values(P.COPY).join(" "), /\$\{|no bookings|not found|unknown/i);
});

/* ── the footer link: only a plain click becomes the overlay ──────────────── */

test("isPlainLeftClick: modifiers and other buttons keep the browser's own behaviour", () => {
  const base = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
  assert.equal(P.isPlainLeftClick(base), true);
  for (const k of ["ctrlKey", "metaKey", "shiftKey", "altKey", "defaultPrevented"]) {
    assert.equal(P.isPlainLeftClick({ ...base, [k]: true }), false, k);
  }
  assert.equal(P.isPlainLeftClick({ ...base, button: 1 }), false, "middle click opens a tab");
});

/* ── the page itself: where the buttons went ─────────────────────────────── */

test("hero row: Book a court or lane · My bookings · Make an adhoc payment; no calendar button", () => {
  const hero = read("app/components/Hero.tsx");
  assert.doesNotMatch(hero, />\s*Show calendar of bookings\s*</, "the hero's calendar button is removed (Aniket, 2026-10-21)");
  assert.doesNotMatch(hero, /<BookingsCalendar\b/, "the overlay now opens from the footer, not the hero");
  const a = hero.search(/>\s*Book a court or lane\s*<\/a>/);
  const m = hero.search(/>\s*My bookings\s*<\/button>/);
  const p = hero.search(/Make an adhoc payment\s*<\/a>/);
  assert.ok(a > 0 && m > a && p > m, `order: book=${a} my=${m} pay=${p}`);
  assert.match(hero, /BOOKING_LIST_EMAIL_LIVE/, "the button is behind the kill switch");
});

test("footer PLAY: 'Calendar of bookings' sits right under 'Book a court or lane', to /calendar", () => {
  const footer = read("app/components/Footer.tsx");
  assert.match(footer,
    /\{ label: "Book a court or lane", href: BOOK_COURT_URL \},\s*(?:\/\*[\s\S]*?\*\/\s*)?\{ label: "Calendar of bookings", href: "\/calendar", calendar: true \},/);
  assert.doesNotMatch(footer, /^["']use client["']/m, "Footer stays a Server Component");
  const link = read("app/components/CalendarFooterLink.tsx");
  // Exactly the neighbours' look (FooterCol's <a>), and a real href for no-JS / ctrl-click.
  assert.match(link, /className="text-white\/55 hover:text-white transition"/);
  assert.match(link, /href="\/calendar"/);
});

test("the popup asks for an email only: no phone box (texting is parked)", () => {
  const popup = read("app/components/MyBookingsEmail.tsx");
  assert.doesNotMatch(popup, /type="tel"|inputMode="tel"|autoComplete="tel"/);
  assert.match(popup, /type="email"/);
  assert.match(popup, /role="status"/, "the toast is announced");
  assert.match(popup, /aria-modal/);
});
