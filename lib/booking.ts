// Where "book" goes.
//
// Court booking and class booking both live on the platform, behind sign-in.
// Until the club opens there is nothing to book, so every booking CTA falls
// back to the waitlist rather than dropping someone on a login screen for a
// club that has no slots yet.

import { isOpen } from './opening'

const APP_URL = (process.env.NEXT_PUBLIC_ORANGISH_APP_URL || 'https://app.orangish.io').replace(/\/$/, '')

/** The MEMBER path: signed-in booking on the platform, with member pricing and perks.
 *  Since 2026-10-13 nothing on this site links here directly — the guest path below
 *  offers "Already a member? Sign in to book", which arrives here with the same slot. */
export const BOOK_COURTS_URL = `${APP_URL}/book/courts`

/**
 * The GUEST path, 2026-10-13, and where every court CTA and every free calendar cell
 * now points. Aniket: "click book a court or go to the calendar — enter your email id,
 * enter the number of players, enter the time and number of courts and pay via credit
 * card ... that button or the calendar by clicking the timeslot takes to this path."
 *
 * No login: pick sport, time, courts and players, give an email, pay by card. The
 * platform emails the confirmation, how to get in and a sign-the-waiver link, and makes
 * an Orangish account for an address that has none, at Exton. It takes the same
 * ?sport_id=&court_id=&date=&start_time= the member deep link does, so the calendar's
 * links work unchanged. Spec: orangish-app docs/guest-court-booking.md.
 *
 * ⚠️ 'exton-sports' IS THE PLATFORM'S SLUG for this club (locations.slug), the same one
 * lib/club-pricing.ts reads. The page refuses — politely, with a sign-in link — until the
 * club's features.guest_court_booking is switched on, so this site must not ship ahead of
 * that switch.
 */
export const BOOK_COURT_URL = `${APP_URL}/book-court/exton-sports`
/**
 * ⛔ NOT /book/events. That is the platform's club EVENTS page — tournaments,
 * socials, facility events — and it reads the `events` table. A class is a
 * `group_sessions` row under a `squad_programs` programme, and those live at
 * /book/squads. So the Bollywood Fitness card, whose price and timetable are read
 * live from the platform, would have sent people to a page that could never
 * list the class they had just read the price of.
 *
 * Nothing caught it because the button is still gated behind isOpen() below and
 * has never once used this URL — the destination has been wrong since the day
 * it shipped, silently, waiting for the doors to open.
 *
 * No club id needed: /book/squads is cross-club and readable without a
 * membership, so a visitor arriving cold from here signs in and sees the class.
 */
export const BOOK_CLASSES_URL = `${APP_URL}/book/squads`

/**
 * The Bollywood Fitness programme's OWN page, and where the class CTA now points.
 *
 * BOOK_CLASSES_URL above is the generic cross-club class list — still correct
 * for Featured.tsx, which is not about one programme. This one names the class:
 * it opens on the next three dates with a Register button each, plus both
 * packs, and it READS without signing in. A visitor who has just read "$25
 * drop-in, Tuesdays & Thursdays" lands on that, not on a list of every club's
 * squads with a login wall in front of it.
 *
 * ⚠️ 'bollywood' IS HARDCODED AND CANNOT BE DERIVED. programSlug() in
 * lib/club-schedule.ts turns "Bollywood Fitness" into 'bollywood-fitness', which
 * 404s, and /api/public/clubs/<slug> does not publish the programme slug at all
 * (verified against the live payload 2026-09-09: name, type, rates, packs,
 * currency — no slug). The durable fix is to add `slug` to that endpoint's
 * programs[]; until then this string is the join, and it is load-bearing.
 *
 * The platform keeps retired slugs resolving (squad_programs.previous_slugs,
 * plus a trigger), so a rename on that side does not immediately break this —
 * but nothing here would notice if it did.
 *
 * Verified live 2026-09-09: https://app.orangish.io/c/bollywood → HTTP 200.
 * It 404'd until orangish-app #564 merged, which is why this constant could not
 * ship before that did.
 */
export const BOLLYWOOD_CLASS_URL = `${APP_URL}/c/bollywood`

/**
 * The Junior Squad programme's own page — the squash equivalent of the line above.
 *
 * Same `/c/<slug>` shape, and the same caveat applies: 'exton-junior-squad' is the
 * value of squad_programs.slug and CANNOT be derived from the name
 * (programSlug() would give 'junior-squad', which is not it, and the public clubs
 * endpoint still does not publish the slug). This string is the join.
 *
 * Verified live 2026-10-05: https://app.orangish.io/c/exton-junior-squad → HTTP 200.
 */
export const SQUAD_CLASS_URL = `${APP_URL}/c/exton-junior-squad`

/**
 * Where a partner's hour on the calendar of bookings leads, 2026-10-13 — Aniket: their
 * websites for Philadelphia Badminton and CCCA, the squad booking for SquashTigers, the
 * class booking for Sera. The same four destinations the platform's booking page uses
 * (orangish-app lib/guest-court-booking-rules.ts PARTNER_LINK); the two sites are the
 * ones the partner strip in Hero.tsx already links. Keys are the platform's closed
 * vocabulary (lib/court-partners.ts there; BrandKey in app/board/board-lib.ts here).
 */
export const PARTNER_LINK: Record<
  'squashtigers' | 'ccca' | 'philadelphia-badminton' | 'sera',
  { href: string; label: string }
> = {
  'philadelphia-badminton': { href: 'https://philadelphiabadminton.com', label: 'Learn more' },
  ccca: { href: 'https://cccricketacademy.com', label: 'Learn more' },
  squashtigers: { href: SQUAD_CLASS_URL, label: 'Book a squad' },
  sera: { href: BOLLYWOOD_CLASS_URL, label: 'Book a class' },
}

/**
 * The Starter Pack's self-serve checkout: five 30-minute lessons, $195, juniors
 * only, one per player ever. Added 2026-10-13.
 *
 * The path segment is Exton's locations.slug ('exton-sports'), not anything this
 * site names — the platform resolves the club from it, prices from Exton's own
 * rates row, and checks age and the once-ever rule before any money moves. The
 * page reads without signing in; Buy asks the player to sign in and returns them
 * here. Exton's staff book the five sessions afterwards.
 *
 * Hartford sells the same pack desk-only; this is the Exton-only public door.
 */
export const STARTER_PACK_URL = `${APP_URL}/starter/exton-sports`

/**
 * The pay page: anyone pays Exton any amount, by Zelle or card (orangish-app /pay/[slug],
 * live 2026-10-16). extonsports.com/pay redirects here too (next.config.ts) — that short
 * form is for Aniket's email footer; on the site we link straight to the page.
 */
export const PAY_URL = `${APP_URL}/pay/exton-sports`

/**
 * "Email my bookings", 2026-10-21 — Aniket: "someone enters their email id and we email them
 * their current and forthcoming bookings ... this can be a popup or something? easy to do -
 * one email id, press send and the popup disappears."
 *
 * The hero's "My bookings" button opens a popup (app/components/MyBookingsEmail.tsx) that
 * POSTs { club, email, website } STRAIGHT FROM THE BROWSER to this platform route. No site
 * relay, on purpose: a relay would make every visitor arrive from the relay's one IP, which
 * is exactly why the enquiry and workshop routes call their per-IP limits "nearly worthless".
 * The route allows only https://www.extonsports.com and https://extonsports.com (plus
 * localhost outside production) and answers 202 for every well-formed address, whether it
 * has bookings or not, so the popup can never tell a stranger what an address books here.
 * Contract: orangish-app docs/booking-list-email.md.
 *
 * ⚠️ 'exton-sports' IS THE PLATFORM'S SLUG (locations.slug), like BOOK_COURT_URL above; a
 * town name here fails silently as a 400 the visitor reads as "couldn't send".
 */
export const BOOKING_LIST_EMAIL_URL = `${APP_URL}/api/public/booking-list-email`
export const BOOKING_LIST_CLUB = 'exton-sports'

/**
 * ⛔ THE KILL SWITCH for the hero's "My bookings" button and its popup. `false` hides both;
 * the calendar stays in the footer either way. The platform has its own switch
 * (locations.features.booking_list_email): while that is off the route answers 404, and the
 * popup says it couldn't send, which is honest and gives nothing away. So the order is the
 * platform first, then Aniket's own live test, then this site (orangish-app
 * docs/booking-list-email.md, "Rollout").
 *
 * Named apart from the unmerged /my-bookings branch's MY_BOOKINGS_LIVE on purpose: that is a
 * different feature (sign in by link, see and cancel), and the two must not share a switch.
 */
export const BOOKING_LIST_EMAIL_LIVE = true

/**
 * ⛔ ONLINE REGISTRATION. Governs the Register buttons on the squash and
 * dance/fitness rows — cricket and badminton deliberately have none, because
 * their bookings are not managed on the platform (Aniket, 2026-10-05).
 *
 * ⚠️ TURNED BACK ON 2026-10-05 at Aniket's request, and the warning below is
 * STILL UNANSWERED as of that date — re-verified, not assumed:
 *   • Exton has 0 completed registrations. 3 pending, 3 cancelled, nothing else.
 *   • locations.features->>'adults_only_classes' at Exton is STILL NULL, so
 *     "Adults 19+" is displayed and not enforced.
 * So the first person through this path is still liable to be a paying
 * customer. Set back to `false` to close it again; that is a one-line change
 * and it hides the buttons without touching the pages, which stay public.
 *
 * Originally turned off 2026-09-09, the day it went live, at Aniket's request: the link
 * and the page both work, but NOBODY HAS EVER COMPLETED A REGISTRATION through
 * them. No account has been created from a cold start, no seat claimed, no card
 * charged, and no waitlist promotion exercised. The first person to try must
 * not be a paying customer of the Studio's.
 *
 * What this hides is ONLY the "Book online" button in the studio class pane.
 * "Call to register" is the other side of the same switch (2026-10-13): hidden
 * while this is true, so the class shows one Register button, and shown again
 * the moment this is false — the flyer's own route, needing no account.
 *
 * ⚠️ IT HIDES THE BUTTON, NOT THE PAGE. https://app.orangish.io/c/bollywood is
 * public and stays reachable by anyone holding the link. This is a soft close
 * on one entry point, not a gate. If registrations must be stopped outright,
 * that is a platform-side change (features.squads at Exton), not this constant.
 *
 * BEFORE FLIPPING IT BACK: walk the cold path on a throwaway account from a
 * phone — sign up, clear the legal gate, pay the $25, confirm the money reached
 * Exton's connected account, then refund it. The magic-link path specifically,
 * because `next` has to survive a Supabase email template that lives outside
 * both repos. Also set features.adults_only_classes at Exton, which is still
 * unset, so "Adults 19+" is currently displayed but not enforced.
 *
 * Deliberately NOT wired to isOpen()/bookingTarget(). Those answer "has the
 * club opened yet", which is a different question with a different answer — see
 * the comment on the class entry in Hero.tsx.
 */
export const CLASS_ONLINE_BOOKING_LIVE = true

/**
 * "My bookings" — a guest's own upcoming court bookings, and Cancel, 2026-10-20. Owner,
 * 2026-10-18: "let's build the cancel path", "im ok with refund for now", "i want to stay
 * away from the orangish-app". So the PAGES are this site's (app/my-bookings), on
 * www.extonsports.com, with a first-party cookie; the bookings, the refund and the emails
 * stay in the platform, reached server-to-server (lib/my-bookings/platform.ts). Spec:
 * orangish-app docs/guest-my-bookings.md.
 *
 * Relative, so it opens in the same tab — it is this site, not the app.
 */
export const MY_BOOKINGS_PATH = '/my-bookings'

/**
 * ⛔ THE ENTRY POINTS, NOT THE PAGE. Governs only the footer link and the hero button.
 * /my-bookings itself is live as soon as this site deploys — on purpose, BEFORE anything
 * links to it (switch-on step 4): the platform's emails link to it from step 7 on, and a
 * link to a page that is not there yet would be a 404 in a guest's inbox. Until the
 * platform's features.guest_self_manage is switched on at Exton, every call behind it
 * answers 404 not_available and the page says so; a visible link would lead only to that.
 * Same shape as CLASS_ONLINE_BOOKING_LIVE above.
 *
 * BEFORE FLIPPING IT (switch-on step 9 of orangish-app docs/guest-my-bookings.md §7,
 * rewritten 2026-10-20 after the second review): steps 1–8 done — the migration applied
 * and verified; EXTON_RELAY_SECRET set to the SAME value in both Vercel projects (this
 * site and orangish-app; `openssl rand -base64 32`); the platform deployed, then THIS site
 * with this still false; the production Resend account's extonsports.com domain checked;
 * charge.refund.updated enabled on the platform webhook; the flag on; and the owner's
 * live end-to-end cancel of a TWO-court booking checked (Stripe refund, calendar, TVs,
 * lights schedule, both emails, the audit row) — a multi-court series has never run in
 * production. The confirmation email's own "Manage or cancel" button is step 10, after
 * this (features.guest_self_manage_email).
 *
 * The relay secret is a switch in its own right (security review, 2026-10-20): while it
 * is unset on either side, every /my-bookings call fails closed and the page says "we
 * can't show your bookings right now" (lib/my-bookings/platform.ts).
 */
export const MY_BOOKINGS_LIVE = false

/**
 * THE COURT 5-PACK, 2026-10-21. Owner, 2026-10-20: "let's go with the implentation.." —
 * five one-hour credits for one sport, $200 squash and badminton, $275 cricket, used within
 * 60 days of the first game played (orangish-app docs/court-packs.md). Bought on
 * PACK_PATH (this site, then Stripe); spent from the app's booking form, which hands the
 * slot to PACK_BOOK_PATH here, where the remembered device lives (§0).
 */
export const PACK_PATH = '/5-pack'
export const PACK_TERMS_PATH = '/5-pack/terms'
/** Where the app form's "Continue with my 5-pack" lands, via /my-bookings/pack/start. */
export const PACK_BOOK_PATH = '/my-bookings/pack'

/**
 * ⛔ THE ENTRY POINTS, NOT THE PAGES — the MY_BOOKINGS_LIVE pattern. Governs only the
 * "5-pack" links in the Hero, the RateCard and the Footer, and the sitemap entry. The pages
 * deploy unlinked and fail closed: until the platform's features.court_packs_public is on,
 * /5-pack's offers answer 404 and the page says packs are not on sale.
 *
 * BEFORE FLIPPING IT (design §12, step 8): steps 0–7 done — My bookings fully live; the
 * pack migrations applied and verified with Aniket's yes; the platform deployed with both
 * flags absent, then this site with this still false; court_packs on; the owner's live
 * test (a desk sale, a 2-court × 1 h pack booking, a self-cancel, a desk return inside 24
 * hours, the two-phone race for the last credit, cp_audit_invariants empty, a refund that
 * closes the pack); court_packs_public on and one pack bought online from the unlinked
 * /5-pack, then refunded. AND the key-box revoke live (Aniket, 2026-10-20: a cancelled
 * booking's code is deleted from the box; "Do not ship the pack before the revoke is live").
 */
export const PACKS_LIVE = false

/** A slot on the app's form, in its deep-link vocabulary. lib/my-bookings/session.ts
 *  PackSelection is one. */
export type BookingSlot = {
  sportId: string
  date: string
  startTime: string
  hours: number
  courts: number
  preferCourtId?: string | null
}

const SLOT_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The form's existing deep-link parameters (orangish-app app/book-court/[slug]/page.tsx):
 *  sport_id, date, start_time, hours, courts, court_id. Unchanged by the pack. */
function slotParams(p: URLSearchParams, slot: BookingSlot): void {
  p.set('sport_id', slot.sportId)
  p.set('date', slot.date)
  p.set('start_time', slot.startTime)
  p.set('hours', String(slot.hours))
  p.set('courts', String(slot.courts))
  if (slot.preferCourtId) p.set('court_id', slot.preferCourtId)
}

/**
 * The app's booking form in pack mode (?pay=pack shows "My 5-pack" even before
 * court_packs_public). With a sport, that sport is picked; with a slot, that slot too, so
 * "Pick another time" keeps the guest's day. Built HERE from values this site checked, so a
 * pack card's "Book a court with my pack" never follows a link the platform sent.
 *
 * ⚠️ THIS LEAVES extonsports.com, on purpose (design §0): the booking form — prices, live
 * availability, the pack switch — is the app's, and the pack path returns to it to pick a
 * time. The guest's own pages still never carry a sign-in token there.
 */
export function bookWithPackUrl(sportId?: string | null, slot?: BookingSlot | null): string {
  const p = new URLSearchParams({ pay: 'pack' })
  if (slot && SLOT_UUID_RE.test(slot.sportId)) slotParams(p, slot)
  else if (sportId && SLOT_UUID_RE.test(sportId)) p.set('sport_id', sportId)
  return `${BOOK_COURT_URL}?${p}`
}

/** The same slot on the app's form, paying by card — "Pay by card instead". */
export function bookByCardUrl(slot: BookingSlot): string {
  const p = new URLSearchParams()
  slotParams(p, slot)
  return `${BOOK_COURT_URL}?${p}`
}

/**
 * A link the PLATFORM sent (the booking terms' url on a pack quote), kept only when it
 * resolves to the platform's own https origin; anything else is null and the caller treats
 * the answer as unusable. Never a javascript:, data: or third-party URL on a page, however
 * the answer was made.
 */
export function appHref(v: unknown): string | null {
  if (typeof v !== 'string' || v.length === 0 || v.length > 500) return null
  let base: URL
  let u: URL
  try {
    base = new URL(APP_URL)
    u = new URL(v, base)
  } catch {
    return null
  }
  // Origin includes the scheme: http://app.orangish.io is not the platform. (In `next dev`
  // NEXT_PUBLIC_ORANGISH_APP_URL may be an http localhost, and then that is the origin.)
  if (u.origin !== base.origin || u.username || u.password) return null
  return u.href
}

/** The booking CTA target, and whether it leaves the site. */
export function bookingTarget(url: string): { href: string; external: boolean } {
  return isOpen() ? { href: url, external: true } : { href: '#waitlist', external: false }
}
