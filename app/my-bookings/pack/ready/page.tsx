import type { Metadata } from "next";
import { headers } from "next/headers";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { packOffers, packPurchase } from "@/lib/my-bookings/platform";
import { CHECKOUT_SESSION_RE } from "@/lib/my-bookings/session";
import type { OfferView, PurchaseView } from "@/lib/my-bookings/view";
import {
  FALLBACK_PHONE, PACK_BUY_COPY, ofLeft, paidByCard, purchaseUnknown, validWindowText,
} from "@/lib/my-bookings/copy";
import { bookWithPackUrl } from "@/lib/booking";
import PhoneText from "../../_components/PhoneText";
import { PackMeter } from "../../_components/PackCard";
import { BTN_PRIMARY } from "../../_components/ui";
import PurchaseStatus from "./PurchaseStatus";

// /my-bookings/pack/ready?cs={CHECKOUT_SESSION_ID} — where Stripe sends a 5-pack buyer
// after paying, 2026-10-21 (orangish-app docs/court-packs.md §4 success_url, §8.2).
//
// PRIVATE: under /my-bookings, so the layout's noindex and no-referrer, next.config.ts's
// private no-store headers, robots.ts's disallow and SiteChrome's no-analytics all apply.
//
// ⛔ ONLY A cs_ ID IS EVER RELAYED, and only in a POST body (platform.ts packPurchase).
// Anything else in ?cs= is "we can't find that payment yet" with no call at all. The
// platform answers by that id only — sport, credits, price and a MASKED address, never a
// pack id or the whole address — so a guessed id shows a stranger nothing useful.
//
// "Ready" ONLY ON 'active', the platform's word that the webhook settled the pack.
// 'pending' (Stripe returned the guest before its webhook landed) shows "setting up" and
// re-asks by refreshing this page (PurchaseStatus). Anything else — 'unknown', an outage,
// a bad answer — is the honest "we can't find that payment yet; if you paid, the receipt
// is on its way", with the phone.
//
// ⚠️ PAYING REMEMBERS NOTHING (design §0): typing an email at checkout does not prove the
// inbox. The receipt's "Book with my pack" button does that; this page says so.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Your 5-pack · Exton Sports Center" },
};

function Unknown() {
  return (
    <p className="text-white/70 text-[1rem] leading-relaxed" role="status">
      <PhoneText text={purchaseUnknown(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
    </p>
  );
}

/** The offer for the purchase's sport (its name, its id for the booking link), or null. */
function offerFor(v: PurchaseView, offers: OfferView[] | null): OfferView | null {
  if (!offers || !v.sport) return null;
  const sport = v.sport.toLowerCase();
  return offers.find((o) => o.sport.toLowerCase() === sport) ?? null;
}

export default async function PackReadyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cs = (await searchParams).cs;
  if (typeof cs !== "string" || !CHECKOUT_SESSION_RE.test(cs)) return <Unknown />;

  const ip = clientIpOf(await headers());
  const r = await packPurchase(cs, ip);
  if (r.kind !== "ok" || r.view.state === "unknown") return <Unknown />;
  const v = r.view;
  if (v.state === "pending") return <PurchaseStatus maskedEmail={v.maskedEmail} phone={FALLBACK_PHONE} />;

  // Active. The offers only now (not on every "pending" poll): the pack's name, its
  // window and its sport id for the booking link. If they are down, the rows they would
  // have filled are left out and the form opens in pack mode for the guest to pick.
  const o = await packOffers(ip, { desk: true });
  const offers = o.kind === "ok" ? o.view : null;
  const offer = offerFor(v, offers?.offers ?? null);

  const rows: Array<[string, string]> = [];
  const name = offer?.name ?? v.sport;
  if (name) rows.push([PACK_BUY_COPY.rowPack, name]);
  if (v.credits !== null) rows.push([PACK_BUY_COPY.rowCredits, ofLeft(v.credits, v.credits)]);
  if (offers) rows.push([PACK_BUY_COPY.rowValid, validWindowText(offers.windowDays)]);
  if (v.priceCents !== null) rows.push([PACK_BUY_COPY.rowPaid, paidByCard(v.priceCents)]);
  if (v.maskedEmail) rows.push([PACK_BUY_COPY.rowEmail, v.maskedEmail]);

  return (
    <div>
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full"
        style={{ width: "44px", height: "44px", background: "var(--color-ember)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10.5l4 4 8-9" stroke="#111" strokeWidth="2.6" strokeLinecap="square" />
        </svg>
      </span>
      <h1
        className="text-cond text-white uppercase mt-4"
        style={{ fontSize: "clamp(2.1rem,8vw,2.8rem)", lineHeight: 1.04, letterSpacing: "-0.01em" }}
      >
        {PACK_BUY_COPY.readyTitle}
      </h1>
      {v.credits !== null && <PackMeter left={v.credits} total={v.credits} />}

      <dl className="border-t border-[var(--legal-line)] mt-3">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-[var(--legal-line)] text-[0.95rem]">
            <dt className="text-white/60">{k}</dt>
            <dd className="text-white/90 text-right m-0">{val}</dd>
          </div>
        ))}
      </dl>

      {/* The app's booking form in pack mode, for this pack's sport. It leaves this site on
          purpose (design §0): the form's "Continue with my 5-pack" brings the guest back to
          /my-bookings/pack here. Same tab; the layout's no-referrer keeps ?cs= out of it. */}
      <a href={bookWithPackUrl(offer?.sportId)} rel="noreferrer" className={`${BTN_PRIMARY} block text-center mt-6`}>
        {PACK_BUY_COPY.bookFirst}
      </a>
      <p className="text-white/60 text-[0.88rem] leading-relaxed mt-4">{PACK_BUY_COPY.receiptNote}</p>
    </div>
  );
}
