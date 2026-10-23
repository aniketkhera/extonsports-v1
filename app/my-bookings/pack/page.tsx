import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { readDeviceToken, readPackSelection } from "@/lib/my-bookings/session-server";
import { packOffers, packQuote } from "@/lib/my-bookings/platform";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { mintRequestKey, type PackSelection } from "@/lib/my-bookings/session";
import type { PackChoice, PackClock, PackRefusalReason, PackView, QuoteSlot } from "@/lib/my-bookings/view";
import {
  DEFAULT_CUTOFF_HOURS, FALLBACK_PHONE, PACK_COPY, PACK_SIGNIN, bookMessage, bookingAs, buySportPack, packLine,
  payByCard, refusalText, savesLine, slotSummary, type RefusalContext,
} from "@/lib/my-bookings/copy";
import { PACKS_LIVE, bookByCardUrl, bookWithPackUrl, packBuyUrl } from "@/lib/booking";
import { clubDate, startsWithinHours } from "@/lib/opening";
import RequestPanel from "../_components/RequestPanel";
import NotYou from "../_components/NotYou";
import PhoneText from "../_components/PhoneText";
import PackConfirm, { PackBar } from "../_components/PackConfirm";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT } from "../_components/ui";

// extonsports.com/my-bookings/pack — book the slot the app's form handed over with a court
// pack, 2026-10-21. Owner, 2026-10-20: "let's go with the implentation.."; the screens are
// orangish-app docs/court-packs.md §8.1 (mock panels 2–4), word for word from
// lib/my-bookings/copy.ts.
//
// WHY HERE AND NOT IN THE APP'S FORM (§0): the remembered device is this site's host-only
// cookie, which the app cannot read, and a second sign-in on the app was ruled out. So the
// form's "Continue with my court pack" goes to /my-bookings/pack/start, which parks the
// slot, and lands here. (Aniket, 2026-10-22: credits are spent only through that form and
// this site at launch — not the member app.)
//
// ONE URL, every state, decided on the server from two cookies and one quote:
//   no parked slot              → "Pick a time first." [Book a court] (the form, pack mode)
//   quote 'off' (flag off)      → "Booking with a court pack isn't available…" + pay by card
//   quote unreachable / no relay→ "We couldn't reach the booking system…" + pay by card
//   slotProblem                 → the platform's sentence + [Pick another time]
//   session 'none'              → the slot, then the email → code sign-in (RequestPanel),
//                                 which comes back HERE; [Pay by card instead]
//   'match' + choice            → "Booking as a•••@… on this phone · Not you?", the pack
//                                 card, the savings, the terms box and Book (PackConfirm)
//   'match' + refusal           → why this pack can't pay, + pay by card / buy a pack
//
// ⛔ NOTHING BEFORE 'match' SAYS WHETHER AN ADDRESS HOLDS A PACK (owner, 2026-10-18). The
// 'none' screen shows the SLOT only, and the sign-in's sentences are PACK_SIGNIN's, the same
// for every address. lib/my-bookings/view.ts toQuote drops packs, email, choice and refusal
// from any answer that is not 'match', whatever the platform sent.
//
// THE REQUEST KEY is minted here, once per render (mintRequestKey), and goes into the form:
// a second press, or a retry after "try again", carries the same key and books once. A
// reload makes a new one — after "this booking changed", that is the point.
//
// Links: "Pay by card" and "Pick another time" leave for the app's form — on purpose (§0;
// the form owns prices and live availability) — and are built in lib/booking.ts from the
// slot this site checked, never from a URL the platform sent. "Buy a … court pack" goes to
// this site's /court-packs, and only while PACKS_LIVE is on: the buy pages deploy unlinked
// (§12). 2026-10-22 (Aniket: squash packs are no longer sold, squash courts remain): only
// for a sport the live offers list sells (lib/booking.ts packBuyUrl), so a squash slot that
// reaches this page by a stale link is never walked to a page with no squash pack on it —
// it gets "Pay by card". The offers are asked for alongside the quote, never after it.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Book with my court pack · Exton Sports Center" },
};

/** Refusals that a new pack would fix, so they also offer "Buy a … court pack" (§8.1). */
const BUY_FIXES: ReadonlySet<PackRefusalReason> = new Set(["no_pack", "wrong_sport", "expired", "used_up", "all_booked"]);

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-cond text-white mb-5" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
      {children}
    </h1>
  );
}

/** The summary box: "2 badminton courts, 6:00 PM–7:00 PM, Sun, Oct 25 · 2 credits · By card $90.00" —
 *  the time in the app form's own words, from the parked slot (review UI-5, copy.ts slotSummary). */
function SlotBox({ slot, sel }: { slot: QuoteSlot; sel: PackSelection }) {
  return (
    <div className="border border-[var(--legal-line)] bg-[var(--legal-surface)]" style={{ padding: "16px clamp(14px,4vw,18px)" }}>
      <p className="text-white text-[1rem] leading-snug">{slotSummary(slot, sel)}</p>
    </div>
  );
}

/**
 * The pack this booking would draw from (mock panel 3: "3 of 5 left", then "Book · use 1
 * credit"). The COUNT is as it stands now — the quote's `choice` carries it after this
 * booking. The two sentences are the platform's, written for the pack AFTER this booking
 * (choiceFor), and the clock that decides how they are put together — "valid until Dec 17
 * (…)" for 'started', the clock sentence alone otherwise — is `choice.clock`.
 *
 * A platform that sends no clock (integration, 2026-10-21): after a booking a pack's clock
 * is never 'not_started' (the booking itself is a live game, design §3) — it is 'started'
 * only if a game was already played, which the current cards say. So: 'started' when every
 * card that could be this pack says so, otherwise 'provisional'. The first cut matched one
 * card by its valid-until date and read any date as 'started'; a fresh pack's date moves
 * when it is first booked, so that printed "valid until Dec 24 (Your 60 days start at your
 * first game…)".
 */
function choiceNow(choice: PackChoice, packs: PackView[], credits: number): { left: number; clock: PackClock } {
  const left = Math.min(choice.creditsLeftAfter + credits, choice.creditsTotal);
  if (choice.clock) return { left, clock: choice.clock };
  const cards = packs.filter(
    (p) => p.name === choice.packName && p.creditsTotal === choice.creditsTotal && p.creditsLeft === left,
  );
  const started = cards.length > 0 && cards.every((p) => p.clock === "started");
  return { left, clock: started ? "started" : "provisional" };
}

function PackCard({ choice, now }: { choice: PackChoice; now: { left: number; clock: PackClock } }) {
  return (
    <div className="border border-[var(--color-ember)] bg-[var(--color-ember)]/10 mt-4" style={{ padding: "12px 14px" }}>
      <p className="text-cond text-white text-[1.1rem] uppercase tracking-wide">{choice.packName}</p>
      <PackBar left={now.left} total={choice.creditsTotal} />
      <p className="text-white/80 text-[0.92rem] leading-relaxed">
        {packLine({
          creditsLeft: now.left,
          creditsTotal: choice.creditsTotal,
          clock: now.clock,
          validUntilText: choice.validUntilText,
          clockText: choice.clockText,
        })}
      </p>
    </div>
  );
}

/** "Booking as a•••@example.com on this phone · Not you?" — Not you? reloads THIS page signed out. */
function BookingAs({ email }: { email: string }) {
  return (
    <p className="text-white/70 text-[0.95rem] leading-relaxed mb-5">
      {bookingAs(email)} · <NotYou variant="pack" next="/my-bookings/pack" />
    </p>
  );
}

function Problem({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <>
      <p className="text-white/80 text-[1rem] leading-relaxed" role="alert">
        <PhoneText text={text} phone={FALLBACK_PHONE} />
      </p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </>
  );
}

export default async function PackPage() {
  const sel = await readPackSelection();
  if (!sel) {
    return (
      <>
        <Heading>{PACK_COPY.title}</Heading>
        <p className="text-white/80 text-[1rem] leading-relaxed">{PACK_COPY.pickFirst}</p>
        <a href={bookWithPackUrl()} className={`${BTN_PRIMARY} inline-block mt-6`}>
          {PACK_COPY.bookACourt}
        </a>
      </>
    );
  }

  const token = await readDeviceToken();
  const ip = clientIpOf(await headers());
  const [r, sale] = await Promise.all([packQuote(sel, ip, token), PACKS_LIVE ? packOffers(ip) : null]);
  // sel.sportId is a checked uuid (session.ts); the buy page reads ?sport= to pre-select it.
  // null unless that sport has a pack on sale right now (see the header).
  const buyUrl = PACKS_LIVE ? packBuyUrl(sel.sportId, sale?.kind === "ok" ? sale.view.offers : null) : null;

  if (r.kind !== "ok") {
    return (
      <>
        <Heading>{PACK_COPY.title}</Heading>
        <Problem text={r.kind === "off" ? bookMessage({ status: "off" }) : PACK_COPY.unreachable}>
          <a href={bookByCardUrl(sel)} className={BTN_PRIMARY}>
            {PACK_SIGNIN.payByCardInstead}
          </a>
        </Problem>
      </>
    );
  }

  const view = r.view;
  if (view.slotProblem || !view.slot) {
    return (
      <>
        <Heading>{PACK_COPY.title}</Heading>
        <Problem text={view.slotProblem?.message ?? PACK_COPY.unreachable}>
          <a href={bookWithPackUrl(sel.sportId, sel)} className={BTN_PRIMARY}>
            {PACK_COPY.pickAnother}
          </a>
        </Problem>
      </>
    );
  }
  const slot = view.slot;

  if (view.session === "none") {
    return (
      <>
        <Heading>{PACK_COPY.title}</Heading>
        <SlotBox slot={slot} sel={sel} />
        <div className="mt-8">
          <RequestPanel variant="pack" next="/my-bookings/pack" buyHref={buyUrl} />
        </div>
        <div className="mt-8">
          <a href={view.cardUrl} className={BTN_TEXT}>
            {PACK_SIGNIN.payByCardInstead}
          </a>
        </div>
      </>
    );
  }

  // 'match' from here on: the inbox is proved, so the page may say what the pack can do.
  const email = view.email ?? "";
  const ctx: RefusalContext = {
    sport: slot.sport,
    unit: slot.unit,
    need: slot.credits,
    email: view.email,
    phone: FALLBACK_PHONE,
    date: sel.date,
    today: clubDate(new Date()),
  };

  if (view.session === "match" && view.choice) {
    const saves = savesLine(slot);
    const now = choiceNow(view.choice, view.packs, slot.credits);
    // Review UI-6: a game under 24 real hours away can't be cancelled online, so the fine
    // print and the booked screen say "call" instead of promising the credit back.
    const insideCutoff = startsWithinHours(sel.date, sel.startTime, DEFAULT_CUTOFF_HOURS);
    return (
      <PackConfirm
        sel={sel}
        requestKey={mintRequestKey()}
        termsVersion={view.terms.version}
        termsUrl={view.terms.url}
        credits={slot.credits}
        email={email}
        sport={slot.sport}
        cardUrl={view.cardUrl}
        cardTotalCents={slot.cardTotalCents}
        pickAnotherUrl={bookWithPackUrl(sel.sportId, sel)}
        bookAgainUrl={bookWithPackUrl(sel.sportId)}
        buyUrl={buyUrl}
        refusalCtx={ctx}
        phone={FALLBACK_PHONE}
        insideCutoff={insideCutoff}
        clock={now.clock}
        packCard={
          <>
            <PackCard choice={view.choice} now={now} />
            {saves && (
              <p
                className="text-white/80 text-[0.92rem] leading-relaxed mt-3 border-l-2 border-[var(--color-green)] bg-[var(--color-green)]/10"
                style={{ padding: "7px 10px" }}
              >
                {saves}
              </p>
            )}
          </>
        }
      >
        <Heading>{PACK_COPY.title}</Heading>
        <BookingAs email={email} />
        <SlotBox slot={slot} sel={sel} />
      </PackConfirm>
    );
  }

  // 'match' with a refusal (toQuote guarantees one of choice / refusal when there is a slot).
  const refusal = view.refusal;
  return (
    <>
      <Heading>{PACK_COPY.title}</Heading>
      <BookingAs email={email} />
      <SlotBox slot={slot} sel={sel} />
      <div className="mt-6">
        <Problem text={refusal ? refusalText(refusal, ctx) : PACK_COPY.unreachable}>
          <a href={view.cardUrl} className={BTN_PRIMARY}>
            {payByCard(slot.cardTotalCents)}
          </a>
          {buyUrl && refusal && BUY_FIXES.has(refusal.reason) && (
            <Link href={buyUrl} className={BTN_SECONDARY}>
              {buySportPack(slot.sport)}
            </Link>
          )}
        </Problem>
      </div>
    </>
  );
}
