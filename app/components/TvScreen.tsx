import type { ReactNode } from "react";
import ReceptionBoard from "../reception/ReceptionBoard";
import ExitScreen from "../exit/ExitScreen";
import VestibuleScreen from "../vestibule/VestibuleScreen";
import ScreenHeartbeat from "./ScreenHeartbeat";
import { tvScreen, type TvContent, type TvEntry, type TvId } from "./tv-screens";

/* One TV's page: whatever its entry in tv-screens.ts says it shows (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   A server component that adds nothing to the DOM. It returns the content's own
   component exactly as that content's page renders it, so /outside draws the same
   pixels as /exit, and /reception's board would draw the same on any TV given
   "court-board". (From 2026-10-21 /vestibule shows "board-and-promos",
   VestibuleScreen, which has no page of its own.) This was measured
   when these routes went in, at 1920x1080 (with JS on, and the first paint with
   JS off), 1366x768 and 390x844. The pages matched, apart from one or two
   antialiased edge pixels that also differ between two runs of unchanged code.
   The production HTML matched too, apart from the <title>.

   Every TV route imports every content component. That is the price of switching a
   TV with one line in tv-screens.ts. The content that is not shown changes nothing
   on screen: its CSS module is scoped, and a production build already ships the
   same two stylesheets to every page. It does cost JS. Measured in production
   builds on 2026-10-20, each TV page loads 608 KB of JS (193 KB gzipped). That is
   8 KB more than /reception loaded before (2.5 KB gzipped), and 35 KB more than
   /exit (12 KB gzipped), because /outside carries the court board as well. A TV
   loads it once per launch.

   Each renderer gets the TV's entry, typed TvEntry so that tv.id is the TvId union
   and not a string. Nothing reads it yet. It is there for a prop that must differ
   per TV.

   THE HEARTBEAT IS HERE, ONCE (2026-10-20): <ScreenHeartbeat page={tv.id} /> next
   to the content, a client component that draws nothing, and no content component
   calls the hook itself. So every TV route beats under its own name whatever it
   shows (/vestibule as "vestibule", /outside as "outside" while it shows the
   Starter Pack), and a promo swapped in by one `shows:` line cannot leave a keyed
   TV silent. A silent keyed TV is relaunched by tv-keeper's watchdog and may then
   be power-cycled. A hook inside each content component instead would make
   /vestibule beat as "reception" and /outside as "exit". tv.id is typed TvId and
   the prop ScreenPage, so a TV missing from the platform's page list
   (screen-pure.ts SCREEN_PAGES) fails tsc here. Keyed screens only; without a key
   it sends nothing and the page is exactly what it was. */

const RENDER: Record<TvContent, (tv: TvEntry) => ReactNode> = {
  "court-board": () => <ReceptionBoard />,
  "starter-pack": () => <ExitScreen />,
  "board-and-promos": () => <VestibuleScreen />,
};

export default function TvScreen({ id }: { id: TvId }) {
  const tv = tvScreen(id);
  return (
    <>
      <ScreenHeartbeat page={tv.id} />
      {RENDER[tv.shows](tv)}
    </>
  );
}
