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
export function makeTicker(ms: number) {
  let snapshot = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  const subs = new Set<() => void>();
  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      if (!timer) {
        snapshot = Date.now();
        timer = setInterval(() => {
          snapshot = Date.now();
          subs.forEach((f) => f());
        }, ms);
      }
      return () => {
        subs.delete(cb);
        if (!subs.size && timer) { clearInterval(timer); timer = null; }
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
