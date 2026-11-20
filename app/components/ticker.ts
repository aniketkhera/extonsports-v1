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

/* Why the aligned chain cannot stop for good any more, 2026-11-19.
   ──────────────────────────────────────────────────────────────────────────
   On 19 Nov the reception and vestibule TVs showed a frozen header clock for a good
   part of an afternoon while every heartbeat said the page was healthy. The cause
   is NOT proven; the likeliest is the TV's picture freezing below a page that kept
   running, which nothing in here can fix. But the hunt found one way this file
   could freeze the clock for good, and it is closed here:

   - The chain re-aimed only if fire() RETURNED: `{ fire(); if (timer) aim(); }`.
     One throw from any subscriber (React's "Maximum update depth exceeded" is the
     one that can escape useSyncExternalStore's listener) and no next timeout was
     set. The dead handle stayed in `timer`, so a new subscriber, which only starts
     the chain when `timer` is empty, could not restart it either. That held until
     the page reloaded, which on a wall TV can be days.
   - Now each subscriber is called inside its own try/catch, so one bad
     subscriber neither stops the others nor the timer. Its error still goes to the
     page's normal error reporting (console, window "error"), so a screen that throws
     is seen, not hidden. The re-aim also sits in a `finally`.
   - And a GUARD interval watches the aligned chain. If the last tick is more
     than one period plus GUARD_EVERY_MS old, by Date.now() in either direction (a
     TV whose clock is corrected backwards re-aligns too), it ticks at once and re-aims.
     That covers a chain lost to anything not thought of here: a timeout dropped
     over a TV's standby, a throw from a place that is not a subscriber. A setInterval
     cannot die from a throw in its callback, which is why the plain (unaligned)
     mode needs no guard. Worst case on the second ticker: the clock is back within
     about 11 s.
   aim() clears any pending timeout before it sets one, so the guard, the finally and
   a re-subscribe in the middle of a tick can never leave two chains running. */
const GUARD_EVERY_MS = 5_000;

/* reportError is the browser's own "uncaught, but keep going". The setTimeout throw is
   the older way to the same place, for a TV browser that predates it. */
function report(err: unknown) {
  if (typeof reportError === "function") reportError(err);
  else setTimeout(() => { throw err; });
}

export function makeTicker(ms: number, { align = false }: { align?: boolean } = {}) {
  let snapshot = 0;
  let lastFire = 0;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let guard: ReturnType<typeof setInterval> | null = null;
  const subs = new Set<() => void>();
  const fire = () => {
    snapshot = lastFire = Date.now();
    subs.forEach((f) => {
      try { f(); } catch (err) { report(err); }
    });
  };
  const step = () => {
    try { fire(); } finally { if (running) aim(); }
  };
  const aim = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(step, ms - (Date.now() % ms) + ALIGN_SLACK_MS);
  };
  const check = () => {
    if (Math.abs(Date.now() - lastFire) > ms + GUARD_EVERY_MS) step();
  };
  return {
    subscribe(cb: () => void) {
      subs.add(cb);
      if (!running) {
        running = true;
        snapshot = lastFire = Date.now();
        if (align) {
          aim();
          guard = setInterval(check, GUARD_EVERY_MS);
        } else timer = setInterval(fire, ms);
      }
      return () => {
        subs.delete(cb);
        if (subs.size || !running) return;
        running = false;
        /* clearTimeout and clearInterval clear the same list of timers (HTML spec),
           so either kind of handle goes with one call. */
        if (timer) clearTimeout(timer);
        if (guard) clearInterval(guard);
        timer = guard = null;
      };
    },
    /* Must be referentially stable between calls within one render pass, which
       it is: only a tick (or a first subscriber) ever writes it. Returning Date.now() here would
       loop forever. */
    get: () => snapshot,
    getServer: () => 0,
  };
}

export type Ticker = ReturnType<typeof makeTicker>;

export function useTick(t: Ticker): number {
  return useSyncExternalStore(t.subscribe, t.get, t.getServer);
}
