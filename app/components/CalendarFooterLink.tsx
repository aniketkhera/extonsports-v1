"use client";

import { useRef, useState } from "react";
import BookingsCalendar from "./BookingsCalendar";
import { isPlainLeftClick } from "./my-bookings-pure";

/* "Calendar of bookings" in the footer's PLAY column, 2026-10-21.
   ──────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: "Remove 'Show calendar of bookings' button. that's not needed. Move it
   as a small button in the footer somwehere", then "in the footer, it doesnt have to be so
   prominent, make it like all the other links in the footer". So it is a plain link with
   FooterCol's exact classes, and it opens the SAME overlay the hero's button used to.

   Footer.tsx is a Server Component and must stay one, so the overlay comes in through this
   small client island. It is a real <a href="/calendar">: with no JavaScript, or on a
   ctrl/cmd/shift/middle click, it is simply the /calendar page, which renders the same
   BookingsCalendar (`standalone`) on the same data path, so the two cannot disagree. A plain
   left click opens the overlay instead, in place, like the hero button did. */
export default function CalendarFooterLink({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  return (
    <>
      <a
        ref={linkRef}
        href="/calendar"
        onClick={(e) => {
          if (!isPlainLeftClick(e)) return;
          e.preventDefault();
          setOpen(true);
        }}
        className="text-white/55 hover:text-white transition"
      >
        {label}
      </a>
      {/* Mounted always but inert until opened: it fetches nothing until then (see
          BookingsCalendar), so the footer costs a visitor who never opens it nothing.
          Closing hands focus back to this link, so a keyboard user is not dropped at the
          top of the page. */}
      <BookingsCalendar
        open={open}
        onClose={() => {
          setOpen(false);
          linkRef.current?.focus();
        }}
      />
    </>
  );
}
