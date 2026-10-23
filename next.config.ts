import type { NextConfig } from "next";

// The headers every /my-bookings answer carries, 2026-10-20 — pages, the link route and
// its API alike. private, no-store: each answer is one guest's, several set or clear the
// device cookie, and no CDN or back-forward cache may hand one to the next person on a
// shared device. no-referrer: nothing from this path (in particular /my-bookings/link's
// token) may leave in a Referer. noindex: belt to robots.ts's braces. The route handlers
// set the first two themselves as well, so neither depends on this file alone.
const MY_BOOKINGS_HEADERS = [
  { key: 'Cache-Control', value: 'private, no-store' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['mailer-admin'],

  async headers() {
    return [
      { source: '/my-bookings', headers: MY_BOOKINGS_HEADERS },
      { source: '/my-bookings/:path*', headers: MY_BOOKINGS_HEADERS },
      { source: '/api/my-bookings/:path*', headers: MY_BOOKINGS_HEADERS },
      // The court pack's checkout relay, 2026-10-21 (orangish-app docs/court-packs.md
      // §8.2): its body carries the buyer's email and its answer a Stripe Checkout URL, so
      // the same private, no-store answer. The pack's receipt page,
      // /my-bookings/pack/ready?cs=, is already under /my-bookings/:path* above.
      // /court-packs and /court-packs/terms are PUBLIC pages and are deliberately not
      // listed here. 2026-10-22: the relay moved from /api/5-pack with the rename to
      // "court packs" (Aniket), and this rule moved WITH it — left on the old path, the new
      // relay's answer would silently lose private/no-store.
      { source: '/api/court-packs/:path*', headers: MY_BOOKINGS_HEADERS },
    ];
  },

  // The head-badminton-coach posting came down with the careers section, and
  // head-cricket-coach came down before it. Both were live, both were `index,
  // follow`, both carried JobPosting JSON-LD, and both were submitted in
  // sitemap.xml at priority 0.8 — so they are indexed, and they were linked
  // from outbound recruiting posts. Removing the sitemap entry stops the site
  // ADVERTISING a URL; it does not deindex it. Without this, every cached
  // search result and every inbound recruiting link lands on Next's built-in
  // 404 — no nav, no footer, no branding, no way back into the site.
  //
  // Both forms are listed because `:path*` matching the bare parent is not
  // something to rely on. `permanent: true` emits 308 rather than 301 on this
  // version of Next; Google honours it as permanent either way.
  async redirects() {
    return [
      { source: '/careers', destination: '/', permanent: true },
      { source: '/careers/:path*', destination: '/', permanent: true },

      // ── /5-pack → /court-packs (2026-10-22) ────────────────────────────────
      // Aniket, 2026-10-22: the product is "court packs" now, in two sizes, so the buy page
      // and its terms moved (lib/booking.ts PACK_PATH, PACK_TERMS_PATH). Nothing public ever
      // linked /5-pack (PACKS_LIVE was never on, the page was noindex and out of the
      // sitemap), but the platform builds three links from ITS copy of the paths — Stripe's
      // cancel_url, the desk Checkout's consent line and the booking form's buy link — so
      // these cover the minutes the two deploys disagree, and any Checkout made before the
      // app moved. Permanent (308), as decided: the old name is not coming back. Next passes
      // the query through, so /5-pack?sport=<id> lands on /court-packs?sport=<id> with its
      // tile picked. One exact rule per page: there is nothing else under /5-pack.
      { source: '/5-pack', destination: '/court-packs', permanent: true },
      { source: '/5-pack/terms', destination: '/court-packs/terms', permanent: true },

      // ── /pay → the pay page in the Orangish app (2026-10-15) ───────────────
      // The address Aniket's Gmail footer prints ("Pay online: extonsports.com/pay ·
      // Zelle or card"). The page itself lives in orangish-app (/pay/exton-sports), in
      // this site's look, because money, Stripe, receipts and the record of each payment
      // stay in the one system that already handles them; this site stays a brochure.
      //
      // ABOVE the apex -> www rule on purpose: the first match wins, so both hosts go
      // straight to the app in ONE hop instead of apex -> www -> app.
      //
      // permanent: false (307), NOT 308: browsers cache a 308 indefinitely, and the club
      // front-doors plan may move the app's URL. No ?theme= is carried — the Gmail link
      // has none — so the page falls back to its own cookie, then to light, as the
      // booking page does. Not in app/sitemap.ts: it is a redirect, not a page.
      { source: '/pay', destination: 'https://app.orangish.io/pay/exton-sports', permanent: false },

      // ── ONE CANONICAL HOST: www ────────────────────────────────────────────
      // Until 2026-09-30 the apex and www BOTH served 200 with no redirect
      // between them, while the site declared the APEX canonical (metadataBase,
      // robots host, sitemap) — so a visitor arriving on www got pages whose own
      // canonical pointed at a different hostname, and the same content lived at
      // two addresses.
      //
      // ⚠️ THE DIRECTION IS www, NOT apex, AND IT IS NOT A STYLE CHOICE. The
      // A2P 10DLC customer profile registers https://www.extonsports.com and is
      // `twilio-approved`. Editing an approved profile risks pushing it back into
      // review, which would cost far more than the code churn of moving the
      // site's canonical to match it. So the registration is fixed and the site
      // moves. The sibling squashtigers.com is already apex -> www for the same
      // reason. The A2P campaign was rejected on 2026-09-30 (errors 30908 and
      // 30882) with the split still in place; whether the split caused it is
      // unproven, but a vetter following the registered URL must not land on a
      // page that disclaims its own hostname.
      //
      // Everything the site asserts about itself moved with this in the same
      // commit: metadataBase and the OpenGraph + JSON-LD urls in app/layout.tsx,
      // and host + sitemap in app/robots.ts, and the base in app/sitemap.ts.
      // Change one without the others and the contradiction is simply relocated.
      //
      // Outbound links that still name the apex — the QR code, the reception TV
      // card, the email templates — are deliberately LEFT ALONE. They are
      // printed or already sent, they cost one 308 hop, and rewriting a QR
      // target nobody can re-print is worse than the hop.
      //
      // If this ever needs inverting, the order is: change the Twilio customer
      // profile website first, wait for it to re-approve, then move the site.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'extonsports.com' }],
        destination: 'https://www.extonsports.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
