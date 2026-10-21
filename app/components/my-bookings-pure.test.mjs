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

/* ── the toast's clock: it waits while somebody is on it (review, 2026-10-21) ── */

/** A hand-wound clock for createToastClock: nothing fires until advance() says so. */
function fakeClock() {
  let t = 0;
  let next = 1;
  const timers = new Map();
  return {
    now: () => t,
    set: (fn, ms) => { const id = next++; timers.set(id, { at: t + ms, fn }); return id; },
    clear: (id) => { timers.delete(id); },
    pending: () => timers.size,
    advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        t = due[1].at;
        due[1].fn();
      }
      t = end;
    },
  };
}

function toastClock() {
  const c = fakeClock();
  const gone = [];
  const clock = P.createToastClock({ ms: P.TOAST_MS, onExpire: () => gone.push(c.now()), now: c.now, set: c.set, clear: c.clear });
  return { c, gone, clock };
}

test("toast clock, untouched: it goes after TOAST_MS, once", () => {
  const { c, gone, clock } = toastClock();
  clock.start();
  c.advance(P.TOAST_MS - 1);
  assert.deepEqual(gone, []);
  c.advance(1);
  assert.deepEqual(gone, [P.TOAST_MS]);
  c.advance(60_000);
  assert.deepEqual(gone, [P.TOAST_MS], "never twice");
});

test("toast clock: a pointer on it holds it; leaving gives back only the time that was left", () => {
  // The second line carries a tel: link. Eight seconds is enough to READ it, not always to
  // reach it: hovering (or focusing) stops the clock, as most toasts do.
  const { c, gone, clock } = toastClock();
  clock.start();
  c.advance(3000);
  clock.hold("pointer", true);
  c.advance(60_000);
  assert.deepEqual(gone, [], "held: still there a minute later");
  assert.equal(c.pending(), 0, "no timer runs while held");
  clock.hold("pointer", false);
  c.advance(P.TOAST_MS - 3000 - 1);
  assert.deepEqual(gone, []);
  c.advance(1);
  assert.deepEqual(gone, [3000 + 60_000 + P.TOAST_MS - 3000]);
});

test("toast clock: focus and pointer hold it together; it runs again only when both let go", () => {
  const { c, gone, clock } = toastClock();
  clock.start();
  clock.hold("focus", true);
  clock.hold("pointer", true);
  clock.hold("pointer", false);
  c.advance(30_000);
  assert.deepEqual(gone, [], "still focused");
  clock.hold("pointer", true);
  clock.hold("pointer", true); // a repeat is not a second hold
  clock.hold("pointer", false);
  clock.hold("focus", false);
  c.advance(P.TOAST_MS);
  assert.equal(gone.length, 1);
});

test("toast clock: a new toast starts a full run; let-go after it has gone does nothing; dispose stops it", () => {
  {
    const { c, gone, clock } = toastClock();
    clock.start();
    c.advance(6000);
    clock.start(); // a second Send while the first toast is still up
    c.advance(P.TOAST_MS - 1);
    assert.deepEqual(gone, []);
    c.advance(1);
    assert.equal(gone.length, 1);
  }
  {
    // pointerleave / blur can arrive after the toast has gone (the element shrinks to
    // sr-only under the pointer); that must not schedule a stray expiry.
    const { c, gone, clock } = toastClock();
    clock.start();
    c.advance(P.TOAST_MS);
    clock.hold("pointer", true);
    clock.hold("pointer", false);
    clock.hold("focus", false);
    c.advance(60_000);
    assert.equal(gone.length, 1);
    assert.equal(c.pending(), 0);
  }
  {
    const { c, gone, clock } = toastClock();
    clock.start();
    clock.dispose();
    c.advance(60_000);
    assert.deepEqual(gone, []);
  }
  {
    // A toast that was held when it went away (cannot happen today, but a stale hold must
    // not freeze the NEXT toast forever).
    const { c, gone, clock } = toastClock();
    clock.start();
    clock.hold("focus", true);
    clock.dispose();
    clock.start();
    c.advance(P.TOAST_MS);
    assert.equal(gone.length, 1, "a fresh toast is not held by an old hold");
  }
});

test("the popup runs its toast on the clock: hover and focus hold it, and nothing else times it", () => {
  const popup = read("app/components/MyBookingsEmail.tsx");
  assert.match(popup, /createToastClock\(/);
  const toast = popup.slice(popup.indexOf('role="status"') - 200);
  assert.match(toast, /onPointerEnter=\{[^}]*hold\("pointer", true\)/);
  assert.match(toast, /onPointerLeave=\{[^}]*hold\("pointer", false\)/);
  assert.match(toast, /onFocus=\{[^}]*hold\("focus", true\)/);
  assert.match(toast, /onBlur=\{[\s\S]{0,200}hold\("focus", false\)/);
  assert.doesNotMatch(popup, /setTimeout\(\(\) => setToast\(false\)/, "the old fixed timer is gone");
});

test("desktop toast: up to 640px wide, so the second line and its number sit on one line", () => {
  // Review, 2026-10-21: capped at 520px, "(484) 252-2523." dropped onto a third line of its
  // own. w-max sizes it to the text (left:50% alone would cap it at half the viewport), and
  // the cap keeps a 1rem margin either side on a narrow desktop window.
  const popup = read("app/components/MyBookingsEmail.tsx");
  const cls = popup.slice(popup.indexOf('role="status"')).match(/"fixed z-\[95\][^"]*"/)[0];
  assert.match(cls, /\bsm:w-max\b/);
  assert.match(cls, /sm:max-w-\[min\(640px,calc\(100%_-_2rem\)\)\]/);
  assert.doesNotMatch(cls, /520px/);
  assert.match(cls, /left-4 right-4 bottom-6/, "phones unchanged");
});

/* ── the mailing-list box ─────────────────────────────────────────────────── */

test("the box's focus ring is ember INK: at least 3:1 on the light theme's white panel", () => {
  // Review, 2026-10-21 (WCAG 1.4.11): --color-ember #F89B72 on white is 2.12:1. --ember-ink
  // is the same hue darkened for light (globals.css) and IS --color-ember on dark.
  const popup = read("app/components/MyBookingsEmail.tsx");
  const at = popup.indexOf('type="checkbox"');
  const box = popup.slice(at, popup.indexOf("/>", at));
  assert.match(box, /focus-visible:outline-\[var\(--ember-ink\)\]/);
  assert.doesNotMatch(box, /outline-\[var\(--color-ember\)\]/);
  const css = read("app/globals.css");
  const light = css.slice(css.indexOf(':root[data-theme="light"] {'));
  const hex = (name) => light.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))[1];
  const lum = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const r = ratio(hex("--ember-ink"), hex("--color-void"));
  assert.ok(r >= 3, `ember-ink on the light panel: ${r.toFixed(2)}:1`);
});

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
