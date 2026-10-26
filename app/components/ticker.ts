import { useSyncExternalStore } from "react";

/* A clock as an EXTERNAL STORE, not as state set from an effect.
   ──────────────────────────────────────────────────────────────────────────
   Time is not React state — it is an outside system that changes on its own,
   which is precisely what useSyncExternalStore is for. Doing it the obvious
   way (useState + setState inside useEffect) trips react-hooks/set-state-in-
   effect and causes a cascading render on every mount; /board still has that
   shape and should be moved onto this when its clock is next touched.

   The snapshot is 0 until something subscribes, and getServerSnapshot returns
   0 too, so the server and the first client render agree and there is no
   hydration mismatch. The interval is shared by every subscriber and is torn
   down when the last one leaves, which matters on a screen that stays open
   for weeks.

   Moved here from app/reception/ReceptionBoard.tsx on 2026-10-10, when the
   outside TV's /comingsoon needed the same clock for its date line. Two copies
   of this would be two chances to get the snapshot rule below wrong. */
/* `align` (2026-10-25, for the reception board's OFF COURT countdown): tick ON the
   wall clock's boundaries — every whole second, every :00/:15/:30/:45 — instead of
   every `ms` from whenever the page happened to load. A plain interval keeps the
   phase of the load, so a countdown read "0:01" for up to a second after the booking
   had ended, and the board's 15 s "now" could flip a booking up to 15 s late.
   Bookings end on whole minutes, so an aligned quarter-minute tick lands on the very
   second each one ends. Each tick re-aims at the next boundary (+ ALIGN_SLACK_MS, so
   a timer that fires a hair early cannot read the instant before it), so it never
   drifts the way a long-running setInterval does. */
const ALIGN_SLACK_MS = 5;

export function makeTicker(ms: number, { align = false }: { align?: boolean } = {}) {
  let snapshot = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const subs = new Set<() => void>();
  const fire = () => {
    snapshot = Date.now();
    subs.forEach((f) => f());
  };
  const aim = () => {
    timer = setTimeout(() => { fire(); if (timer) aim(); }, ms - (Date.now() % ms) + ALIGN_SLACK_MS);
  };
  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      if (!timer) {
        snapshot = Date.now();
        if (align) aim();
        else timer = setInterval(fire, ms);
      }
      return () => {
        subs.delete(cb);
        /* clearTimeout and clearInterval clear the same list of timers (HTML spec),
           so either kind of handle goes with one call. */
        if (!subs.size && timer) { clearTimeout(timer); timer = null; }
      };
    },
    /* Must be referentially stable between calls within one render pass, which
       it is: only the interval ever writes it. Returning Date.now() here would
       loop forever. */
    get: () => snapshot,
    getServer: () => 0,
  };
}

export type Ticker = ReturnType<typeof makeTicker>;

export function useTick(t: Ticker): number {
  return useSyncExternalStore(t.subscribe, t.get, t.getServer);
}
