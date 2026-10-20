import type { Metadata, Viewport } from 'next'
import ExitScreen from './ExitScreen'

/* The exit-door screen — the 32" VIZIO WHD32M facing the EXIT door.
   ──────────────────────────────────────────────────────────────────────────
   Added 2026-10-20 for promotions, starting with the Squash Starter Pack. The TV
   was the "outside" screen (/comingsoon) until Aniket moved it indoors.

   ⚠️ WHICH TV SHOWS THIS IS NOT DECIDED HERE. tv-keeper on the N95 holds the
   url per screen in tv-keeper/state/tvs.json (orangish-cameras repo). Pointing the
   exit TV at /exit means editing that file, not this one.

   Not indexed and not in sitemap.ts: it is furniture, not a page — same as
   /reception and /comingsoon. */

export const metadata: Metadata = {
  title: 'Exit screen',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0B1623',
  colorScheme: 'dark',
}

export default function ExitPage() {
  return <ExitScreen />
}
