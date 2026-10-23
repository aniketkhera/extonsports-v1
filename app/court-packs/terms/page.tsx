import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { packOffers } from "@/lib/my-bookings/platform";
import { FALLBACK_PHONE, PACK_BUY_COPY } from "@/lib/my-bookings/copy";
import { PACKS_LIVE, PACK_TERMS_PATH } from "@/lib/booking";
import PhoneText from "../../my-bookings/_components/PhoneText";
import OrangishPill from "../../components/OrangishPill";

// www.extonsports.com/court-packs/terms — the court pack terms, 2026-10-21 (orangish-app
// docs/court-packs.md §8.2). The wording is the PLATFORM's (lib/court-pack-terms.ts, with
// its version), so the page a buyer reads is the version their pack records; it is
// rendered here as text only — view.ts toOffers drops any link the sections carry.
// 2026-10-22: moved from /5-pack/terms with the rename to "court packs" (next.config.ts
// redirects the old path); the two-size wording (version 2026-10-22-1, "Exton Sports —
// court pack terms") arrives from the platform like any other, so nothing here changed.
//
// From the DESK variant of the offers (packOffers {desk: true}), which needs only the
// club's court_packs flag: a desk sale's Stripe page says "By paying you agree to the
// court pack terms: www.extonsports.com/court-packs/terms" before any public sale exists.
//
// Fails closed like /court-packs: off, down or unconfigured, it says it can't show them and
// gives the phone — never a blank page, and never someone else's wording.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: PACK_BUY_COPY.termsTitle,
  description: "The terms of an Exton Sports Center court pack.",
  alternates: { canonical: PACK_TERMS_PATH },
  robots: { index: PACKS_LIVE, follow: PACKS_LIVE },
};

export default async function PackTermsPage() {
  const r = await packOffers(clientIpOf(await headers()), { desk: true });
  const terms = r.kind === "ok" ? r.view.terms : null;

  return (
    <div className="bg-[var(--legal-bg)] min-h-screen text-white">
      <div className="mx-auto max-w-[760px]" style={{ padding: "64px clamp(16px,5vw,48px) 80px" }}>
        <Link
          href="/"
          className="text-mono text-[0.7rem] tracking-widest text-white/45 hover:text-white/80 transition"
        >
          ← EXTON SPORTS CENTER
        </Link>

        <main className="mt-6">
          <h1
            className="text-cond text-white mb-8"
            style={{ fontSize: "clamp(2rem,5vw,3rem)", lineHeight: 1.05, letterSpacing: "-0.01em" }}
          >
            {terms?.title ?? PACK_BUY_COPY.termsTitle}
          </h1>

          {terms ? (
            terms.sections.map((s, i) => (
              <section key={i} className="mb-8">
                <h2 className="text-[1.05rem] font-semibold mb-2.5 text-white/90">{s.heading}</h2>
                <p className="text-white/70 text-[0.95rem] leading-[1.75] whitespace-pre-line">{s.body}</p>
              </section>
            ))
          ) : (
            <p className="text-white/70 text-[1rem] leading-relaxed" role="status">
              <PhoneText text={PACK_BUY_COPY.termsUnavailable(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
            </p>
          )}
        </main>

        <div className="border-t border-[var(--legal-surface-2)] pt-6 mt-14">
          <p className="text-[0.72rem]">
            <OrangishPill />
          </p>
        </div>
      </div>
    </div>
  );
}
