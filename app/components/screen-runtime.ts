import { launchTagFrom, versionFromScripts } from "./screen-pure";

/* What this one document load of a wall screen knows about itself (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────────
   One per page load, shared by three readers: useReloadOnDeploy (which deployment it
   loaded, and that it asked to reload), useScreenHeartbeat (all of it, every minute, to
   the platform) and ScreenStamp (the version and load time in a corner). A module
   singleton rather than React state because it is not render state — it is facts about
   the document that outlive any component, which is also why ScreenStamp reads it as an
   external store (the ticker.ts pattern) and nothing sets state from an effect.

   CREATED LAZILY, NEVER AT MODULE LOAD. This module is imported by "use client"
   components, which are still rendered on the server, where there is no window,
   document or meaningful clock. The first call to screenRuntime() — always from an
   effect or a store subscription, so always in a browser — creates it.

   `instance` is what the platform keys a heartbeat row on, per page LOAD: the old page
   in the 2026-10-17 freeze and the new one tv-keeper was trying to launch would have
   been two instances, which is exactly how the platform tells "the launch was taken"
   from "the old page is still running" (along with `launchTag`). */

export type ScreenRuntime = {
  instance: string;
  /** Wall-clock ms at document load (Date.now() - performance.now()). TV clock. */
  loadedAtMs: number;
  /** tv-keeper's `?k=<13 digits>` this document was launched with, or null. */
  launchTag: string | null;
  /** The deployment of the JS actually running (script ?dpl=), else the first poll answer. */
  loadedVersion: string | null;
  /** True when loadedVersion came from /api/screen-version rather than the scripts. */
  versionFromPoll: boolean;
  /** The last /api/screen-version answer. */
  latestVersion: string | null;
  /** performance.now() when useReloadOnDeploy called location.reload(), or null. */
  reloadRequestedPerf: number | null;
};

export type Snapshot = {
  version: string | null;
  latestVersion: string | null;
  loadedAtMs: number;
  /** A board key was found — this is a paired TV, not a passer-by's phone. */
  keyed: boolean;
  /** ?diag in the URL: show the stamp without a key, for checking a layout. */
  diag: boolean;
};

let rt: ScreenRuntime | null = null;
let keyed = false;
let diag = false;
let snap: Snapshot | null = null;
const subs = new Set<() => void>();

/* crypto.randomUUID needs a secure context, which the TVs have (https) and a LAN
   preview may not. The fallback only has to be unique per load and match the
   platform's ^[A-Za-z0-9-]{8,40}$ — 32 hex characters does. */
function newInstance(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/** Replace the snapshot (a NEW object, so useSyncExternalStore sees the change) and tell subscribers. */
function publish(): void {
  if (!rt) return;
  snap = { version: rt.loadedVersion, latestVersion: rt.latestVersion, loadedAtMs: rt.loadedAtMs, keyed, diag };
  subs.forEach((f) => f());
}

export function screenRuntime(): ScreenRuntime {
  if (rt) return rt;
  let search = "";
  let href = "";
  let srcs: string[] = [];
  try { search = window.location.search; href = window.location.href; } catch { /* no window */ }
  try { srcs = Array.from(document.scripts, (s) => s.src); } catch { /* no document */ }
  const perf = typeof performance !== "undefined" ? performance.now() : 0;
  rt = {
    instance: newInstance(),
    loadedAtMs: Date.now() - perf,
    launchTag: launchTagFrom(search),
    loadedVersion: versionFromScripts(srcs, href || "https://invalid.invalid/"),
    versionFromPoll: false,
    latestVersion: null,
    reloadRequestedPerf: null,
  };
  try { diag = new URLSearchParams(search).has("diag"); } catch { /* not diag */ }
  publish();
  return rt;
}

/** Every successful /api/screen-version answer. The first one stands in for the loaded
 *  version when no script carried ?dpl= (see versionFromScripts). */
export function noteVersionSeen(v: string): void {
  const r = screenRuntime();
  let changed = r.latestVersion !== v;
  r.latestVersion = v;
  if (r.loadedVersion === null) {
    r.loadedVersion = v;
    r.versionFromPoll = true;
    changed = true;
  }
  if (changed) publish();
}

/** useReloadOnDeploy is about to call location.reload(). A page still beating long after
 *  this is a browser that could not reload — the 2026-10-17 freeze queued exactly so. */
export function noteReloadRequested(): void {
  const r = screenRuntime();
  if (r.reloadRequestedPerf === null) r.reloadRequestedPerf = performance.now();
}

/** A board key was read: this is a paired screen, so the stamp shows. */
export function noteKeyed(): void {
  if (keyed) return;
  keyed = true;
  publish();
}

/* The external-store trio for ScreenStamp. subscribe() creates the runtime if nothing
   has yet, so a stamp never waits on another hook's effect to have something to show;
   React re-reads getSnapshot after subscribing, so the creation is picked up. */
export function subscribe(cb: () => void): () => void {
  screenRuntime();
  subs.add(cb);
  return () => { subs.delete(cb); };
}

/** The cached snapshot — the same object until something changes; null before creation. */
export function getSnapshot(): Snapshot | null {
  return snap;
}

/** The server render (and the first client render) draws no stamp, so they agree. */
export function getServerSnapshot(): null {
  return null;
}
