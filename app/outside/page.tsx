import TvScreen from '../components/TvScreen'
import { tvMetadata, tvViewport } from '../components/tv-screens'

/* The exit-door TV's own address: the 32" VIZIO WHD32M (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   It is "outside" because that is the set's name in tv-keeper. It faced the street
   until 2026-10-20 and now hangs indoors, facing the EXIT door.

   WHAT IT SHOWS IS NOT DECIDED HERE. That is its entry in
   app/components/tv-screens.ts (TV_SCREENS). Today it shows the Squash Starter Pack,
   the same picture as /exit. To change the promotion, change that entry's `shows:`
   line, not this file and not the box.

   Until tv-keeper on the N95 is re-pointed here, the set loads /exit. That draws the
   same thing.

   Not indexed and not in sitemap.ts: it is furniture, not a page. */

export const metadata = tvMetadata('outside')
export const viewport = tvViewport('outside')

export default function OutsidePage() {
  return <TvScreen id="outside" />
}
