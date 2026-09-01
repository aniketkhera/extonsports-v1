import type { Metadata } from "next";
import { Barlow, Oswald, Caveat, Exo_2 } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import TrackBeacon from "mailer-admin/TrackBeacon";
import WhatsAppFab from "./components/WhatsAppFab";
import { LEGAL_NAME } from "@/lib/legal";
import "./globals.css";

const cond = Oswald({
  subsets: ["latin"],
  variable: "--font-cond",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const body = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Academy partner logo fonts. Comfortaa went with ExcelCricket — Chester
// County Cricket Academy's mark is artwork plus the site's own condensed face,
// so there is no third brand webfont to load.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["700"],
  display: "swap",
});
const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  weight: ["800"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://extonsports.com"),
  title: {
    default: "Exton Sports Center — pay-to-play multi-sport club · open 24/7",
    template: "%s · Exton Sports Center",
  },
  description:
    "Cricket, squash, badminton and indoor turf — under one roof in Exton, PA. Book a court by the hour, no membership required. Open 24/7. Coaching delivered through Orangish.",
  alternates: { canonical: "/" },
  keywords: [
    "Exton Sports Center",
    "Exton PA sports club",
    "squash courts Exton",
    "badminton courts Exton",
    "cricket nets Exton",
    "indoor cricket Pennsylvania",
    "Chester County sports club",
    "multi-sport club",
    "24/7 sports club Exton",
    "fitness club Exton PA",
    "pro shop Exton",
  ],
  openGraph: {
    title: "Exton Sports Center — pay-to-play multi-sport club · open 24/7",
    description:
      "Cricket, squash, badminton and indoor turf in Exton, PA. Pay by the hour, no membership. Open 24/7.",
    url: "https://extonsports.com",
    siteName: "Exton Sports Center",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Exton Sports Center",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Exton Sports Center — pay-to-play multi-sport club · open 24/7",
    description:
      "Cricket, squash, badminton and indoor turf in Exton, PA. Pay by the hour, no membership. Open 24/7.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// SportsClub JSON-LD — site-wide structured data. Inlined as a server-side
// <script> tag in <head> so crawlers pick it up without JS execution.
const sportsClubLd = {
  "@context": "https://schema.org",
  "@type": "SportsClub",
  name: "Exton Sports Center",
  // The operating company. Present here so a reviewer viewing source can tie this domain
  // to the entity on the messaging Brand record without it appearing anywhere visible on
  // the homepage. `address` below stays the FACILITY — that is what a SportsClub's
  // address means — while the company's registered address is on the legal pages.
  // See lib/legal.ts.
  legalName: LEGAL_NAME,
  url: "https://extonsports.com",
  logo: "https://extonsports.com/logo.png",
  image: "https://extonsports.com/logo.png",
  email: "info@extonsports.com",
  telephone: "+1-484-252-2523",
  description:
    "Pay-to-play multi-sport club in Exton, PA with squash, badminton, cricket, indoor turf, fitness and a pro shop. Book courts by the hour, no membership required. Open 24/7.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "4 Tabas Lane, Building 2",
    addressLocality: "Exton",
    addressRegion: "PA",
    postalCode: "19341",
    addressCountry: "US",
  },
  openingHours: "Mo-Su 00:00-23:59",
  sport: ["Squash", "Badminton", "Cricket", "Fitness"],
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "4 all-glass squash courts", value: true },
    { "@type": "LocationFeatureSpecification", name: "3 badminton courts", value: true },
    { "@type": "LocationFeatureSpecification", name: "3 cricket lanes", value: true },
    { "@type": "LocationFeatureSpecification", name: "Fitness studio", value: true },
    { "@type": "LocationFeatureSpecification", name: "Pro shop", value: true },
    { "@type": "LocationFeatureSpecification", name: "Locker rooms", value: true },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // The theme script below writes data-theme onto this element before
      // React hydrates, so the server markup and the DOM legitimately differ.
      suppressHydrationWarning
      className={`${cond.variable} ${body.variable} ${caveat.variable} ${exo2.variable} h-full antialiased`}
    >
      <head>
        {/* Theme, applied before first paint. This has to be a blocking
            inline script in <head>: anything deferred to React would let the
            browser paint the dark default first, and a light-mode visitor
            would see the whole page flash navy on every navigation.
            Keep the fallback in step with readTheme() in ThemeToggle.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("exton-theme")==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`,
          }}
        />
      </head>
      <body className="min-h-full">
        {/* Server-rendered JSON-LD. Next.js App Router hoists this
            script tag into <head>; safe because content is a
            controlled constant (no user input). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsClubLd) }}
        />
        {/* overflow-x wrapper: keeps horizontal scroll locked without
            touching body overflow, which would break position:fixed */}
        <div style={{ overflowX: "hidden" }}>{children}</div>
        <WhatsAppFab />
        <Analytics />
        <TrackBeacon />
      </body>
    </html>
  );
}
