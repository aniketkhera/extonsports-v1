import type { Metadata, Viewport } from "next";
import ComingSoon from "./ComingSoon";

// The "coming soon" wall screen (2026-09-19), shown on every Exton TV — reception and
// outside so far. A 16:9 TV first, a phone second (the QR
// on it lands people on the homepage, not here). No nav, no footer, no WhatsApp bubble or
// visit beacon (see components/SiteChrome.tsx), and it fits one screen with no scroll.
//
// No opening date on it: the date is not settled (2026-09-19), so this page deliberately
// does not read lib/opening.ts — a screen on the wall would outlive a slipped date.
//
// Not in sitemap.ts, and noindex, despite the sitemap's "add every public route" rule: that
// rule exists so marketing pages carry priority, and this is a display page. Indexed, it
// would compete with the homepage for "Exton Sports Center" with a page that has no content
// beyond the floor plan.
export const metadata: Metadata = {
  title: { absolute: "Coming soon · Exton Sports Center" },
  description:
    "Exton Sports Center — squash, badminton, cricket and fitness under one roof in Exton, PA. Coming soon.",
  alternates: { canonical: "/comingsoon" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1019",
  colorScheme: "dark",
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
