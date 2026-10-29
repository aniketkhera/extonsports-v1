"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  fromSiteCouponQuote, type CouponAnswer, type CouponQuoteView, type OfferView,
} from "@/lib/my-bookings/view";
import {
  COPY, FALLBACK_PHONE, PACK_BUY_COPY, bookingAndChanges, checkoutMessage, couponApplied, couponAppliedNotice,
  couponMessage, money,
  packSportsLine, payButton, perHourLine, sizeTile, sportTilePrice, whatYouGet, youSave,
} from "@/lib/my-bookings/copy";
import { couponCoversAny, couponTyped, normaliseCouponCode, pricedOffer } from "@/lib/my-bookings/coupon";
import { isEmailShape } from "@/lib/my-bookings/guard";
import { PACK_TERMS_PATH, bookWithPackUrl } from "@/lib/booking";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT, ERROR, INPUT, LABEL, postJson } from "../my-bookings/_components/ui";
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
   is until the guest pays on Stripe's page.

   A COUPON CODE, 2026-10-29. Aniket: "on this, let's add a textbox that accepts a COUPON
   CODE", then "change the coupon code to DIWALI2026 - and change the expiration date to Sun
   Nov 8th midnight.", then "make the discount 5% pls..". An optional field under the email,
   with Apply. Apply asks THIS site's /api/court-packs/quote, which relays to the platform; the
   platform answers what every pack costs under the code, and from then on every price on the
   form is that answer's — each size tile's (the list price struck through), the Pack | per
   hour card's, the Pay box's (with "You save $17.50"), and Pay's own "Pay $332.50" — and
   changing sport or size reads the same answer again, with no second call. Pay sends the
   CODE beside the sport and size, never a price; the platform checks the code again and
   charges its own row. A size the answer does not price shows its list price, and Pay then
   sends no code for it (coupon.ts couponPriceFor), so the button always reads what Stripe will.
   ?code= (Stripe's cancel_url brings it back) fills the field and applies it once on load.
   Every refusal of a code is one sentence — "That code isn't valid or has expired." — and the
   platform's refusal at Pay drops the applied coupon, so the prices go back to the list
   before the guest presses Pay again. Pay with a code typed but not applied applies it
   instead of paying (never the list price for a code the guest thinks they used), once per
   code: when that code has failed, the next Pay buys at the price the button shows — so the
   form still sells with the quote endpoint unreachable. Nothing about a coupon is written in
   this file.

   KEYBOARD AND SCREEN READERS, 2026-10-29 (site review, minor). Applying swaps the field and
   Apply for the applied code and Remove, and Remove swaps them back, so the element that had
   focus is gone and focus fell to <body>; and the applied block was itself the only
   role="status", mounted already holding its sentence, which most screen readers do not
   announce (a live region must exist before its content changes). So: ONE live region,
   mounted from the first render and empty, says "Coupon applied…" / "Coupon removed…"; focus
   moves to Remove after an Apply from the field, and back to the field after Remove or a
   refused Apply; after an Apply that Pay started it goes back to Pay only if it was lost
   (Pay is disabled while the code is checked); after the ?code= on load it is not moved at
   all. The field names the refusal line (aria-describedby) and is aria-invalid while that
   line is the refusal sentence, and the "Coupon code" heading labels the applied block when
   there is no field for it to label. */

type BuyError = Parameters<typeof checkoutMessage>[0];
const BUY_ERRORS: readonly BuyError[] = [
  "bad_email", "terms_required", "terms_changed", "bad_sport", "bad_size", "club_not_payable", "coupon_invalid", "off",
  "slow_down", "try_again",
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
/* The struck-through list price, 2026-10-29. Legible in both themes: off a picked tile it is
   text-white/60, a step globals.css remaps under [data-theme="light"] (ui.ts's note — /85 is
   not one); on the picked tile it is the tile's own black, dimmed by opacity, which reads the
   same on the ember ground in either theme. */
const STRUCK = "line-through decoration-1";
/** Up to three tiles a row, as before — two sports and two sizes each fit a phone. */
const cols = (n: number) => ({ gridTemplateColumns: `repeat(${Math.max(1, Math.min(n, 3))}, minmax(0, 1fr))` });

/** Ask THIS site's quote route about a code already in the coupon shape. Never throws. */
async function quoteCoupon(code: string): Promise<CouponAnswer> {
  const r = await postJson("/api/court-packs/quote", { code });
  return fromSiteCouponQuote(r.status, r.json, code);
}

export default function BuyForm({
  offers,
  termsVersion,
  initialSportId,
  initialCredits = null,
  initialCode = null,
  phone = FALLBACK_PHONE,
}: {
  offers: OfferView[];
  termsVersion: string;
  /** ?sport= — the app form's promo and Stripe's cancel_url bring the guest back with it. */
  initialSportId: string | null;
  /** ?credits= — the size, 2026-10-22 (Stripe's cancel_url carries it). */
  initialCredits?: number | null;
  /** ?code= — a coupon code, 2026-10-29: upper-cased and the coupon shape already
   *  (coupon.ts couponFromQuery), or null. Pre-fills the field and is applied once on load. */
  initialCode?: string | null;
  phone?: string;
}) {
  const [choice, setChoice] = useState(() => initialChoice(offers, initialSportId, initialCredits));
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The coupon (2026-10-29): what is typed, the platform's quote once Apply took the code, and
  // the line under the field when it did not. Busy from the first render when ?code= came in,
  // so the field reads "Checking…" and Pay waits until the answer is back — a guest who came
  // back from Stripe's page with their code must never be sold the list price by a fast tap.
  const [code, setCode] = useState(initialCode ?? "");
  const [coupon, setCoupon] = useState<CouponQuoteView | null>(null);
  const [couponBusy, setCouponBusy] = useState(initialCode !== null);
  const [couponNote, setCouponNote] = useState("");
  // The code (as typed, trimmed, in capitals) whose last Apply did NOT apply — refused, or the
  // platform out of reach. Pay applies a typed code first (pay(), below); without this, a code
  // that failed once would bounce every Pay back to the same sentence and the guest could never
  // buy at the price on the button without knowing to empty the field. One try per code.
  const [tried, setTried] = useState("");
  const loadApplied = useRef(false);
  // What the live region says (see the header): empty at first, so its first sentence is a
  // CHANGE and is announced. Written only by an Apply, a Remove, or the checkout's refusal.
  const [couponLive, setCouponLive] = useState("");
  // Where focus goes after the next commit that mounts it. "pay" only if focus was lost.
  const focusNext = useRef<"input" | "remove" | "pay" | null>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);
  const couponRemoveRef = useRef<HTMLButtonElement>(null);
  const payRef = useRef<HTMLButtonElement>(null);
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
  // The chosen offer as it will be charged: the coupon's price and per-hour in place of its
  // own when the applied quote prices it, else itself (coupon.ts pricedOffer). `saving` is
  // null without a coupon for THIS offer — and then Pay sends no code.
  const { offer: shown, coupon: saving } = offer ? pricedOffer(offer, coupon) : { offer: null, coupon: null };

  function pickSport(sportId: string) {
    setChoice((c) => ({ sportId, credits: pickSize(offers, sportId, c.credits) }));
  }

  /** The quote's answer for `asked`, from Apply (the field's or Pay's) or from ?code= on load.
   *  One sentence for every refusal. `from` decides only where focus goes (see the header). */
  function settleCoupon(a: CouponAnswer, asked: string, from: "field" | "pay" | "load") {
    setCouponBusy(false);
    // A valid code that prices none of THESE offers (they changed since the page loaded)
    // would show "5% off" and take nothing off anything: a reload is what fixes it.
    if (a.ok && couponCoversAny(offers, a.view)) {
      setCoupon(a.view);
      setCode(a.view.code);
      setTried("");
      setCouponLive(couponAppliedNotice(a.view.code, a.view.percentOff));
      focusNext.current = from === "field" ? "remove" : from === "pay" ? "pay" : null;
      return;
    }
    setCoupon(null);
    setTried(asked);
    setCouponNote(couponMessage(a.ok ? "try_again" : a.error, phone));
    // The note is role="alert" and says why; the live region must not still say "applied".
    setCouponLive("");
    focusNext.current = from === "field" ? "input" : from === "pay" ? "pay" : null;
  }

  function applyCoupon(from: "field" | "pay") {
    if (couponBusy || busy) return;
    const n = normaliseCouponCode(code);
    if (n.kind === "none") return;
    setCouponNote("");
    if (n.kind === "bad") {
      // Not even the coupon shape: no call, and the same sentence as the platform's refusal.
      // `tried` is the field as it reads (trimmed), not upper-cased again: since 2026-10-29
      // the field upper-cases ASCII only (coupon.ts couponTyped), and a whole-string
      // toUpperCase here would make a refused 'DıWALı2026' match a corrected 'DIWALI2026', so
      // that Pay would buy at the list price instead of applying the code the guest fixed.
      setTried(code.trim());
      setCouponNote(couponMessage("coupon_invalid", phone));
      setCouponLive("");
      if (from === "field") focusNext.current = "input";
      return;
    }
    setCouponBusy(true);
    void quoteCoupon(n.code).then((a) => settleCoupon(a, n.code, from));
  }

  function removeCoupon() {
    if (busy) return;
    setCoupon(null);
    setCode("");
    setCouponNote("");
    setTried("");
    setCouponLive(PACK_BUY_COPY.couponRemoved);
    focusNext.current = "input";
  }

  // ?code= is applied ONCE, on load (the ref survives React's dev double-mount, so the
  // platform is asked once). An effect event, so the answer is read with the offers and phone
  // of the render it lands in, and the effect itself depends on the code alone. Focus is not
  // moved for it: the guest has not touched the form yet.
  const applyLoadCode = useEffectEvent((c: string) => {
    void quoteCoupon(c).then((a) => settleCoupon(a, c, "load"));
  });
  useEffect(() => {
    if (loadApplied.current || initialCode === null) return;
    loadApplied.current = true;
    applyLoadCode(initialCode);
  }, [initialCode]);

  // Focus after a swap (see the header). Runs after every commit, and waits for the commit
  // that mounts its target: Remove exists only once the coupon is in state, the field only
  // once it is not. "pay" is a return, never a grab: only when focus was lost to <body>
  // while Pay was disabled — Enter in the email field leaves the guest where they were.
  useEffect(() => {
    const want = focusNext.current;
    if (!want) return;
    const el = want === "remove" ? couponRemoveRef.current : want === "input" ? couponInputRef.current : payRef.current;
    if (!el) return;
    focusNext.current = null;
    const lost = !document.activeElement || document.activeElement === document.body;
    if (want !== "pay" || lost) el.focus();
  });

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || termsStale || couponBusy) return;
    setError("");
    // A code typed but never applied: apply it, and do not pay. The guest sees the coupon's
    // prices (or why it was refused) and presses Pay again — never charged the list price for
    // a code they thought they had used. A code that has already failed once (`tried`) is not
    // retried here: that Pay goes on at the price the button shows, with no code, the reason
    // in plain sight under the field. A blank field is no coupon, as before.
    const typed = code.trim();
    if (!coupon && typed !== "" && typed !== tried) return applyCoupon("pay");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    if (!offer) return setError(checkoutMessage(choice.sportId ? "bad_size" : "bad_sport", phone));
    if (!isEmailShape(email)) return setError(checkoutMessage("bad_email", phone));
    if (!agree) return setError(checkoutMessage("terms_required", phone));
    setBusy(true);
    // The CODE only while it is applied AND prices this offer — the price on the button is
    // then the price the platform charges. Never a price: the platform prices from its rows.
    const couponCode = coupon && saving ? coupon.code : null;
    const r = await postJson("/api/court-packs/checkout", {
      sportId: offer.sportId,
      credits: offer.credits,
      email,
      agreeTerms: true,
      termsVersion,
      ...(couponCode ? { couponCode } : {}),
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
    if (why === "coupon_invalid" && coupon) {
      // The code ended, or was switched off, after Apply: drop it, so every price on the form
      // is the list price again before the guest presses Pay once more. The field keeps the
      // code, so they can see which one was refused, and it counts as tried, so that next Pay
      // buys at the list price the button now shows instead of asking about it again.
      setCoupon(null);
      setCouponNote("");
      setTried(coupon.code);
      // The refusal is said by the Pay box's role="alert"; the live region stops saying "applied".
      setCouponLive("");
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
                  {/* "from $190.00" under a coupon: the sport's sizes as they will be charged. */}
                  {sportTilePrice(sizesOf(offers, s.sportId).map((o) => pricedOffer(o, coupon).offer.priceCents))}
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
              // Under a coupon the tile's price and per-hour are the coupon's, and the list
              // price sits before it, struck through (2026-10-29).
              const p = pricedOffer(o, coupon);
              const [credits, price, perHour, ahead] = sizeTile(p.offer);
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
                  <small className={`block text-[0.85rem] mt-0.5 ${on ? "" : "text-white/80"}`}>
                    {p.coupon && (
                      <>
                        <span className="sr-only">{PACK_BUY_COPY.wasPrice} </span>
                        <s className={`${STRUCK} ${on ? "opacity-70" : "text-white/60"}`}>{money(p.coupon.listPriceCents)}</s>{" "}
                      </>
                    )}
                    {price}
                  </small>
                  <small className={`block text-[0.78rem] ${on ? "" : "text-white/60"}`}>{perHour}</small>
                  <small className={`block text-[0.78rem] ${on ? "" : "text-white/60"}`}>{ahead}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {offer && shown && (
        <>
          {/* Pack | per hour — buy.html's two-cell card. Under a coupon (2026-10-29): the list
              price struck above the coupon price, and the coupon's per hour. */}
          <div className="grid grid-cols-2 border border-[var(--color-line-2)] mt-5">
            <div className="p-3.5">
              <p className={LABEL}>{PACK_BUY_COPY.rowPack}</p>
              {saving && (
                <p className="text-white/60 text-[0.9rem] leading-none mb-1">
                  <span className="sr-only">{PACK_BUY_COPY.wasPrice} </span>
                  <s className={STRUCK}>{money(saving.listPriceCents)}</s>
                </p>
              )}
              <p className="text-cond text-white leading-none" style={{ fontSize: "clamp(1.7rem,6vw,2.1rem)" }}>
                {money(shown.priceCents)}
              </p>
              <p className="text-white/60 text-[0.82rem] mt-1.5">{offer.name}</p>
            </div>
            <div className="p-3.5 border-l border-[var(--color-line-2)] flex items-center">
              <p className="text-[var(--color-ember)] text-[0.98rem] leading-snug font-semibold">{perHourLine(shown)}</p>
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

      {/* COUPON CODE, 2026-10-29 (Aniket: "let's add a textbox that accepts a COUPON CODE").
          After the email, before the terms tick. Typed in capitals; Apply (or Enter here —
          never Pay) asks the platform. Applied, the field gives way to the code and its
          percent with Remove. The line under it is the one refusal sentence, or try again.
          Applied, "Coupon code" is a heading that labels the applied block (a <label> with no
          field to point at labels nothing); the announcements are the live region's, below. */}
      {coupon ? (
        <p id="buy-coupon-label" className={`${LABEL} mt-6`}>
          {PACK_BUY_COPY.couponLabel}
        </p>
      ) : (
        <label id="buy-coupon-label" htmlFor="buy-coupon" className={`${LABEL} mt-6`}>
          {PACK_BUY_COPY.couponLabel}
        </label>
      )}
      {coupon ? (
        <div
          className="flex items-center justify-between gap-3 border border-[var(--color-ember)] bg-[var(--color-ink-2)] px-3.5 py-2.5"
          role="group"
          aria-labelledby="buy-coupon-label"
        >
          <span className="text-white text-[0.95rem] font-semibold">{couponApplied(coupon.code, coupon.percentOff)}</span>
          <button ref={couponRemoveRef} type="button" className={BTN_TEXT} onClick={removeCoupon} disabled={busy}>
            {PACK_BUY_COPY.couponRemove}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            ref={couponInputRef}
            id="buy-coupon"
            name="couponCode"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            placeholder={PACK_BUY_COPY.couponPlaceholder}
            value={code}
            // The line under the field is its description; invalid only while that line is
            // the refusal sentence (a network failure says nothing about the code itself).
            aria-describedby={couponNote ? "buy-coupon-note" : undefined}
            aria-invalid={couponNote === PACK_BUY_COPY.couponInvalid ? true : undefined}
            onChange={(e) => {
              setCode(couponTyped(e.target.value));
              setCouponNote("");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              applyCoupon("field");
            }}
            className={`${INPUT} flex-1 min-w-0`}
          />
          <button
            type="button"
            className={`${BTN_SECONDARY} shrink-0`}
            onClick={() => applyCoupon("field")}
            disabled={couponBusy || busy || normaliseCouponCode(code).kind === "none"}
          >
            {couponBusy ? PACK_BUY_COPY.couponChecking : PACK_BUY_COPY.couponApply}
          </button>
        </div>
      )}
      {couponNote && (
        <p id="buy-coupon-note" className={ERROR} role="alert">
          <PhoneText text={couponNote} phone={phone} />
        </p>
      )}
      {/* How to get a code, 2026-10-29 (Aniket: "Want a coupon code for additional discount?
          Email info@extonsports.com to claim yours. - the goes under the coupon code"). Only
          while nothing is applied: with a coupon on, the line would offer what is already there. */}
      {!coupon && (
        <p className="text-white/60 text-[0.85rem] leading-relaxed mt-2">
          {PACK_BUY_COPY.couponClaimBefore}{" "}
          <a
            href={`mailto:${PACK_BUY_COPY.couponClaimEmail}?subject=${encodeURIComponent(PACK_BUY_COPY.couponClaimSubject)}`}
            className="text-[var(--color-ember)] underline underline-offset-2"
          >
            {PACK_BUY_COPY.couponClaimEmail}
          </a>{" "}
          {PACK_BUY_COPY.couponClaimAfter}
        </p>
      )}
      {/* The coupon's one live region (see the header): ALWAYS mounted, empty until an Apply
          or a Remove writes its sentence, so that sentence is a change a screen reader reads. */}
      <p className="sr-only" role="status" aria-live="polite">
        {couponLive}
      </p>

      <div className="mt-5 border border-[var(--legal-line)] bg-[var(--legal-surface)] p-4">
        {offer && shown && (
          <>
            <p className="text-white/80 text-[0.95rem] font-semibold">{offer.name}</p>
            {saving && (
              <p className="text-white/60 text-[1rem] leading-none mt-1.5">
                <span className="sr-only">{PACK_BUY_COPY.wasPrice} </span>
                <s className={STRUCK}>{money(saving.listPriceCents)}</s>
              </p>
            )}
            <p
              className={`text-cond text-white leading-none mt-1 ${saving ? "mb-1.5" : "mb-4"}`}
              style={{ fontSize: "clamp(1.9rem,7vw,2.4rem)" }}
            >
              {money(shown.priceCents)}
            </p>
            {saving && (
              <p className="text-[var(--color-ember)] text-[0.92rem] font-semibold mb-4">{youSave(saving.savesCents)}</p>
            )}
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
          <button type="submit" ref={payRef} className={`${BTN_PRIMARY} w-full mt-4`} disabled={busy || couponBusy || !shown}>
            {busy ? PACK_BUY_COPY.paying : shown ? payButton(shown.priceCents) : PACK_BUY_COPY.choose}
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
