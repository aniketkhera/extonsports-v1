import type { ReactNode } from "react";
import ReceptionBoard from "../reception/ReceptionBoard";
import ExitScreen from "../exit/ExitScreen";
import { tvScreen, type TvContent, type TvEntry, type TvId } from "./tv-screens";

/* One TV's page: whatever its entry in tv-screens.ts says it shows (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   A server component that adds nothing to the DOM. It returns the content's own
   component exactly as that content's page renders it, so /vestibule draws the
   same pixels as /reception, and /outside the same as /exit. This was measured
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

   THE HEARTBEAT GOES HERE, ONCE (feat/screen-heartbeat, when it is rebased onto
   this): one small client component next to the content, named by the TV,
       <><TvHeartbeat page={tv.id} />{RENDER[tv.shows](tv)}</>
   with the hook taken out of ReceptionBoard. Then every TV route beats under its
   own name whatever it shows, and a promo swapped in by one `shows:` line cannot
   leave a keyed TV silent. A silent keyed TV is relaunched by tv-keeper's watchdog
   and may then be power-cycled. A hook inside each content component instead
   would make /vestibule beat as "reception" and /outside as "exit". */

const RENDER: Record<TvContent, (tv: TvEntry) => ReactNode> = {
  "court-board": () => <ReceptionBoard />,
  "starter-pack": () => <ExitScreen />,
};

export default function TvScreen({ id }: { id: TvId }) {
  const tv = tvScreen(id);
  return RENDER[tv.shows](tv);
}
