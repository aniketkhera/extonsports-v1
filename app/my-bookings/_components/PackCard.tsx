import type { PackView } from "@/lib/my-bookings/view";
import { PACK_COPY, packLine, packStatusText, packUseLine } from "@/lib/my-bookings/copy";
import { BTN_PRIMARY } from "./ui";

/* One of the guest's 5-packs, above their bookings, 2026-10-21 (orangish-app
   docs/court-packs.md §8.3; the look is cancel.html's "My pack" panel: an ember-edged
   card, the pack's name in the condensed face, a bar of one segment per credit, and
   "2 of 5 left · valid until Nov 29").

   EVERY NUMBER AND DATE HERE IS THE PLATFORM'S (cp_pack_state, the one implementation of
   the 60-day rule — design §3). This card adds nothing up and works nothing out; it
   prints what the allow-list in lib/my-bookings/view.ts let through.

   ⛔ ONLY A USABLE PACK OFFERS "Book a court with my pack". An expired, used-up,
   all-booked, refunded or disputed pack says why instead (copy.ts packStatusText) — a
   button that leads to a refusal is worse than none. The link is pack.bookUrl, which
   view.ts BUILT from the checked sport id (lib/booking.ts bookWithPackUrl); the
   platform's own bookUrl is never followed.

   ⚠️ THAT LINK LEAVES extonsports.com, ON PURPOSE (design §0 and §8.3): the booking form —
   prices, live availability, the "My 5-pack" switch — is the app's, and its "Continue
   with my 5-pack" brings the guest straight back to /my-bookings/pack on this site, where
   the remembered phone lives. Same tab for that reason, and the layout's no-referrer
   keeps this page's address out of the hop. No sign-in token ever rides on it.

   No "use client" and no hooks: BookingList renders the cards, and BookingRow (a client
   component) borrows PackMeter for a cancel's result. */

/** Uses shown on a card: "the last few" (design §8.3). The platform sends up to ten. */
const USES_SHOWN = 3;

const EMBER = "var(--color-ember)";
// Inline, not Tailwind's bg-[var(--color-ember)]/NN: an opacity modifier on a bare var()
// colour computed to transparent on this site (measured in Hero.tsx, 2026-10-02).
const SEGMENT: Record<"left" | "booked" | "used", string> = {
  left: EMBER,
  booked: `color-mix(in srgb, ${EMBER} 55%, transparent)`,
  used: `color-mix(in srgb, ${EMBER} 22%, transparent)`,
};

/**
 * The bar: one segment per credit, spent first — used (played, or no longer on the pack),
 * then booked (upcoming), then left — as the mockups draw it. Decorative: the sentence
 * beside it carries the same numbers for a screen reader.
 */
export function PackMeter({ left, booked = 0, total }: { left: number; booked?: number; total: number }) {
  const kinds: Array<keyof typeof SEGMENT> = [];
  for (let i = 0; i < total; i++) {
    kinds.push(i < total - left - booked ? "used" : i < total - left ? "booked" : "left");
  }
  return (
    <span className="flex flex-wrap gap-[6px] my-2.5" aria-hidden="true">
      {kinds.map((k, i) => (
        <span
          key={i}
          data-credit={k}
          className="block"
          style={{ width: "28px", height: "8px", background: SEGMENT[k] }}
        />
      ))}
    </span>
  );
}

export default function PackCard({ pack: p }: { pack: PackView }) {
  const usable = p.status === "active";
  const why = packStatusText(p);
  // The date line is kept while credits can still be spent or are booked to be played;
  // a closed or expired pack does not advertise credits it cannot spend.
  const showLine = p.status === "active" || p.status === "all_booked";

  return (
    <li
      className="border"
      style={{
        padding: "14px clamp(14px,4vw,18px)",
        borderColor: EMBER,
        background: `color-mix(in srgb, ${EMBER} 7%, transparent)`,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-cond text-white uppercase tracking-[0.04em] text-[1.12rem] leading-tight">{p.name}</p>
        {/* What the guest quotes at the desk ("PK-1A2B3C"); never the pack's id. */}
        <p className="text-mono text-white/45 text-[0.62rem] tracking-widest shrink-0">{p.ref}</p>
      </div>

      <PackMeter left={p.creditsLeft} booked={p.creditsBooked} total={p.creditsTotal} />

      {showLine && <p className="text-white/80 text-[0.92rem] leading-relaxed">{packLine(p)}</p>}
      {why && <p className="text-white/70 text-[0.92rem] leading-relaxed">{why}</p>}

      {p.uses.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-0.5">
          {p.uses.slice(0, USES_SHOWN).map((u, i) => (
            <li key={i} className="text-white/55 text-[0.84rem] leading-relaxed">
              {packUseLine(u)}
            </li>
          ))}
        </ul>
      )}

      {usable && (
        <a href={p.bookUrl} rel="noreferrer" className={`${BTN_PRIMARY} inline-block mt-4`}>
          {PACK_COPY.bookWithMyPack}
        </a>
      )}
    </li>
  );
}
