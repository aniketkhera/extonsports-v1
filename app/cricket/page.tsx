import TvScreen from '../components/TvScreen'
import { tvMetadata, tvViewport } from '../components/tv-screens'

/* The Amazon Fire TV by the cricket lanes (2026-10-28).
   ──────────────────────────────────────────────────────────────────────────
   WHAT IT SHOWS IS NOT DECIDED HERE. That is its entry in
   app/components/tv-screens.ts (TV_SCREENS): today the cricket box of the court board,
   alone and larger (app/reception/SportBoard.tsx).

   Not indexed and not in sitemap.ts: it is furniture, not a page. */

export const metadata = tvMetadata('cricket')
export const viewport = tvViewport('cricket')

export default function CricketPage() {
  return <TvScreen id="cricket" />
}
