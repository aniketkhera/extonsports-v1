import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['mailer-admin'],

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
