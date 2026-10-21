import TvScreen from '../components/TvScreen'
import { tvMetadata, tvViewport } from '../components/tv-screens'

/* The vestibule TV's own address: the 75" VIZIO W4K75M (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   WHAT IT SHOWS IS NOT DECIDED HERE. That is its entry in
   app/components/tv-screens.ts (TV_SCREENS), which also explains how to add a TV
   by copying this file. From 2026-10-21 it shows a layout of its own: the bookings
   down the left and the promotions rotating on the right
   (app/vestibule/VestibuleScreen.tsx). Until then it was the court board, the
   same picture as /reception.

   ⛔ NAMES: decided server-side by the KEY in the TV's URL fragment, never by this
   route. The vestibule's key has names_visible off, so its board names nobody.
   Opened with no key, this is the public view, as /reception is.

   The set loads this address with its own key: on 2026-10-21 its heartbeats
   arrived as page "vestibule" (board_screen_beats), so a deploy reaches it.

   Not indexed and not in sitemap.ts: it is furniture, not a page. */

export const metadata = tvMetadata('vestibule')
export const viewport = tvViewport('vestibule')

export default function VestibulePage() {
  return <TvScreen id="vestibule" />
}
