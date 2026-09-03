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
    ];
  },
};

export default nextConfig;
