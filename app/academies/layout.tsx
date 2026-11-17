import type { Metadata } from "next";
import OrangishPill from "../components/OrangishPill";
import ThemeToggle from "../components/ThemeToggle";

// The shell for extonsports.com/academies, 2026-11-16 (orangish-app docs/academy-page.md §4) —
// app/my-bookings/layout.tsx's, on purpose: a quiet 640px column with a 16px gutter at
// phone width, the light/dark switch at the top (light is the site's default), and the
// orangish.io pill as the one credit on the path.
//
// PRIVATE: the academy partners' own page, reached from an email and never linked from the
// nav, the footer or the sitemap. noindex + no-referrer here, the same headers from
// next.config.ts, robots.ts disallows the path, and SiteChrome drops analytics, the visit
// beacon and the WhatsApp bubble (PRIVATE_PATHS there) — a page that can put time on an
// account has no business in a visit log.

// The title is ACADEMY_COPY.title (lib/academies/copy.ts) plus the club's name; the test pins
// the two together.
export const metadata: Metadata = {
  title: { absolute: "Academy page · Exton Sports Center" },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AcademiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--legal-bg)] min-h-screen text-white">
      <div className="mx-auto max-w-[640px]" style={{ padding: "48px clamp(16px,5vw,48px) 80px" }}>
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <main className="mt-4">{children}</main>

        <div className="border-t border-[var(--legal-surface-2)] pt-6 mt-14">
          <p className="text-[0.72rem]">
            <OrangishPill />
          </p>
        </div>
      </div>
    </div>
  );
}
