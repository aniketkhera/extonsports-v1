import TvScreen from '../components/TvScreen'
import { tvMetadata, tvViewport } from '../components/tv-screens'

/* The vestibule TV's own address: the 75" VIZIO W4K75M (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   WHAT IT SHOWS IS NOT DECIDED HERE. That is its entry in
   app/components/tv-screens.ts (TV_SCREENS), which also explains how to add a TV
   by copying this file. Today it shows the court board, the same picture as
   /reception.

   ⛔ NAMES: decided server-side by the KEY in the TV's URL fragment, never by this
   route. The vestibule's key has names_visible off, so its board names nobody.
   Opened with no key, this is the public view, as /reception is.

   Until tv-keeper on the N95 is re-pointed here, the set loads /reception with its
   own key. That draws the same thing.

   Not indexed and not in sitemap.ts: it is furniture, not a page. */

export const metadata = tvMetadata('vestibule')
export const viewport = tvViewport('vestibule')

export default function VestibulePage() {
  return <TvScreen id="vestibule" />
}
