"use client";

import useScreenHeartbeat from "./useScreenHeartbeat";
import type { ScreenPage } from "./screen-pure";

/* The heartbeat as a component that draws nothing (2026-10-20), so a SERVER page can
   put it next to its content: TvScreen.tsx for every TV route, named by the TV
   (page={tv.id}), and app/exit/page.tsx as "exit". All it does is call
   useScreenHeartbeat(page) — keyed screens only, see the hook — and return null, so
   the page's DOM and pixels are exactly what they were without it.

   ONE PER PAGE. It sits beside the content, never inside it, so the name is the
   ADDRESS's: the court board on /vestibule beats as "vestibule", the Starter Pack on
   /outside as "outside", and a promo swapped in by one `shows:` line in
   tv-screens.ts beats under the TV's name without anybody remembering to add it. A
   content component that also called the hook would beat twice a minute under two
   names (screen-pure.test.mjs checks that none does). /board and /comingsoon call
   the hook themselves: each is its own only content. */
export default function ScreenHeartbeat({ page }: { page: ScreenPage }) {
  useScreenHeartbeat(page);
  return null;
}
