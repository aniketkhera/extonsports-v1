"use client";

import { useState } from "react";
import type { OfferView } from "@/lib/my-bookings/view";
import {
  COPY, FALLBACK_PHONE, PACK_BUY_COPY, bookingAndChanges, checkoutMessage, money, packSportsLine, payButton, perHourLine,
  sizeTile, sportTilePrice, whatYouGet,
} from "@/lib/my-bookings/copy";
import { isEmailShape } from "@/lib/my-bookings/guard";
import { PACK_TERMS_PATH, bookWithPackUrl } from "@/lib/booking";
import { BTN_PRIMARY, ERROR, INPUT, LABEL, postJson } from "../my-bookings/_components/ui";
import PhoneText from "../my-bookings/_components/PhoneText";

/* The court pack buy form on /court-packs, 2026-10-21 (orangish-app docs/court-packs.md
   §8.2; the look is buy.html panels 1 and 2, with the copy the design corrected: no
   "proposed" tags, the PACK terms rather than the booking waiver).

   TWO SIZES, 2026-10-22 (Aniket): a 5-pack and a 10-pack per sport, badminton and cricket
   only. An offer is a sport AND a size, so the choice is two rows — Sport, then Pack — and
   the state is the pair {sportId, credits}; one row of tiles keyed by sport alone lit both
   badminton tiles together and could never pick the 10-pack. Everything under the rows is
   the CHOSEN offer's own: its price, per-hour, credits, and its own window (60 days for a
   5-pack, 120 for a 10-pack) — never a page-wide number.

   BOOKING HORIZON, 2026-10-22. Aniket: "let's make the pack bookings upto 60 days for 5 pack
   and 120 days for 10 pack.. cancel and re-booking is fine." A pack books as far ahead as its
   own window (card bookings stay at the club's 30 days), so each size tile says how far ahead
   it books, and a "Booking and changes" box under "What you get" says how booking and
   changing work — both from the offers' own windows (copy.ts sizeTile, bookingAndChanges),
   the box from the CHOSEN sport's sizes, so it is true of the sport on screen. It has no
   "change" button to describe: a change is a cancel and a new booking.

   Sport → size → what you get → email → tick → Pay. Pay posts to THIS site's
   /api/court-packs/checkout, which relays to the platform; the platform prices the pack
   from its own offer row and answers a Stripe Checkout URL, and the browser goes there. No
   price or amount from this form is trusted by anyone: the sport id, the size, the address
   and the tick are all it sends.

   ?sport= and ?credits= pre-pick (the app form's promo, Stripe's cancel_url). No ?sport=
   picks the first sport; a ?sport= the club sells no pack for (squash, since 2026-10-22)
   picks NOTHING and says which sports packs are for — quietly switching a squash player to
   badminton could sell them a pack they cannot use. A size that sport does not sell picks
   its smallest; changing sport keeps the size when the new sport sells it.

   The address stays in the form — not in the URL, not in storage — and the answer is the
   same whatever address is typed (owner, 2026-10-18: never reveal whether an email has
   an account or a pack). Every message below says nothing was charged, because nothing
   is until the guest pays on Stripe's page. */

type BuyError = Parameters<typeof checkoutMessage>[0];
const BUY_ERRORS: readonly BuyError[] = [
  "bad_email", "terms_required", "terms_changed", "bad_sport", "bad_size", "club_not_payable", "off", "slow_down", "try_again",
];

/**
 * The only place this page sends the browser: https on checkout.stripe.com exactly — no
 * other host, no port, no credentials. The route already checked it (platform.ts
 * packCheckout); this is the second look, in the browser, before navigating.
 */
export function stripeHref(v: unknown): string | null {
  if (typeof v !== "string" || v.length === 0 || v.length > 4096) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.hostname === "checkout.stripe.com" && !u.username && !u.password && !u.port
      ? u.href
      : null;
  } catch {
    return null;
  }
}

/** One sport's offers, smallest first (view.ts toOffers already sorts them so). */
function sizesOf(offers: OfferView[], sportId: string): OfferView[] {
  return offers.filter((o) => o.sportId === sportId);
}

/**
 * The size to show for a sport: the one asked for when that sport sells it, else the
 * sport's smallest. null for a sport with nothing on sale.
 */
export function pickSize(offers: OfferView[], sportId: string, credits: number | null): number | null {
  const sizes = sizesOf(offers, sportId);
  return (sizes.find((o) => o.credits === credits) ?? sizes[0])?.credits ?? null;
}

/** The pair the form starts on, from ?sport= and ?credits= (see the header). */
export function initialChoice(
  offers: OfferView[],
  sportId: string | null,
  credits: number | null,
): { sportId: string; credits: number | null } {
  const sport = sportId === null ? offers[0]?.sportId ?? "" : offers.some((o) => o.sportId === sportId) ? sportId : "";
  return { sportId: sport, credits: sport ? pickSize(offers, sport, credits) : null };
}

const ALREADY_LINK = "Book a court";

const TILE = "cursor-pointer border text-center py-3 px-2 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-ember)]";
const TILE_ON = "bg-[var(--color-ember)] border-[var(--color-ember)] text-black";
const TILE_OFF = "border-[var(--color-line-2)] text-white/80 hover:border-[var(--color-ember)]";
/** Up to three tiles a row, as before — two sports and two sizes each fit a phone. */
const cols = (n: number) => ({ gridTemplateColumns: `repeat(${Math.max(1, Math.min(n, 3))}, minmax(0, 1fr))` });

export default function BuyForm({
  offers,
  termsVersion,
  initialSportId,
  initialCredits = null,
  phone = FALLBACK_PHONE,
}: {
  offers: OfferView[];
  termsVersion: string;
  /** ?sport= — the app form's promo and Stripe's cancel_url bring the guest back with it. */
  initialSportId: string | null;
  /** ?credits= — the size, 2026-10-22 (Stripe's cancel_url carries it). */
  initialCredits?: number | null;
  phone?: string;
}) {
  const [choice, setChoice] = useState(() => initialChoice(offers, initialSportId, initialCredits));
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The platform answered terms_changed (2026-10-25, site review, low): the terms this page
  // loaded, and the termsVersion prop Pay sends, are out of date. A re-tick would send the
  // same old version and be refused again, for ever, so from here only a reload can go on —
  // it fetches the new terms and their version — as PackConfirm does for its RELOAD
  // answers. Pay gives way to Reload, the tick is cleared and cannot be given again here,
  // and pay() refuses to post (Enter in the email field still submits the form).
  const [termsStale, setTermsStale] = useState(false);

  // The sports in the platform's order, each once.
  const sports = offers.filter((o, i) => offers.findIndex((x) => x.sportId === o.sportId) === i);
  const sizes = choice.sportId ? sizesOf(offers, choice.sportId) : [];
  const offer = sizes.find((o) => o.credits === choice.credits) ?? null;
  // Arrived with a ?sport= that is not on sale (squash): nothing picked yet, and why.
  const notSold = initialSportId !== null && !offers.some((o) => o.sportId === initialSportId) && !choice.sportId;

  function pickSport(sportId: string) {
    setChoice((c) => ({ sportId, credits: pickSize(offers, sportId, c.credits) }));
  }

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || termsStale) return;
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    if (!offer) return setError(checkoutMessage(choice.sportId ? "bad_size" : "bad_sport", phone));
    if (!isEmailShape(email)) return setError(checkoutMessage("bad_email", phone));
    if (!agree) return setError(checkoutMessage("terms_required", phone));
    setBusy(true);
    const r = await postJson("/api/court-packs/checkout", {
      sportId: offer.sportId,
      credits: offer.credits,
      email,
      agreeTerms: true,
      termsVersion,
    });
    const j = (r.json ?? {}) as { url?: unknown; error?: unknown };
    const url = r.status === 200 ? stripeHref(j.url) : null;
    if (url) {
      // Stays "Opening payment…": the page is leaving for Stripe.
      window.location.assign(url);
      return;
    }
    setBusy(false);
    const known = BUY_ERRORS.find((x) => x === j.error);
    const why = r.status === 429 ? "slow_down" : (known ?? "try_again");
    if (why === "terms_changed") {
      setTermsStale(true);
      setAgree(false);
    }
    setError(checkoutMessage(why, phone));
  }

  const at = PACK_BUY_COPY.alreadyHave.indexOf(ALREADY_LINK);

  return (
    <form onSubmit={pay} noValidate>
      <fieldset>
        <legend className={LABEL}>{PACK_BUY_COPY.sportLabel}</legend>
        {notSold && (
          <p className="text-white/70 text-[0.92rem] leading-relaxed mb-2.5" role="status">
            {packSportsLine(sports.map((o) => o.sport))}
          </p>
        )}
        <div className="grid gap-2" style={cols(sports.length)}>
          {sports.map((s) => {
            const on = s.sportId === choice.sportId;
            return (
              <label key={s.sportId} className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}>
                <input
                  type="radio"
                  name="sport"
                  value={s.sportId}
                  checked={on}
                  onChange={() => pickSport(s.sportId)}
                  className="sr-only"
                />
                <span className="text-mono text-[0.72rem] tracking-[0.08em] uppercase">{s.sport}</span>
                <small className={`block text-[0.85rem] mt-0.5 ${on ? "" : "text-white/60"}`}>
                  {sportTilePrice(sizesOf(offers, s.sportId).map((o) => o.priceCents))}
                </small>
              </label>
            );
          })}
        </div>
      </fieldset>

      {sizes.length > 0 && (
        <fieldset className="mt-4">
          <legend className={LABEL}>{PACK_BUY_COPY.sizeLabel}</legend>
          <div className="grid gap-2" style={cols(sizes.length)}>
            {sizes.map((o) => {
              const on = o.credits === choice.credits;
              const [credits, price, perHour, ahead] = sizeTile(o);
              return (
                <label key={`${o.sportId}:${o.credits}`} className={`${TILE} ${on ? TILE_ON : TILE_OFF}`}>
                  <input
                    type="radio"
                    name="size"
                    value={String(o.credits)}
                    checked={on}
                    onChange={() => setChoice({ sportId: o.sportId, credits: o.credits })}
                    className="sr-only"
                  />
                  <span className="text-mono text-[0.72rem] tracking-[0.08em] uppercase">{credits}</span>
                  <small className={`block text-[0.85rem] mt-0.5 ${on ? "" : "text-white/80"}`}>{price}</small>
                  <small className={`block text-[0.78rem] ${on ? "" : "text-white/60"}`}>{perHour}</small>
                  <small className={`block text-[0.78rem] ${on ? "" : "text-white/60"}`}>{ahead}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {offer && (
        <>
          {/* Pack | per hour — buy.html's two-cell card. */}
          <div className="grid grid-cols-2 border border-[var(--color-line-2)] mt-5">
            <div className="p-3.5">
              <p className={LABEL}>{PACK_BUY_COPY.rowPack}</p>
              <p className="text-cond text-white leading-none" style={{ fontSize: "clamp(1.7rem,6vw,2.1rem)" }}>
                {money(offer.priceCents)}
              </p>
              <p className="text-white/60 text-[0.82rem] mt-1.5">{offer.name}</p>
            </div>
            <div className="p-3.5 border-l border-[var(--color-line-2)] flex items-center">
              <p className="text-[var(--color-ember)] text-[0.98rem] leading-snug font-semibold">{perHourLine(offer)}</p>
            </div>
          </div>

          <h2 className={`${LABEL} mt-6`}>{PACK_BUY_COPY.whatYouGet}</h2>
          <ul className="border-t border-[var(--legal-line)]">
            {whatYouGet(offer).map((line) => (
              <li key={line} className="flex gap-2.5 py-2.5 border-b border-[var(--legal-line)] text-white/80 text-[0.95rem] leading-snug">
                <span
                  aria-hidden="true"
                  className="shrink-0 rounded-full mt-[3px]"
                  style={{
                    width: "14px",
                    height: "14px",
                    background: "var(--color-ember)",
                    boxShadow: "inset 0 0 0 4px var(--legal-bg), 0 0 0 1px var(--color-ember)",
                  }}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* Booking and changes (2026-10-22) — the chosen sport's sizes, each its own window. */}
          <section aria-labelledby="buy-changes" className="mt-6 border border-[var(--legal-line)] bg-[var(--legal-surface)] p-4">
            <h2 id="buy-changes" className={LABEL}>
              {PACK_BUY_COPY.changesTitle}
            </h2>
            <ul className="mt-1 space-y-1.5">
              {bookingAndChanges(sizes, phone).map((line) => (
                <li key={line} className="text-white/80 text-[0.92rem] leading-snug">
                  <PhoneText text={line} phone={phone} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <label htmlFor="buy-email" className={`${LABEL} mt-7`}>
        {PACK_BUY_COPY.emailLabel}
      </label>
      <input
        id="buy-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="you@example.com"
        className={INPUT}
      />
      <p className="text-white/60 text-[0.85rem] leading-relaxed mt-2">{PACK_BUY_COPY.emailHelp}</p>

      <div className="mt-5 border border-[var(--legal-line)] bg-[var(--legal-surface)] p-4">
        {offer && (
          <>
            <p className="text-white/80 text-[0.95rem] font-semibold">{offer.name}</p>
            <p className="text-cond text-white leading-none mt-1 mb-4" style={{ fontSize: "clamp(1.9rem,7vw,2.4rem)" }}>
              {money(offer.priceCents)}
            </p>
          </>
        )}
        <label className="flex items-start gap-3 text-white/80 text-[0.95rem] leading-snug cursor-pointer">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={agree}
            disabled={termsStale}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-[2px] h-5 w-5 shrink-0 accent-[var(--color-ember)]"
          />
          <span>
            {PACK_BUY_COPY.termsBefore}{" "}
            {/* A new tab, so the typed address survives reading them. */}
            <a href={PACK_TERMS_PATH} target="_blank" rel="noopener noreferrer" className="text-[var(--color-ember)] underline underline-offset-2">
              {PACK_BUY_COPY.termsLink}
            </a>
          </span>
        </label>

        {error && (
          <p className={ERROR} role="alert">
            <PhoneText text={error} phone={phone} />
          </p>
        )}

        {termsStale ? (
          <button type="button" className={`${BTN_PRIMARY} w-full mt-4`} onClick={() => window.location.reload()}>
            {COPY.reload}
          </button>
        ) : (
          <button type="submit" className={`${BTN_PRIMARY} w-full mt-4`} disabled={busy || !offer}>
            {busy ? PACK_BUY_COPY.paying : offer ? payButton(offer.priceCents) : PACK_BUY_COPY.choose}
          </button>
        )}
        <p className="text-white/60 text-[0.82rem] leading-relaxed mt-3">{PACK_BUY_COPY.finePrint}</p>
      </div>

      {/* "Book a court" goes to the app's booking form in pack mode — it is the platform's
          form that shows the "My court pack" switch — in a new tab, like every booking link
          on the public site. */}
      <p className="text-white/60 text-[0.88rem] leading-relaxed mt-5">
        {at < 0 ? (
          PACK_BUY_COPY.alreadyHave
        ) : (
          <>
            {PACK_BUY_COPY.alreadyHave.slice(0, at)}
            <a href={bookWithPackUrl(offer?.sportId)} target="_blank" rel="noreferrer" className="text-[var(--color-ember)] font-semibold">
              {ALREADY_LINK}
            </a>
            {PACK_BUY_COPY.alreadyHave.slice(at + ALREADY_LINK.length)}
          </>
        )}
      </p>
    </form>
  );
}
