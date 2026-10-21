import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { packOffers } from "@/lib/my-bookings/platform";
import { PACK_BUY_COPY } from "@/lib/my-bookings/copy";
import { PACKS_LIVE, PACK_PATH } from "@/lib/booking";
import OrangishPill from "../components/OrangishPill";
import BuyForm from "./BuyForm";

// www.extonsports.com/5-pack — buy a court 5-pack, 2026-10-21. Owner, 2026-10-20: "let's
// go with the implentation.." (orangish-app docs/court-packs.md §8.2; buy.html with the
// design's corrected copy).
//
// PUBLIC, BUT FAIL CLOSED. The offers come live from the platform's PUBLIC endpoint, which
// answers 404 until the club's court_packs_public flag is on; that, an outage, a bad
// answer, an empty list or no relay secret on this deploy all render the same honest
// "5-packs aren't on sale online right now" — never a form that cannot work. Prices are
// the platform's (court_pack_offers), so a price change needs no deploy here.
//
// UNLINKED UNTIL PACKS_LIVE (lib/booking.ts; design §12 step 8): the Hero, Footer and
// sitemap links appear only then, and until then the page asks not to be indexed.
//
// The visitor's IP goes with the call (lib/my-bookings/platform.ts — the platform's
// per-IP limits trust it only alongside the relay secret). ?sport=<id> picks the tile:
// the app form's promo box and Stripe's cancel_url both come back with it. Shell: the
// my-bookings / legal-page look — one quiet column, the club's name as the way home.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "5-pack",
  description: PACK_BUY_COPY.lead,
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

export default async function PackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const sport = typeof sp.sport === "string" ? sp.sport : null;
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
            windowDays={onSale.windowDays}
            unusedMonths={onSale.unusedMonths}
            initialSportId={sport}
          />
        </>
      ) : (
        <p className="text-white/70 text-[1rem] leading-relaxed" role="status">
          {PACK_BUY_COPY.notOnSale}
        </p>
      )}
    </Shell>
  );
}
