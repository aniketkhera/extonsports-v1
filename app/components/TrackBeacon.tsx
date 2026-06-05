"use client";

import { useEffect } from "react";

// Fires once per page load → /api/track, capturing path + referrer + UTM.
// Geo (region/country/city) is added server-side from Vercel edge headers.
// Fully fire-and-forget; uses sendBeacon when available so it survives the
// page being closed mid-request.
export default function TrackBeacon() {
  useEffect(() => {
    try {
      // Never log admin traffic — only public-site visits.
      if (window.location.pathname.startsWith("/admin")) return;
      const params = new URLSearchParams(window.location.search);
      const payload = JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || null,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
      });

      // navigator.sendBeacon is ideal — non-blocking, survives unload.
      // Falls back to fetch with keepalive if unavailable.
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // never let analytics break the page
    }
  }, []);

  return null;
}
