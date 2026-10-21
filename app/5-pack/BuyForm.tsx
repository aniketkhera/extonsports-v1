"use client";

import { useState } from "react";
import type { OfferView } from "@/lib/my-bookings/view";
import {
  FALLBACK_PHONE, PACK_BUY_COPY, checkoutMessage, money, payButton, perHourLine, whatYouGet,
} from "@/lib/my-bookings/copy";
import { isEmailShape } from "@/lib/my-bookings/guard";
import { PACK_TERMS_PATH, bookWithPackUrl } from "@/lib/booking";
import { BTN_PRIMARY, ERROR, INPUT, LABEL, postJson } from "../my-bookings/_components/ui";
import PhoneText from "../my-bookings/_components/PhoneText";

/* The 5-pack buy form on /5-pack, 2026-10-21 (orangish-app docs/court-packs.md §8.2; the
   look is buy.html panels 1 and 2, with the copy the design corrected: 60 days, no
   "proposed" tags, the PACK terms rather than the booking waiver).

   Sport → what you get → email → tick → Pay. Pay posts to THIS site's
   /api/5-pack/checkout, which relays to the platform; the platform prices the pack from
   its own offer row and answers a Stripe Checkout URL, and the browser goes there. No
   price, pack or amount from this form is trusted by anyone: the sport id, the address
   and the tick are all it sends.

   The address stays in the form — not in the URL, not in storage — and the answer is the
   same whatever address is typed (owner, 2026-10-18: never reveal whether an email has
   an account or a pack). Every message below says nothing was charged, because nothing
   is until the guest pays on Stripe's page. */

type BuyError = Parameters<typeof checkoutMessage>[0];
const BUY_ERRORS: readonly BuyError[] = [
  "bad_email", "terms_required", "terms_changed", "bad_sport", "club_not_payable", "off", "slow_down", "try_again",
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

const ALREADY_LINK = "Book a court";

export default function BuyForm({
  offers,
  termsVersion,
  windowDays,
  unusedMonths,
  initialSportId,
  phone = FALLBACK_PHONE,
}: {
  offers: OfferView[];
  termsVersion: string;
  windowDays: number;
  unusedMonths: number;
  /** ?sport= — the app form's promo and Stripe's cancel_url bring the guest back with it. */
  initialSportId: string | null;
  phone?: string;
}) {
  const [sportId, setSportId] = useState(
    () => offers.find((o) => o.sportId === initialSportId)?.sportId ?? offers[0]?.sportId ?? "",
  );
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const offer = offers.find((o) => o.sportId === sportId) ?? null;

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    if (!offer) return setError(checkoutMessage("bad_sport", phone));
    if (!isEmailShape(email)) return setError(checkoutMessage("bad_email", phone));
    if (!agree) return setError(checkoutMessage("terms_required", phone));
    setBusy(true);
    const r = await postJson("/api/5-pack/checkout", {
      sportId: offer.sportId,
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
    setError(checkoutMessage(r.status === 429 ? "slow_down" : (known ?? "try_again"), phone));
  }

  const at = PACK_BUY_COPY.alreadyHave.indexOf(ALREADY_LINK);

  return (
    <form onSubmit={pay} noValidate>
      <fieldset>
        <legend className={LABEL}>{PACK_BUY_COPY.sportLabel}</legend>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(offers.length, 3)}, minmax(0, 1fr))` }}>
          {offers.map((o) => {
            const on = o.sportId === sportId;
            return (
              <label
                key={o.sportId}
                className={`cursor-pointer border text-center py-3 px-2 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-ember)] ${
                  on
                    ? "bg-[var(--color-ember)] border-[var(--color-ember)] text-black"
                    : "border-[var(--color-line-2)] text-white/80 hover:border-[var(--color-ember)]"
                }`}
              >
                <input
                  type="radio"
                  name="sport"
                  value={o.sportId}
                  checked={on}
                  onChange={() => setSportId(o.sportId)}
                  className="sr-only"
                />
                <span className="text-mono text-[0.72rem] tracking-[0.08em] uppercase">{o.sport}</span>
                <small className={`block text-[0.85rem] mt-0.5 ${on ? "" : "text-white/60"}`}>{money(o.priceCents)}</small>
              </label>
            );
          })}
        </div>
      </fieldset>

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
            {whatYouGet(offer, windowDays, unusedMonths).map((line) => (
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

        <button type="submit" className={`${BTN_PRIMARY} w-full mt-4`} disabled={busy || !offer}>
          {busy ? PACK_BUY_COPY.paying : offer ? payButton(offer.priceCents) : PACK_BUY_COPY.paying}
        </button>
        <p className="text-white/60 text-[0.82rem] leading-relaxed mt-3">{PACK_BUY_COPY.finePrint}</p>
      </div>

      {/* "Book a court" goes to the app's booking form in pack mode — it is the platform's
          form that shows the "My 5-pack" switch — in a new tab, like every booking link on
          the public site. */}
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
