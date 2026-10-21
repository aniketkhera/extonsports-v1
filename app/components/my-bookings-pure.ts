/* The pure half of "Email my bookings" (2026-10-21): no React, no window, no clock.
   ──────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: "someone enters their email id and we email them their current and
   forthcoming bookings", "one email id, press send and the popup disappears", "ignore
   texting for now. just email is fine." The popup is MyBookingsEmail.tsx; everything it
   decides lives here so node:test can pin it (my-bookings-pure.test.mjs).

   ⛔ NEVER REVEAL. The platform (orangish-app app/api/public/booking-list-email) answers 202
   for every well-formed address, known or not, with bookings or without, rate-limited or
   not, and sends an email only when there is something to list. So "sent" here means "the
   platform took the request", and the toast says the same two lines every time. The only
   thing the visitor is ever told about their input is that it is not an email address.

   The mailing-list box (2026-10-21) changes none of that: its request goes to this site's
   /api/mailing-list-optin on the side, and nothing it answers reaches the screen. */

import { BOOKING_LIST_CLUB, BOOKING_LIST_EMAIL_URL } from "../../lib/booking";
import { CONTACT_PHONE, CONTACT_PHONE_E164 } from "../../lib/legal";

/** Every word the popup and its toast say. Approved in the mockups, 2026-10-21. */
export const COPY = {
  title: "Email my bookings",
  line: "We'll email you today's and upcoming bookings.",
  label: "Email",
  placeholder: "you@example.com",
  send: "Send",
  sending: "Sending…",
  close: "Close",
  toast: "Sent. If that email has bookings with us, they're on their way.",
  /* The toast's second line, Aniket 2026-10-21 ("1. add it."); the number follows as a
     tel: link (TOAST_PHONE, TOAST_TEL), then a full stop. Shown in every case, like the
     first line, so it says nothing about the address either. */
  toastHelp: "Nothing arriving? Check it's the email you booked with, or call ",
  /* The mailing-list box, Aniket 2026-10-21: "also adda a checkbox, checked by default -
     add to our mailing list?" */
  optin: "Add me to the Exton Sports mailing list",
  invalid: "Please enter a valid email address.",
  /* The platform is down, switched off, or the request never left. Nothing about the
     address is involved, so saying so gives nothing away; keeping the popup open (rather
     than a toast that says "sent") is the honest answer.
     The number's space is a no-break space (U+00A0), 2026-10-21 review: in the 440px panel
     "(484)" ended one line and "252-2523." began the next. */
  failed: `We couldn't send that just now. Please try again, or call ${CONTACT_PHONE.replace(/ /g, " ")}.`,
} as const;

/** About 8 s since the toast grew a second line (2026-10-21; it was 4 s for one sentence):
 *  long enough to read both lines, and it still goes away on its own. */
export const TOAST_MS = 8000;

export type ToastHold = "pointer" | "focus";

/** The toast's timer, which stops while somebody is on the toast (review, 2026-10-21).
 *  The second line carries a tel: link; TOAST_MS is long enough to read it but not always
 *  to reach it, so a pointer over the toast or focus inside it holds it, and letting go
 *  gives back only the time that was left (the usual toast behaviour). Untouched, it goes
 *  after TOAST_MS exactly as before. Pure, with the clock injected, so node:test can wind it.
 *  start(): a toast was shown (again): a full run, and any old hold is forgotten.
 *  hold(kind, on): pointer or focus arrived (true) or left (false); ignored once it has gone. */
export function createToastClock(opts: {
  ms: number;
  onExpire: () => void;
  now?: () => number;
  set?: (fn: () => void, ms: number) => unknown;
  clear?: (id: unknown) => void;
}): { start(): void; hold(kind: ToastHold, on: boolean): void; dispose(): void } {
  const now = opts.now ?? (() => Date.now());
  const set = opts.set ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clear = opts.clear ?? ((id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>));
  const held = { pointer: false, focus: false };
  let active = false;
  let left = 0;
  let timer: unknown = null;
  let since = 0;

  const stop = () => {
    if (timer === null) return;
    clear(timer);
    timer = null;
    left = Math.max(0, left - (now() - since));
  };
  const run = () => {
    if (!active || timer !== null || held.pointer || held.focus) return;
    since = now();
    timer = set(() => {
      timer = null;
      active = false;
      opts.onExpire();
    }, left);
  };

  return {
    start() {
      stop();
      held.pointer = false;
      held.focus = false;
      active = true;
      left = opts.ms;
      run();
    },
    hold(kind, on) {
      if (held[kind] === on) return;
      held[kind] = on;
      if (!active) return;
      if (on) stop();
      else run();
    },
    dispose() {
      stop();
      active = false;
    },
  };
}

/** The number in the toast's second line, as shown (its space a no-break space, as in
 *  COPY.failed, so "(484)" and "252-2523" never part) and as dialled. */
export const TOAST_PHONE = CONTACT_PHONE.replace(/ /g, " ");
export const TOAST_TEL = `tel:${CONTACT_PHONE_E164}`;

/* The platform's own pattern, character for character: orangish-app app/api/public/enquiry
   and workshop-registration (origin/master, 2026-10-21). The route refuses with 400 exactly
   what this refuses, so the popup's inline message and the platform's answer agree. A test
   pins the source string; change both sides at once or not at all. */
export const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** RFC 5321's limit, and the platform's. */
const MAX_EMAIL = 254;

/** Is this something the platform will accept as an address? Shape only, never the account. */
export function isEmailShaped(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const e = value.trim();
  if (!e || e.length > MAX_EMAIL) return false;
  // .invalid is the platform's placeholder TLD (guest stubs, managed juniors); the route
  // refuses it as not routable (lib/receipt-email.ts isRoutableAddress), so do we.
  if (/\.invalid\.?$/i.test(e)) return false;
  return EMAIL_RE.test(e);
}

/** The JSON body: { club, email, website }. `website` is the honeypot: a field no person can
 *  see or reach, so it is empty from a person. Forwarded as it is, so the platform can drop a
 *  filled one silently (it answers the same 202 and does nothing). */
export function requestBody(email: string, website = ""): { club: string; email: string; website: string } {
  return { club: BOOKING_LIST_CLUB, email: email.trim(), website };
}

/* application/json on purpose: it makes the browser PREFLIGHT, so a third-party page cannot
   fire this from a visitor's browser as a "simple" text/plain POST (the route answers 415 to
   anything else). credentials 'omit': the site has nothing to send, and a cookie must never
   ride along cross-site. */
export function fetchInit(email: string, website = ""): {
  method: "POST"; mode: "cors"; credentials: "omit"; headers: Record<string, string>; body: string;
} {
  return {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(email, website)),
  };
}

export type Outcome = "sent" | "invalid" | "failed";

/** The ONLY thing the response may change: 202 → sent, 400 → invalid, anything else → failed. */
export function outcomeFor(status: number): Outcome {
  if (status === 202) return "sent";
  if (status === 400) return "invalid";
  return "failed";
}

/** How long the popup waits before calling it failed. */
export const SEND_TIMEOUT_MS = 8000;

type FetchLike = (url: string, init: RequestInit) => Promise<{ status: number }>;

/** Send one request. Never throws: a network error, a CORS refusal or a timeout is 'failed'. */
export async function sendBookingList(
  email: string,
  opts: { website?: string; fetchImpl?: FetchLike; url?: string; timeoutMs?: number } = {},
): Promise<Outcome> {
  if (!isEmailShaped(email)) return "invalid";
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  try {
    const res = await doFetch(opts.url ?? BOOKING_LIST_EMAIL_URL, {
      ...fetchInit(email, opts.website ?? ""),
      signal: AbortSignal.timeout(opts.timeoutMs ?? SEND_TIMEOUT_MS),
    });
    return outcomeFor(res.status);
  } catch {
    return "failed";
  }
}

/* ── the mailing-list box (2026-10-21) ───────────────────────────────────────
   Ticked, Send ALSO posts the address to this site's own route, which adds it to Exton's
   mailing list only if the list has never had it (app/api/mailing-list-optin/optin-core.ts
   says why it is not the footer's /api/waitlist). The two requests are independent: either
   can fail without touching the other, and the toast is the booking list's alone. */

/** Same origin: the route is this site's, beside the footer's /api/waitlist. */
export const OPTIN_URL = "/api/mailing-list-optin";

/** { email, website } only. No source and no property: the route sets those itself. JSON,
 *  which is all the route takes. keepalive, so a visitor who leaves the page straight after
 *  Send still gets the request out. */
export function optinInit(email: string, website = ""): {
  method: "POST"; credentials: "same-origin"; keepalive: true; headers: Record<string, string>; body: string;
} {
  return {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), website }),
  };
}

/** One mailing-list request. Never throws; true only on the route's 202. Nobody is shown
 *  the answer: it is for the tests, and for nothing else. */
export async function joinMailingList(
  email: string,
  opts: { website?: string; fetchImpl?: FetchLike; url?: string; timeoutMs?: number } = {},
): Promise<boolean> {
  if (!isEmailShaped(email)) return false;
  const doFetch: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  try {
    const res = await doFetch(opts.url ?? OPTIN_URL, {
      ...optinInit(email, opts.website ?? ""),
      signal: AbortSignal.timeout(opts.timeoutMs ?? SEND_TIMEOUT_MS),
    });
    return res.status === 202;
  } catch {
    return false;
  }
}

/** What Send does: the booking-list request, whose outcome is the popup's, and when the
 *  box is ticked the mailing-list request beside it, fired and forgotten. Unticked, no
 *  mailing-list request is made at all. */
export function sendWithOptin(
  email: string,
  opts: { optin: boolean; website?: string },
  impl: {
    sendBookingList: (email: string, o: { website?: string }) => Promise<Outcome>;
    joinMailingList: (email: string, o: { website?: string }) => Promise<boolean>;
  } = { sendBookingList, joinMailingList },
): Promise<Outcome> {
  const website = opts.website ?? "";
  if (opts.optin) {
    try {
      impl.joinMailingList(email, { website }).catch(() => {});
    } catch {
      /* A mailing-list failure must never reach the booking list or the toast. */
    }
  }
  return impl.sendBookingList(email, { website });
}

/** The popup's Tab trap: from stop `i` of `n` (the field, the box, Send, ×; a disabled one drops out),
 *  where Tab (`back` false) or Shift+Tab (`back` true) goes next. It wraps both ways.
 *  i === -1 is focus on none of the stops: on the panel itself, after a click on its title,
 *  its line or its padding. Review, 2026-10-21: before the panel took focus (tabIndex -1)
 *  that click dropped focus to <body>, the panel's keydown never fired, and Shift+Tab walked
 *  onto the page behind the scrim. Now Tab from the panel enters at the field, Shift+Tab at ×. */
export function nextTrapIndex(i: number, n: number, back: boolean): number {
  if (back) return i <= 0 ? n - 1 : i - 1;
  return i === -1 || i === n - 1 ? 0 : i + 1;
}

/** Only a plain left click opens the overlay; ctrl/cmd/shift/alt and the middle button
 *  keep the link's own behaviour (a new tab or window on /calendar). */
export function isPlainLeftClick(e: {
  button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean;
}): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}
