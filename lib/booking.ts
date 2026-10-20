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

/** The booking CTA target, and whether it leaves the site. */
export function bookingTarget(url: string): { href: string; external: boolean } {
  return isOpen() ? { href: url, external: true } : { href: '#waitlist', external: false }
}
