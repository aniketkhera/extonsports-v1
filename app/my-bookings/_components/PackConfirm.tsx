"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { PackSelection } from "@/lib/my-bookings/session";
import {
  PACK_REFUSALS, fromSiteBook, isBookSuccess, type BookStatus, type BookView, type PackClock, type PackRefusalReason,
  type PackRefusalView,
} from "@/lib/my-bookings/view";
import {
  COPY, PACK_COPY, PACK_SIGNIN, bookButton, bookMessage, bookedLead, bookedPaidWith, buySportPack, cancelThisNote, ofLeft,
  packFinePrint, packInsideCutoff, payByCard, refusalText, type RefusalContext,
} from "@/lib/my-bookings/copy";
import { BTN_PRIMARY, BTN_SECONDARY, ERROR, INPUT, LABEL, postJson } from "./ui";
import PhoneText from "./PhoneText";

/* The terms box, the phone, "Book · use N credits", and what happens after — on
   /my-bookings/pack once the device's session matches and a pack can pay, 2026-10-21
   (owner, 2026-10-20: "let's go with the implentation.."; orangish-app docs/court-packs.md
   §8.1, mock panels 3 and 4).

   The page renders everything above the form on the server and hands it in: `children`
   (the heading, "Booking as …", the slot) and `packCard` (the pack as quoted, and the
   savings). Once the booking lands, this swaps all of it for the booked screen (panel 4),
   so "You're booked" is the page's only headline, as in the mock.

   THIS COMPONENT DECIDES NOTHING. It posts to this site's own /api/my-bookings/pack/book,
   which spends the credit through the platform, and reads the answer through the site's
   allow-list (fromSiteBook). Only 'booked' / 'already' are shown as booked. A doubt
   ('unknown': a timeout after the platform may have committed) sends the guest to My
   bookings, where a booking that landed is listed; it never says "nothing happened".

   The request key came from the server render: pressing again after "try again" sends the
   same key, so the platform books once. Answers that change the ground under the form —
   the slot taken, the slot or terms changed, signed out — hide Book and offer the one way
   on: pick another time, or reload (a fresh quote and a fresh key).

   The selection goes back in the body only as an ECHO: the route books the parked slot,
   and refuses ('changed') if it is no longer the one this page showed.

   Review fixes, 2026-10-21:
   • UI-6 — `insideCutoff` (the page works it out from the parked slot and the club's clock):
     a game under 24 hours away can't be cancelled online, so the fine print and the booked
     screen say "call …" instead of promising the credit back.
   • UI-7 — `clock` is the quote's clock for this pack after this booking (choiceFor). The
     booked screen states a firm "Valid until" only for a STARTED clock (the book answer's
     own clock wins when the platform sends one); otherwise the clock sentence.
   • UI-8 — "try again" and "slow down" say "or pay by card", so they show the card link. */

type Phase = "idle" | "pending" | "booked";

/** Refusals that a new pack would fix (§8.1): they also offer "Buy a … 5-pack". */
const BUY_FIXES: readonly PackRefusalReason[] = ["no_pack", "wrong_sport", "expired", "used_up", "all_booked"];
/** The slot itself is gone or not bookable online: Book cannot succeed; pick another time. */
const PICK_ANOTHER = ["taken", "started", "no_rate", "club_closed_hours"] as const;
/** The page is out of date: a reload re-quotes and mints a new key. */
const RELOAD = ["changed", "credits_changed", "terms_changed", "signed_out"] as const;
/** Nothing was booked and the slot still stands: paying by card for it is safe (review UI-8). */
const CARD_TOO = ["try_again", "slow_down", "off"] as const;

const TERMS_WORDS = "terms, disclosure and waiver";

function isOneOf<T extends string>(list: readonly T[], v: string): v is T {
  return (list as readonly string[]).includes(v);
}

/**
 * Whether the answer to Book shows "Pay by card $X": a pack refusal, the switch off, or a
 * "try again" / "slow down" whose sentence offers the card (review UI-8). NEVER after a
 * doubt ('unknown'): the booking may have landed, and paying again would book it twice.
 */
export function showsPayByCard(status: BookStatus | null): boolean {
  return status !== null && (isOneOf(PACK_REFUSALS, status) || isOneOf(CARD_TOO, status));
}

/** A pack refusal with no details (fromSiteBook keeps only details that check out). */
function bareRefusal(reason: PackRefusalReason): PackRefusalView {
  return { reason, need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null };
}

/** The pack's credits as a bar: one block per credit, the used ones pale (mock panels 3–4). */
export function PackBar({ left, total }: { left: number; total: number }) {
  const n = Math.max(0, Math.min(total, 20));
  return (
    <div className="flex gap-1.5 my-2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`block h-2 w-7 ${i < n - left ? "bg-[var(--color-ember)]/30" : "bg-[var(--color-ember)]"}`}
        />
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-[var(--legal-line)]">
      <dt className="text-white/55 text-[0.95rem]">{label}</dt>
      <dd className="text-white text-[0.95rem] text-right">{children}</dd>
    </div>
  );
}

/** The booked screen (mock panel 4). Exported for its tests; only PackConfirm renders it. */
export function Booked({
  v,
  email,
  bookAgainUrl,
  clock,
  insideCutoff,
  phone,
}: {
  v: BookView;
  email: string;
  bookAgainUrl: string;
  clock: PackClock | null; // the quote's, for the pack after this booking
  insideCutoff: boolean;
  phone: string;
}) {
  const b = v.booking;
  const p = v.pack;
  // The cancel sheet for THIS series opens from ?cancel= on My bookings (§8.3), the same
  // tokenless link the confirmation email carries. Without the series id, the list itself.
  const cancelHref = b ? `/my-bookings?cancel=${encodeURIComponent(b.seriesId)}` : "/my-bookings";
  // A firm date only for a started clock (review UI-7): a provisional one moves if this game
  // goes, which the pack page had just said. The answer's own clock first, then the quote's.
  const started = (p?.clock ?? clock) === "started";
  const validUntil = started ? (p?.validUntilText ?? null) : null;
  const clockNote = p && !validUntil ? p.clockText : null;
  const notes = [b?.lightsNote ?? null, clockNote].filter((n): n is string => !!n);
  const credits = b?.credits ?? 1;
  return (
    <div role="status" aria-live="polite">
      <div className="w-11 h-11 rounded-full bg-[var(--color-ember)] flex items-center justify-center" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5l4 4 8-9" stroke="#000" strokeWidth="2.6" strokeLinecap="square" />
        </svg>
      </div>
      <h1 className="text-cond text-white mt-4 mb-3" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
        {PACK_COPY.bookedTitle}
      </h1>
      <p className="text-white/70 text-[0.98rem] leading-relaxed">{bookedLead(email || null)}</p>

      <dl className="mt-5 border-t border-[var(--legal-line)]">
        {b && <Row label={b.courts.length === 1 ? PACK_COPY.rowCourt : PACK_COPY.rowCourts}>{b.courts.join(", ")}</Row>}
        {b && <Row label={PACK_COPY.rowWhen}>{b.whenText}</Row>}
        {b && p && <Row label={PACK_COPY.rowPaidWith}>{bookedPaidWith(p.name, b.credits)}</Row>}
        {p && (
          <Row label={PACK_COPY.rowCreditsLeft}>
            <b>{ofLeft(p.creditsLeft, p.creditsTotal)}</b>
          </Row>
        )}
        {validUntil && <Row label={PACK_COPY.rowValidUntil}>{validUntil}</Row>}
      </dl>

      {/* Only when there is something to say in it (review UI-7): the lights, or the clock. */}
      {notes.length > 0 && (
        <div
          data-booked-note
          className="border border-[var(--color-ember)] bg-[var(--color-ember)]/10 mt-5"
          style={{ padding: "12px 14px" }}
        >
          {p && <PackBar left={p.creditsLeft} total={p.creditsTotal} />}
          {notes.map((n) => (
            <p key={n} className="text-white/80 text-[0.92rem] leading-relaxed">
              {n}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6">
        <a href={bookAgainUrl} className={`${BTN_SECONDARY} inline-block`}>
          {PACK_COPY.bookAgain}
        </a>
      </div>
      {insideCutoff ? (
        <p className="text-white/60 text-[0.9rem] leading-relaxed mt-4">
          <PhoneText text={packInsideCutoff(phone, credits)} phone={phone} />
        </p>
      ) : (
        <p className="text-white/60 text-[0.9rem] leading-relaxed mt-4">
          <Link href={cancelHref} className="underline underline-offset-4 text-[var(--ember-ink)]">
            {PACK_COPY.cancelThis}
          </Link>{" "}
          {cancelThisNote(credits)}
        </p>
      )}
    </div>
  );
}

export default function PackConfirm({
  children,
  packCard,
  sel,
  requestKey,
  termsVersion,
  termsUrl,
  credits,
  email,
  sport,
  cardUrl,
  cardTotalCents,
  pickAnotherUrl,
  bookAgainUrl,
  buyUrl,
  refusalCtx,
  phone,
  insideCutoff,
  clock,
}: {
  children: ReactNode; // the heading, "Booking as …" and the slot — true whatever Book answers
  packCard: ReactNode; // the pack as quoted, and the savings — hidden once Book says the pack can't pay
  sel: PackSelection;
  requestKey: string;
  termsVersion: string;
  termsUrl: string; // the platform's booking terms and waiver, kept by view.ts only on its own origin
  credits: number;
  email: string; // masked
  sport: string;
  cardUrl: string;
  cardTotalCents: number;
  pickAnotherUrl: string;
  bookAgainUrl: string;
  buyUrl: string | null; // null while PACKS_LIVE is off — the page decides
  refusalCtx: RefusalContext;
  phone: string; // the club's
  insideCutoff: boolean; // the slot starts within the self-cancel cutoff (review UI-6)
  clock: PackClock | null; // the quote's clock for the pack after this booking (review UI-7)
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<BookView | null>(null);
  const [agree, setAgree] = useState(false);
  const [mobile, setMobile] = useState("");

  async function book() {
    if (phase !== "idle") return;
    // The route refuses an unticked box too; saying so here saves a round trip.
    if (!agree) {
      setResult({ status: "terms_required" });
      return;
    }
    setResult(null);
    setPhase("pending");
    const r = await postJson("/api/my-bookings/pack/book", {
      sel,
      requestKey,
      agreeTerms: true,
      termsVersion,
      expectCredits: credits,
      phone: mobile.trim() || undefined,
    });
    const v = fromSiteBook(r.status, r.json);
    setResult(v);
    if (isBookSuccess(v)) {
      setPhase("booked");
      window.scrollTo({ top: 0 });
    } else {
      setPhase("idle");
    }
  }

  if (phase === "booked" && result) {
    return (
      <Booked
        v={result}
        email={email}
        bookAgainUrl={bookAgainUrl}
        clock={clock}
        insideCutoff={insideCutoff}
        phone={phone}
      />
    );
  }

  const status = result?.status ?? null;
  const refused = status !== null && isOneOf(PACK_REFUSALS, status);
  const pickAnother = status !== null && isOneOf(PICK_ANOTHER, status);
  const reload = status !== null && isOneOf(RELOAD, status);
  const unknown = status === "unknown";
  const off = status === "off";
  // Book stays only for answers that left the ground as it was: retry, tick, fix the phone.
  const canBook = !refused && !pickAnother && !reload && !unknown && !off;

  let message: string | null = null;
  if (result && refused) {
    message = refusalText(result.refusal ?? bareRefusal(result.status as PackRefusalReason), refusalCtx);
  } else if (result) {
    message = bookMessage(result, phone);
  }
  const quiet = status === "terms_required" || status === "bad_phone";

  const at = PACK_COPY.termsLabel.indexOf(TERMS_WORDS);
  const termsLink = (
    <a href={termsUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-[var(--ember-ink)]">
      {TERMS_WORDS}
    </a>
  );

  return (
    <div>
      {children}
      {/* A pack refusal at Book means the pack changed since the quote (another phone took
          the last credit): the quoted card would contradict the sentence below it. */}
      {!refused && packCard}

      {canBook && (
        <div className="mt-6">
          <label className="flex items-start gap-3 text-white/80 text-[0.95rem] leading-snug cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                if (status === "terms_required") setResult(null);
              }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-ember)]"
            />
            <span>
              {at >= 0 ? (
                <>
                  {PACK_COPY.termsLabel.slice(0, at)}
                  {termsLink}
                  {PACK_COPY.termsLabel.slice(at + TERMS_WORDS.length)}
                </>
              ) : (
                <>
                  {PACK_COPY.termsLabel} ({termsLink})
                </>
              )}
            </span>
          </label>

          <div className="mt-5">
            <label htmlFor="pk-phone" className={LABEL}>
              {PACK_COPY.phoneLabel}
            </label>
            <input
              id="pk-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={32}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className={`${INPUT} max-w-[260px]`}
            />
          </div>
        </div>
      )}

      {message && (
        <p className={quiet ? ERROR : "text-white/80 text-[1rem] leading-relaxed mt-5"} role="alert">
          <PhoneText text={message} phone={phone} />
        </p>
      )}

      {canBook && (
        <div className="mt-6">
          <button type="button" className={`${BTN_PRIMARY} w-full sm:w-auto`} disabled={phase === "pending"} onClick={book}>
            {phase === "pending" ? PACK_COPY.booking : bookButton(credits)}
          </button>
          <p className="text-white/60 text-[0.88rem] leading-relaxed mt-3">
            {insideCutoff ? (
              <PhoneText text={packInsideCutoff(phone, credits)} phone={phone} />
            ) : (
              packFinePrint(credits)
            )}
          </p>
        </div>
      )}

      {showsPayByCard(status) && (
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={cardUrl} className={BTN_PRIMARY}>
            {payByCard(cardTotalCents)}
          </a>
          {buyUrl && refused && isOneOf(BUY_FIXES, status ?? "") && (
            <Link href={buyUrl} className={BTN_SECONDARY}>
              {buySportPack(sport)}
            </Link>
          )}
        </div>
      )}

      {pickAnother && (
        <div className="mt-6">
          <a href={pickAnotherUrl} className={`${BTN_PRIMARY} inline-block`}>
            {PACK_COPY.pickAnother}
          </a>
        </div>
      )}

      {reload && (
        <div className="mt-6">
          <button type="button" className={BTN_PRIMARY} onClick={() => window.location.reload()}>
            {status === "signed_out" ? PACK_SIGNIN.sendCode : COPY.reload}
          </button>
        </div>
      )}

      {/* No "pay by card" after a doubt: the booking may have landed, and paying for the
          same slot again would book it twice. My bookings lists it if it did. */}
      {unknown && (
        <div className="mt-6">
          <Link href="/my-bookings" className={`${BTN_SECONDARY} inline-block`}>
            {COPY.title}
          </Link>
        </div>
      )}
    </div>
  );
}
