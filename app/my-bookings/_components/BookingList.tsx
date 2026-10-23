import type { BookingView, ListView, PackView } from "@/lib/my-bookings/view";
import { COPY, PACK_COPY, bookingsFor } from "@/lib/my-bookings/copy";
import BookingRow from "./BookingRow";
import PackCard from "./PackCard";
import { BTN_PRIMARY } from "./ui";

/* The upcoming guest bookings for this device's email, 2026-10-20. A series is ONE
   booking (owner, 2026-10-18): several courts at one time, paid together, cancelled
   together. Past series are omitted upstream; a series this guest cancelled online stays
   until its start, muted, so a reload confirms the cancel.

   Since 2026-10-21 the guest's court packs sit ABOVE the bookings (orangish-app
   docs/court-packs.md §8.3), usable packs first — view.ts orders them. A guest with a pack
   and nothing booked yet sees the pack and the usual empty state under it. */

/* Where "Book a court or lane" goes when there is nothing to list: THIS site's rates and
   booking panel at the top of the home page (the footer's "Court rates" link goes there
   too), in the same tab. Second review, 2026-10-20: it used to be BOOK_COURT_URL, an
   app.orangish.io address, and on this path guests see extonsports.com only (owner,
   2026-10-18). The booking form itself is still the platform's; the home page's own
   button is the one hop to it, as everywhere else on the site. */
const BOOK_HERE = "/#top";

/**
 * The date a pack row's cancel sheet may promise — "Your credit keeps your pack's date:
 * valid until Nov 29" (design §8.3) — or null, and the sheet then says less.
 *
 * Only when it is CERTAIN, 2026-10-21: exactly one of the guest's packs must be the one the
 * row drew from; and that pack's 60 days must have STARTED (a game played), because a
 * provisional clock is anchored on bookings like this one and moves when it goes (design §3,
 * "Window") — promising the old date there would be a promise the platform does not keep.
 *
 * Which pack: the row's packRef, the platform's own ref for it ("PK-3F2A9C", the card's ref),
 * since review UI-2 — so a guest holding two packs of one name is told the right one's date.
 * A row that names a ref no card carries gets no promise (never a guess by name). Only a
 * platform that sends no ref falls back to the name, and then only when one pack has it.
 */
export function keptValidUntilFor(row: BookingView, packs: PackView[]): string | null {
  if (row.paidWith !== "pack" || !row.packName) return null;
  const mine = row.packRef
    ? packs.filter((p) => p.ref === row.packRef)
    : packs.filter((p) => p.name === row.packName);
  if (mine.length !== 1) return null;
  const p = mine[0];
  return p.clock === "started" ? p.validUntilText : null;
}

export default function BookingList({
  view,
  openCancelFor = null,
}: {
  view: ListView;
  /** A series id from ?cancel=, already shape-checked by the page; null for none. */
  openCancelFor?: string | null;
}) {
  const open = openCancelFor?.toLowerCase() ?? null;
  return (
    <div>
      {view.packs.length > 0 && (
        <section className="mb-10" aria-labelledby="mb-packs">
          <h2 id="mb-packs" className="text-mono text-[0.62rem] text-white/50 tracking-widest mb-3">
            {PACK_COPY.packsHeading}
          </h2>
          <ul className="flex flex-col gap-3">
            {view.packs.map((p) => (
              <PackCard key={p.ref} pack={p} />
            ))}
          </ul>
        </section>
      )}

      {view.email && (
        <p className="text-white/50 text-[0.85rem] mb-6">{bookingsFor(view.email)}</p>
      )}

      {view.bookings.length === 0 ? (
        <div>
          <p className="text-white/70 text-[1rem] leading-relaxed mb-6">{COPY.empty}</p>
          <a href={BOOK_HERE} className={`${BTN_PRIMARY} inline-block`}>
            {COPY.bookCta}
          </a>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {view.bookings.map((b) => (
            <BookingRow
              key={b.seriesId}
              booking={b}
              phone={view.club.phone}
              cutoffHours={view.cutoffHours}
              startOpen={open !== null && b.seriesId.toLowerCase() === open}
              keptValidUntil={keptValidUntilFor(b, view.packs)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
