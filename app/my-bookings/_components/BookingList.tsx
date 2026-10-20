import type { ListView } from "@/lib/my-bookings/view";
import { COPY, bookingsFor } from "@/lib/my-bookings/copy";
import { BOOK_COURT_URL } from "@/lib/booking";
import BookingRow from "./BookingRow";
import { BTN_PRIMARY } from "./ui";

/* The upcoming guest bookings for this device's email, 2026-10-20. A series is ONE
   booking (owner, 2026-10-18): several courts at one time, paid together, cancelled
   together. Past series are omitted upstream; a series this guest cancelled online stays
   until its start, muted, so a reload confirms the cancel. */
export default function BookingList({ view }: { view: ListView }) {
  return (
    <div>
      {view.email && (
        <p className="text-white/50 text-[0.85rem] mb-6">{bookingsFor(view.email)}</p>
      )}

      {view.bookings.length === 0 ? (
        <div>
          <p className="text-white/70 text-[1rem] leading-relaxed mb-6">{COPY.empty}</p>
          {/* The booking form itself still lives on the platform (moving it is out of
              scope, 2026-10-18); BookingThemeCarry, which SiteChrome keeps on this path,
              carries the visitor's theme onto it like every other booking link. */}
          <a href={BOOK_COURT_URL} target="_blank" rel="noreferrer" className={`${BTN_PRIMARY} inline-block`}>
            {COPY.bookCta}
          </a>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {view.bookings.map((b) => (
            <BookingRow key={b.seriesId} booking={b} phone={view.club.phone} cutoffHours={view.cutoffHours} />
          ))}
        </ul>
      )}
    </div>
  );
}
