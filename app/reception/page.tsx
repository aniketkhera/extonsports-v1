import type { Metadata, Viewport } from "next";
import { OPENING_DATE } from "@/lib/opening";
import Reception from "./Reception";

// The wall screen at the front desk (2026-09-19): a 16:9 TV first, a phone second (the QR
// on it lands people on the homepage, not here). No nav, no footer, no WhatsApp bubble or
// visit beacon (see components/SiteChrome.tsx), and it fits one screen with no scroll.
//
// Not in sitemap.ts, and noindex, despite the sitemap's "add every public route" rule: that
// rule exists so marketing pages carry priority, and this is a display page. Indexed, it
// would compete with the homepage for "Exton Sports Center" with a page that has no content
// beyond the floor plan.
export const metadata: Metadata = {
  title: { absolute: "Coming soon · Exton Sports Center" },
  description:
    "Exton Sports Center — squash, badminton, cricket and fitness under one roof in Exton, PA. Coming soon.",
  alternates: { canonical: "/reception" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1019",
  colorScheme: "dark",
};

// "Mon, Sep 21 · 6 AM", in the club's own time zone. Formatted here on the server, once,
// rather than in the client component: the TV's locale and ICU build are not the build
// machine's, and a date string that renders differently on each side is a hydration error.
function openingLabel(d: Date): string {
  const tz = "America/New_York";
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(d);
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric" }).format(d);
  return `${day} · ${hour}`;
}

export default function ReceptionPage() {
  return <Reception openingLabel={openingLabel(OPENING_DATE)} openingAt={OPENING_DATE.getTime()} />;
}
