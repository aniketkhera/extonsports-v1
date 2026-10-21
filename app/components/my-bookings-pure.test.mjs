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

test("the copy is the approved copy, and the toast says the same whatever happens", () => {
  assert.equal(P.COPY.title, "Email my bookings");
  assert.equal(P.COPY.line, "We'll email you today's and upcoming bookings.");
  assert.equal(P.COPY.toast, "Sent. If that email has bookings with us, they're on their way.");
  assert.equal(P.COPY.invalid, "Please enter a valid email address.");
  // The space inside the number is U+00A0 (review UI-3, 2026-10-21): in the 440px panel
  // "(484)" ended one line and "252-2523." began the next. Same words, never split.
  assert.equal(P.COPY.failed, "We couldn't send that just now. Please try again, or call (484) 252-2523.");
  assert.doesNotMatch(P.COPY.failed, /\(484\) 252/, "no breakable space inside the phone number");
  assert.equal(P.COPY.send, "Send");
  // About 8 s since the second line (Aniket, 2026-10-21): long enough to read both lines,
  // and it still goes away on its own.
  assert.ok(P.TOAST_MS >= 7000 && P.TOAST_MS <= 9000, String(P.TOAST_MS));
  // Nothing in the copy may depend on the address or the response.
  assert.doesNotMatch(Object.values(P.COPY).join(" "), /\$\{|no bookings|not found|unknown/i);
});

test("the toast's second line: the approved words, the number a tel: link, the same every time", () => {
  // Aniket, 2026-10-21: "1. add it." The line sits under "Sent…" in every case, ticked box
  // or not, so it says nothing about the address either.
  const line = P.COPY.toastHelp + P.TOAST_PHONE + ".";
  assert.equal(line.replace(/ /g, " "), "Nothing arriving? Check it's the email you booked with, or call (484) 252-2523.");
  assert.doesNotMatch(P.TOAST_PHONE, / /, "no breakable space inside the number");
  assert.equal(P.TOAST_TEL, "tel:+14842522523");
  const popup = read("app/components/MyBookingsEmail.tsx");
  assert.match(popup, /href=\{TOAST_TEL\}/, "the number is a link");
  assert.match(popup, /\{COPY\.toastHelp\}/);
  // The toast is shown by the booking-list answer alone; the box never reaches it.
  const toast = popup.slice(popup.indexOf('role="status"'));
  assert.doesNotMatch(toast, /optin/i, "the toast does not vary with the box");
});

/* ── the mailing-list box ─────────────────────────────────────────────────── */

test("the box: its words, ticked by default, a real labelled checkbox before Send", () => {
  // Aniket, 2026-10-21: "also adda a checkbox, checked by default - add to our mailing list?"
  assert.equal(P.COPY.optin, "Add me to the Exton Sports mailing list");
  const popup = read("app/components/MyBookingsEmail.tsx");
  assert.match(popup, /const \[optin, setOptin\] = useState\(true\)/, "ticked by default");
  const box = popup.slice(popup.indexOf('type="checkbox"') - 400, popup.indexOf('type="checkbox"') + 600);
  assert.match(box, /type="checkbox"/);
  assert.match(box, /checked=\{optin\}/);
  assert.match(box, /onChange=\{\(e\) => setOptin\(e\.target\.checked\)\}/);
  assert.match(box, /<label[\s\S]*\{COPY\.optin\}[\s\S]*<\/label>/, "the words are the box's label");
  // Under the field and BEFORE Send, in the page and in Tab order, so nobody presses Send
  // without having passed it.
  const field = popup.indexOf('type="email"');
  const check = popup.indexOf('type="checkbox"');
  const send = popup.indexOf('type="submit"');
  assert.ok(field > 0 && check > field && send > check, `order: field=${field} box=${check} send=${send}`);
  assert.match(popup, /\[inputRef\.current, optinRef\.current, sendRef\.current, closeRef\.current\]/);
});

test("nextTrapIndex with the box: field → box → Send → × → field, and back with Shift", () => {
  assert.deepEqual([0, 1, 2, 3].map((i) => P.nextTrapIndex(i, 4, false)), [1, 2, 3, 0]);
  assert.deepEqual([0, 1, 2, 3].map((i) => P.nextTrapIndex(i, 4, true)), [3, 0, 1, 2]);
  assert.equal(P.nextTrapIndex(-1, 4, false), 0);
  assert.equal(P.nextTrapIndex(-1, 4, true), 3);
});

test("the mailing-list request: same-origin, JSON, {email, website} and nothing the route could trust", () => {
  assert.equal(P.OPTIN_URL, "/api/mailing-list-optin");
  assert.ok(read("app/api/mailing-list-optin/route.ts").length > 0, "the route is where the popup posts");
  const init = P.optinInit("  priya.k@gmail.com ");
  assert.equal(init.method, "POST");
  assert.equal(init.credentials, "same-origin");
  assert.equal(init.keepalive, true, "survives the visitor leaving the page straight after Send");
  assert.deepEqual(init.headers, { "Content-Type": "application/json" });
  // No source, no property: the route sets both itself.
  assert.deepEqual(JSON.parse(init.body), { email: "priya.k@gmail.com", website: "" });
  assert.equal(JSON.parse(P.optinInit("a@b.co", "bot").body).website, "bot", "the honeypot goes along");
});

test("joinMailingList never throws and refuses a malformed address without a request", async () => {
  const seen = [];
  const ok = async (url, init) => { seen.push({ url, init }); return { status: 202 }; };
  assert.equal(await P.joinMailingList("a@b.co", { fetchImpl: ok }), true);
  assert.equal(seen[0].url, "/api/mailing-list-optin");
  assert.ok(seen[0].init.signal, "a timeout signal is attached");
  assert.equal(await P.joinMailingList("a@b.co", { fetchImpl: async () => ({ status: 429 }) }), false);
  assert.equal(await P.joinMailingList("a@b.co", { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }), false);
  let called = false;
  assert.equal(await P.joinMailingList("a@b", { fetchImpl: async () => { called = true; return { status: 202 }; } }), false);
  assert.equal(called, false);
});

test("sendWithOptin: the box adds a mailing-list request; the two never affect each other", async () => {
  const calls = [];
  const impl = (booking, join) => ({
    sendBookingList: async (email, o) => { calls.push(["booking", email, o.website]); return booking(); },
    joinMailingList: (email, o) => { calls.push(["join", email, o.website]); return join(); },
  });

  // Ticked: both requests, same address, same honeypot.
  assert.equal(await P.sendWithOptin("p@x.com", { optin: true, website: "" }, impl(async () => "sent", async () => true)), "sent");
  assert.deepEqual(calls.sort(), [["booking", "p@x.com", ""], ["join", "p@x.com", ""]]);

  // Unticked: no mailing-list call at all.
  calls.length = 0;
  assert.equal(await P.sendWithOptin("p@x.com", { optin: false, website: "" }, impl(async () => "sent", async () => true)), "sent");
  assert.deepEqual(calls, [["booking", "p@x.com", ""]]);

  // The mailing list failing, hanging or throwing leaves the booking answer as it was.
  for (const join of [async () => false, () => new Promise(() => {}), () => { throw new Error("boom"); }, async () => { throw new Error("boom"); }]) {
    assert.equal(await P.sendWithOptin("p@x.com", { optin: true }, impl(async () => "sent", join)), "sent");
  }
  // And the booking list failing does not stop the mailing-list request.
  calls.length = 0;
  assert.equal(await P.sendWithOptin("p@x.com", { optin: true }, impl(async () => "failed", async () => true)), "failed");
  assert.ok(calls.some((c) => c[0] === "join"));
});

test("the popup sends through sendWithOptin with the box's state, and resets the box after a send", () => {
  const popup = read("app/components/MyBookingsEmail.tsx");
  assert.match(popup, /await sendWithOptin\(email, \{ optin, website: honeypot \}\)/);
  assert.doesNotMatch(popup, /await sendBookingList\(/, "no second path that skips the box");
  assert.match(popup, /setEmail\(""\);\s*setOptin\(true\);/, "a fresh form after a send is ticked again");
});

/* ── the popup's focus trap ───────────────────────────────────────────────── */

test("nextTrapIndex: three stops cycle both ways (the field, the box, × while Send is disabled)", () => {
  // Since the box (2026-10-21) there are four stops; while sending, Send is disabled and
  // drops out, leaving three. The shape below is the same either way.
  assert.deepEqual([0, 1, 2].map((i) => P.nextTrapIndex(i, 3, false)), [1, 2, 0]);
  assert.deepEqual([0, 1, 2].map((i) => P.nextTrapIndex(i, 3, true)), [2, 0, 1]);
  // Two stops still cycle.
  assert.deepEqual([0, 1].map((i) => P.nextTrapIndex(i, 2, false)), [1, 0]);
  assert.deepEqual([0, 1].map((i) => P.nextTrapIndex(i, 2, true)), [1, 0]);
});

test("nextTrapIndex: from the panel itself (-1), Tab enters at the field and Shift+Tab at ×", () => {
  // Review UI-1, 2026-10-21: a click on the title, the line or the padding left focus on
  // NOTHING in the trap. The panel is now focusable by script (tabIndex -1), so that click
  // lands on the panel and this is the case that brings the next Tab back in.
  assert.equal(P.nextTrapIndex(-1, 3, false), 0);
  assert.equal(P.nextTrapIndex(-1, 3, true), 2);
  assert.equal(P.nextTrapIndex(-1, 2, true), 1);
});

test("the popup's panel takes focus on a click inside it, so focus cannot fall to the page", () => {
  // Review UI-1, 2026-10-21: without tabIndex={-1} a click inside the panel sent focus to
  // <body>, the panel's onKeyDown trap never ran, and Shift+Tab walked onto the page hidden
  // behind the scrim (the WhatsApp button, then the mailing-list band).
  const popup = read("app/components/MyBookingsEmail.tsx");
  const start = popup.indexOf('role="dialog"');
  const end = popup.indexOf("<h2", start);
  assert.ok(start > 0 && end > start, "the dialog panel and its title are where they were");
  const tag = popup.slice(start, end);
  assert.match(tag, /tabIndex=\{-1\}/, "the panel is focusable by script and by a click, not by Tab");
  assert.match(tag, /onKeyDown=\{onPanelKeyDown\}/, "the trap is still on the panel");
  assert.match(tag, /\boutline-none\b/, "a click inside draws no focus ring round the whole panel");
  assert.match(popup, /nextTrapIndex\(/, "the component uses the tested trap order");
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
