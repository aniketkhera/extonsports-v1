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

// /my-bookings/pack/ready?cs={CHECKOUT_SESSION_ID} — where Stripe sends a court pack buyer
// after paying, 2026-10-21 (orangish-app docs/court-packs.md §4 success_url, §8.2).
//
// TWO SIZES, 2026-10-22 (Aniket): a 5-pack is good for 60 days and a 10-pack for 120, so
// the "Valid" row is THIS pack's window — the purchase answer's own windowDays when the
// platform sends it, else the window of the offer matching the purchase's sport AND size
// (by sport alone, the first offer — the 5-pack — would tell a 10-pack buyer "60 days"),
// else no row. A wrong number of days is worse than none.
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
  title: { absolute: "Your court pack · Exton Sports Center" },
};

function Unknown() {
  return (
    <p className="text-white/70 text-[1rem] leading-relaxed" role="status">
      <PhoneText text={purchaseUnknown(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
    </p>
  );
}

/** The offers of the purchase's sport — by its id when the platform sent one, else by its
 *  name. */
function sportOffers(v: PurchaseView, offers: OfferView[] | null): OfferView[] {
  if (!offers) return [];
  if (v.sportId) return offers.filter((o) => o.sportId === v.sportId);
  if (!v.sport) return [];
  const sport = v.sport.toLowerCase();
  return offers.filter((o) => o.sport.toLowerCase() === sport);
}

/**
 * The offer this purchase was, matched by sport AND size (2026-10-22: two sizes per sport),
 * or null. Without a size from the platform, only a sport that sells one size is a match —
 * guessing between a 5-pack and a 10-pack would name the wrong window.
 */
function offerFor(v: PurchaseView, offers: OfferView[] | null): OfferView | null {
  const same = sportOffers(v, offers);
  if (v.credits !== null) return same.find((o) => o.credits === v.credits) ?? null;
  return same.length === 1 ? same[0] : null;
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

  // Active. The offers only now (not on every "pending" poll), and only for what the
  // purchase answer did not carry itself: the window — "Valid 60 days from your first game"
  // (120 for a 10-pack) — and, from an older platform, the name and sport. The pack's name
  // and sport id come in the purchase answer since the platform's integration (review UI-2,
  // 2026-10-21), so "Book your first game" opens the form for the right sport even with the
  // offers down; an older answer without them still matches the offer, by sport and size.
  // With neither, the form opens in pack mode for the guest to pick.
  const needOffers = v.windowDays === null || !v.sportId || !v.name;
  const o = needOffers ? await packOffers(ip, { desk: true }) : null;
  const offerList = o?.kind === "ok" ? o.view.offers : null;
  const offer = offerFor(v, offerList);
  const sportId = v.sportId ?? offer?.sportId ?? sportOffers(v, offerList)[0]?.sportId;
  const windowDays = v.windowDays ?? offer?.windowDays ?? null;

  const rows: Array<[string, string]> = [];
  const name = v.name ?? offer?.name ?? v.sport;
  if (name) rows.push([PACK_BUY_COPY.rowPack, name]);
  if (v.credits !== null) rows.push([PACK_BUY_COPY.rowCredits, ofLeft(v.credits, v.credits)]);
  if (windowDays !== null) rows.push([PACK_BUY_COPY.rowValid, validWindowText(windowDays)]);
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
          purpose (design §0): the form's "Continue with my court pack" brings the guest back to
          /my-bookings/pack here. Same tab; the layout's no-referrer keeps ?cs= out of it. */}
      <a href={bookWithPackUrl(sportId)} rel="noreferrer" className={`${BTN_PRIMARY} block text-center mt-6`}>
        {PACK_BUY_COPY.bookFirst}
      </a>
      <p className="text-white/60 text-[0.88rem] leading-relaxed mt-4">{PACK_BUY_COPY.receiptNote}</p>
    </div>
  );
}
