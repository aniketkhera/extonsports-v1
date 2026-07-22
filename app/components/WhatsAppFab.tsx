"use client";

import { useEffect, useState } from "react";
import { WHATSAPP_CHANNEL_URL, WhatsAppIcon } from "./WhatsAppButton";

// Floating WhatsApp bubble, rendered site-wide from the root layout.
// It parks itself just above the sticky waitlist banner on pages that have
// one (the home page), and drops to the normal bottom-right corner on pages
// that don't (e.g. the careers pages). The banner's height animates as it
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

  return (
    <a
      href={WHATSAPP_CHANNEL_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Follow Exton Sports Center on WhatsApp"
      className="fixed right-4 md:right-6 z-50 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20BD5C] text-white hover:scale-105 transition-[transform,background-color,bottom] duration-200"
      style={{
        bottom,
        width: 56,
        height: 56,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      }}
    >
      <WhatsAppIcon className="w-7 h-7" />
    </a>
  );
}
