import type { Metadata } from "next";
import Link from "next/link";
import OrangishPill from "../components/OrangishPill";

// The shell for extonsports.com/my-bookings, 2026-10-20 — the LegalPage look
// (app/components/LegalPage.tsx): a quiet single column, the club's name as the way home,
// and the orangish.io pill as the one credit the owner allows on this path (2026-10-18:
// guests see extonsports.com only; "beyond the small orangish.io credit pill").
//
// 640px rather than LegalPage's 760: this is a form and a short list, read on a phone
// more often than not. The side gutter bottoms out at 16px so a 360px screen still has a
// usable Cancel button.
//
// noindex + no-referrer: one person's bookings, reached from an email. The same headers
// go out from next.config.ts, robots.ts disallows the path, and SiteChrome drops the
// analytics, visit beacon and WhatsApp bubble here (see PRIVATE_PATHS there).

export const metadata: Metadata = {
  title: { absolute: "My bookings · Exton Sports Center" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
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
