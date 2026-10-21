/* The pure half of "Email my bookings" (2026-10-21): no React, no window, no clock.
   ──────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: "someone enters their email id and we email them their current and
   forthcoming bookings", "one email id, press send and the popup disappears", "ignore
   texting for now. just email is fine." The popup is MyBookingsEmail.tsx; everything it
   decides lives here so node:test can pin it (my-bookings-pure.test.mjs).

   ⛔ NEVER REVEAL. The platform (orangish-app app/api/public/booking-list-email) answers 202
   for every well-formed address, known or not, with bookings or without, rate-limited or
   not, and sends an email only when there is something to list. So "sent" here means "the
   platform took the request", and the toast says the same eleven words every time. The only
   thing the visitor is ever told about their input is that it is not an email address. */

import { BOOKING_LIST_CLUB, BOOKING_LIST_EMAIL_URL } from "../../lib/booking";
import { CONTACT_PHONE } from "../../lib/legal";

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
  invalid: "Please enter a valid email address.",
  /* The platform is down, switched off, or the request never left. Nothing about the
     address is involved, so saying so gives nothing away; keeping the popup open (rather
     than a toast that says "sent") is the honest answer. */
  failed: `We couldn't send that just now. Please try again, or call ${CONTACT_PHONE}.`,
} as const;

/** "About 4 s" (spec): long enough to read the sentence, short enough not to linger. */
export const TOAST_MS = 4000;

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

/** Only a plain left click opens the overlay; ctrl/cmd/shift/alt and the middle button
 *  keep the link's own behaviour (a new tab or window on /calendar). */
export function isPlainLeftClick(e: {
  button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean;
}): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && !e.defaultPrevented;
}
