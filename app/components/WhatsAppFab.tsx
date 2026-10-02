"use client";

import { useEffect, useState } from "react";
import { WHATSAPP_CHANNEL_URL, WhatsAppIcon } from "./WhatsAppButton";
import { BOOK_COURTS_URL } from "../../lib/booking";
import { bookingOpensLabel } from "../../lib/opening";

// Floating WhatsApp bubble, rendered site-wide from the root layout.
// It parks itself just above the sticky waitlist banner on pages that have
// one (the home page), and drops to the normal bottom-right corner on pages
// that don't (e.g. /privacy, /terms). The banner's height animates as it
// collapses on scroll, so we recompute on scroll + resize.
export default function WhatsAppFab() {
  const [bottom, setBottom] = useState(24);

  useEffect(() => {
    const compute = () => {
      // The waitlist banner is position:fixed and only exists in the DOM on
      // pages that render it (the home page), so its presence alone is the
      // signal. (offsetParent is always null for fixed elements, so it can't
      // be used as a visibility check here.)
      const banner = document.getElementById("waitlist");
      const next = banner ? banner.offsetHeight + 16 : 24;
      setBottom((prev) => (prev === next ? prev : next));
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, []);

  /* ⚠️ ON A PHONE THIS BUBBLE IS NOW BOOKING, NOT WHATSAPP (2026-10-02).
     The bubble is the only persistent control a phone has, and booking is the
     action the club is paid for; the channel is still linked from the contact
     block in About.tsx, so only the shortcut is lost. Desktop keeps WhatsApp
     because it gained its own booking CTA in the nav instead.

     Swapped by CSS breakpoint, not a JS media query: both render and one is
     hidden, so there is no hydration flash of the wrong bubble. */
  const opensLabel = bookingOpensLabel();
  const shared = "fixed right-4 md:right-6 z-50 flex items-center justify-center hover:scale-105 transition-[transform,background-color,bottom] duration-200";
  /* ⚠️ boxShadow is NOT in here for the booking bubble — see .fab-glow in
     globals.css. An inline box-shadow would beat the class and kill the
     animation. WhatsApp keeps its flat shadow inline. */
  const box = { bottom } as const;

  return (
    <>
      <a
        href={BOOK_COURTS_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={opensLabel ? `Court booking opens ${opensLabel}` : "Book a court at Exton Sports Center"}
        className={`${shared} fab-glow md:hidden rounded-full bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black text-mono text-center leading-[1.15] px-1`}
        style={{ ...box, width: 68, height: 68, fontSize: "0.5rem" }}
      >
        {opensLabel ? <span>Opens<br />{opensLabel}</span> : <span>Book a<br />court</span>}
      </a>

      <a
        href={WHATSAPP_CHANNEL_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Follow Exton Sports Center on WhatsApp"
        className={`${shared} hidden md:flex rounded-full bg-[#25D366] hover:bg-[#20BD5C] text-white`}
        style={{ ...box, width: 56, height: 56, boxShadow: "var(--fab-shadow)" }}
      >
        <WhatsAppIcon className="w-7 h-7" />
      </a>
    </>
  );
}
