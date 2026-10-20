import type { Metadata } from 'next'
import ExitScreen from './ExitScreen'
import { contentViewport } from '../components/tv-screens'

/* The Squash Starter Pack screen, at its own address: the PREVIEW / LEGACY URL.
   ──────────────────────────────────────────────────────────────────────────
   Added 2026-10-20 for promotions, starting with the Squash Starter Pack, on the
   32" VIZIO WHD32M facing the EXIT door. The TV was the "outside" screen
   (/comingsoon) until Aniket moved it indoors.

   ⚠️ FROM 2026-10-20 THE TV'S ADDRESS IS /outside, NOT THIS ONE. Each TV got an
   address of its own that day (app/components/tv-screens.ts), and /outside shows
   this same screen for as long as that TV's `shows:` says "starter-pack". This
   address stays as the promotion's own: something to open on a laptop or a phone
   to look at it, and the TV's URL until tv-keeper is re-pointed at /outside.
   Once it is, no TV loads /exit, and swapping the promo on the wall never needs
   this file.

   Not indexed and not in sitemap.ts: it is furniture, not a page, the same as the
   TV routes and /comingsoon. */

export const metadata: Metadata = {
  title: 'Exit screen',
  robots: { index: false, follow: false },
}

/* The dark ground the screen paints. It comes from the registry, so /outside's
   <head> cannot drift from this one. */
export const viewport = contentViewport('starter-pack')

export default function ExitPage() {
  return <ExitScreen />
}
