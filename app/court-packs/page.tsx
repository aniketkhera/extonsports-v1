import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { packOffers } from "@/lib/my-bookings/platform";
import { FALLBACK_PHONE, PACK_BUY_COPY, howToUsePack } from "@/lib/my-bookings/copy";
import type { OfferView } from "@/lib/my-bookings/view";
import { PACKS_LIVE, PACK_PATH } from "@/lib/booking";
import OrangishPill from "../components/OrangishPill";
import { LABEL } from "../my-bookings/_components/ui";
import PhoneText from "../my-bookings/_components/PhoneText";
import BuyForm from "./BuyForm";

// www.extonsports.com/court-packs — buy a court pack, 2026-10-21. Owner, 2026-10-20: "let's
// go with the implentation.." (orangish-app docs/court-packs.md §8.2; buy.html with the
// design's corrected copy).
//
// 2026-10-22 (Aniket): renamed from /5-pack (next.config.ts redirects it here, query and
// all), and two sizes per sport — a 5-pack and a 10-pack, badminton and cricket only. The
// form picks a sport, then a size; every price, size and window on it is that offer's own.
//
// PUBLIC, BUT FAIL CLOSED. The offers come live from the platform's PUBLIC endpoint, which
// answers 404 until the club's court_packs_public flag is on; that, an outage, a bad
// answer, an empty list or no relay secret on this deploy all render the same honest
// "Court packs aren't on sale online right now" — never a form that cannot work. Prices,
// sizes and windows are the platform's (court_pack_offers), so a change needs no deploy here.
//
// UNLINKED UNTIL PACKS_LIVE (lib/booking.ts; design §12 step 8): the Hero, Footer and
// sitemap links appear only then, and until then the page asks not to be indexed.
//
// The visitor's IP goes with the call (lib/my-bookings/platform.ts — the platform's
// per-IP limits trust it only alongside the relay secret). ?sport=<id> picks the sport and
// ?credits=<n> the size (2026-10-22): the app form's promo box and Stripe's cancel_url
// both come back with them. Shell: the my-bookings / legal-page look — one quiet column,
// the club's name as the way home.

export const dynamic = "force-dynamic";

// The description is size-free and price-free (2026-10-25, site review): it is static, and
// the sizes and prices are the platform's rows. See PACK_BUY_COPY.metaDescription.
export const metadata: Metadata = {
  title: "Court packs",
  description: PACK_BUY_COPY.metaDescription,
  alternates: { canonical: PACK_PATH },
  robots: { index: PACKS_LIVE, follow: PACKS_LIVE },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--legal-bg)] min-h-screen text-white">
      <div className="mx-auto max-w-[640px]" style={{ padding: "64px clamp(16px,5vw,48px) 80px" }}>
        <Link
          href="/"
          className="text-mono text-[0.7rem] tracking-widest text-white/45 hover:text-white/80 transition"
        >
          ← EXTON SPORTS CENTER
        </Link>
        <main className="mt-6">{children}</main>
        <div className="border-t border-[var(--legal-surface-2)] pt-6 mt-14">
          <p className="text-[0.72rem]">
            <OrangishPill />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * "How to use your pack", 2026-10-25 (Aniket asked for it): five steps and the rules, under
 * the form. Every word is copy.ts howToUsePack's — the labels it quotes, the windows from these
 * offers, the cutoff — so this only lays it out, in the "Booking and changes" box's look
 * (BuyForm.tsx). Rendered only beside the form: on "not on sale" there is no pack to use.
 * The phone is FALLBACK_PHONE, the number BuyForm already falls back to on this page; it is
 * a tel: link through PhoneText, as in that box.
 */
function HowToUse({ offers, phone }: { offers: OfferView[]; phone: string }) {
  const { steps, rules } = howToUsePack(offers, phone);
  return (
    <section aria-labelledby="buy-howto" className="mt-8 border border-[var(--legal-line)] bg-[var(--legal-surface)] p-4">
      <h2 id="buy-howto" className={LABEL}>
        {PACK_BUY_COPY.howToTitle}
      </h2>
      <ol className="mt-1 space-y-1.5 list-decimal pl-5">
        {steps.map((line) => (
          <li key={line} className="text-white/80 text-[0.92rem] leading-snug">
            <PhoneText text={line} phone={phone} />
          </li>
        ))}
      </ol>
      <p className="text-white/60 text-[0.85rem] leading-relaxed mt-3">{rules}</p>
    </section>
  );
}

export default async function PackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const sport = typeof sp.sport === "string" ? sp.sport : null;
  // A size is a whole number or nothing; whether it is on sale is the form's to check
  // against the offers (an unknown one picks the sport's smallest).
  const credits = typeof sp.credits === "string" && /^[1-9]\d?$/.test(sp.credits) ? Number(sp.credits) : null;
  const r = await packOffers(clientIpOf(await headers()));
  const onSale = r.kind === "ok" && r.view.offers.length > 0 ? r.view : null;

  return (
    <Shell>
      {onSale && (
        <span className="inline-block bg-[var(--color-ember)] text-black text-cond uppercase tracking-[0.14em] text-[0.78rem] px-3 py-1.5">
          {PACK_BUY_COPY.chip}
        </span>
      )}
      <h1
        className="text-cond text-white uppercase mt-4 mb-4"
        style={{ fontSize: "clamp(2.4rem,9vw,3.4rem)", lineHeight: 1.02, letterSpacing: "-0.01em" }}
      >
        {PACK_BUY_COPY.title}
        {onSale && (
          <>
            <br />
            <span className="text-[var(--color-ember)]">{PACK_BUY_COPY.titleAccent}</span>
          </>
        )}
      </h1>

      {onSale ? (
        <>
          <p className="text-white/70 text-[1.05rem] leading-relaxed mb-7">{PACK_BUY_COPY.lead}</p>
          <BuyForm
            offers={onSale.offers}
            termsVersion={onSale.terms.version}
            initialSportId={sport}
            initialCredits={credits}
          />
          <HowToUse offers={onSale.offers} phone={FALLBACK_PHONE} />
        </>
      ) : (
        <p className="text-white/70 text-[1rem] leading-relaxed" role="status">
          {PACK_BUY_COPY.notOnSale}
        </p>
      )}
    </Shell>
  );
}
