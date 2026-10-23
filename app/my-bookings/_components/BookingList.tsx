import type { ListView } from "@/lib/my-bookings/view";
import { COPY, bookingsFor } from "@/lib/my-bookings/copy";
import BookingRow from "./BookingRow";
import { BTN_PRIMARY } from "./ui";

/* The upcoming guest bookings for this device's email, 2026-10-20. A series is ONE
   booking (owner, 2026-10-18): several courts at one time, paid together, cancelled
   together. Past series are omitted upstream; a series this guest cancelled online stays
   until its start, muted, so a reload confirms the cancel. */

/* Where "Book a court or lane" goes when there is nothing to list: THIS site's rates and
   booking panel at the top of the home page (the footer's "Court rates" link goes there
   too), in the same tab. Second review, 2026-10-20: it used to be BOOK_COURT_URL, an
   app.orangish.io address, and on this path guests see extonsports.com only (owner,
   2026-10-18). The booking form itself is still the platform's; the home page's own
   button is the one hop to it, as everywhere else on the site. */
const BOOK_HERE = "/#top";

export default function BookingList({ view }: { view: ListView }) {
  return (
    <div>
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
            <BookingRow key={b.seriesId} booking={b} phone={view.club.phone} cutoffHours={view.cutoffHours} />
          ))}
        </ul>
      )}
    </div>
  );
}
