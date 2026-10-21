/* What keeps the screen heartbeat honest, 2026-10-20.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test, on the .ts sources directly; see package.json and
   app/board/board-lib.test.mjs for why this repo has no test runner)

   Why committed: the heartbeat body is a contract with the platform (orangish-app
   lib/screen-watch.ts parseBeat), and every way of breaking it passes `tsc`. Rename a
   field, send 412.7 where an integer is due, or let a 43-char key be read as a launch
   tag, and the platform answers 400 — a screen it then believes is silent, and a TV
   tv-keeper may power-cycle for nothing. The readKey memo at the bottom is the other
   quiet one: without it, a second reader on a page whose localStorage throws gets
   null, and that screen simply stops beating. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Same resolver as board-lib.test.mjs: the sources import extensionless, the way the
   Next bundler resolves. Registered before the sources load. */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? ".ts" : ".js"), context);
    }
  },
});

const P = await import("./screen-pure.ts");

const KEY = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"; // 43 chars, the key alphabet
assert.equal(KEY.length, 43);
const TAG = "1760753163885";
const DPL = "dpl_4AyGuPBgWPYk2edvvMTh4jNMKcNi";

/* ── launchTagFrom ─────────────────────────────────────────────────────────── */

test("launchTagFrom: a 13-digit ?k= is the tag", () => {
  assert.equal(P.launchTagFrom(`?k=${TAG}`), TAG);
  assert.equal(P.launchTagFrom(`?diag=1&k=${TAG}`), TAG);
});

test("launchTagFrom: anything that is not exactly 13 digits is null — a key included", () => {
  assert.equal(P.launchTagFrom("?k=1"), null);
  assert.equal(P.launchTagFrom("?k=abc"), null);
  assert.equal(P.launchTagFrom(`?k=${KEY}`), null);
  assert.equal(P.launchTagFrom(`?k=${TAG}0`), null); // 14 digits
  assert.equal(P.launchTagFrom(""), null);
  assert.equal(P.launchTagFrom("?diag=1"), null);
});

/* ── versionFromScripts ────────────────────────────────────────────────────── */

test("versionFromScripts: picks ?dpl= from relative and absolute srcs", () => {
  const base = "https://www.extonsports.com/reception";
  assert.equal(P.versionFromScripts([`/_next/static/chunks/a.js?dpl=${DPL}`], base), DPL);
  assert.equal(P.versionFromScripts([`https://www.extonsports.com/_next/static/chunks/a.js?dpl=${DPL}`], base), DPL);
  // Inline scripts have an empty src; they are skipped, not fatal.
  assert.equal(P.versionFromScripts(["", "/x.js", `/_next/b.js?dpl=${DPL}`], base), DPL);
});

test("versionFromScripts: ignores bad values and is null when there are none", () => {
  const base = "https://www.extonsports.com/reception";
  assert.equal(P.versionFromScripts(["/_next/a.js?dpl=bad%20id", "/_next/b.js?dpl="], base), null);
  assert.equal(P.versionFromScripts([`/_next/a.js?dpl=${"x".repeat(65)}`], base), null);
  assert.equal(P.versionFromScripts(["/_next/a.js", "/_next/b.js?v=1"], base), null);
  assert.equal(P.versionFromScripts([], base), null);
  // A later good one is still found after a bad one.
  assert.equal(P.versionFromScripts(["/_next/a.js?dpl=no!", `/_next/b.js?dpl=${DPL}`], base), DPL);
});

/* ── buildBeat ─────────────────────────────────────────────────────────────── */

const input = (over = {}) => ({
  instance: "3b2f6c1e-8d4a-4f0e-9a51-0c7d2e9b1a44",
  page: "reception",
  seq: 7,
  launchTag: TAG,
  version: DPL,
  latestVersion: DPL,
  nowPerf: 365_120.4,
  loadedAtMs: Date.parse("2026-10-20T15:48:13.402Z"),
  lastFramePerf: 364_708.2,
  framesInWindow: 60,
  visibility: "visible",
  reloadRequestedPerf: null,
  ...over,
});

const BEAT_KEYS = [
  "v", "instance", "page", "seq", "launch_tag", "version", "latest_version", "uptime_ms",
  "loaded_at", "frames_age_ms", "frames_in_window", "visibility", "reload_requested_ms_ago",
].sort();

test("buildBeat: exactly the contract's keys, v 1, the documented example", () => {
  const b = P.buildBeat(input());
  assert.deepEqual(Object.keys(b).sort(), BEAT_KEYS);
  assert.deepEqual(b, {
    v: 1,
    instance: "3b2f6c1e-8d4a-4f0e-9a51-0c7d2e9b1a44",
    page: "reception",
    seq: 7,
    launch_tag: TAG,
    version: DPL,
    latest_version: DPL,
    uptime_ms: 365120,
    loaded_at: "2026-10-20T15:48:13.402Z",
    frames_age_ms: 412,
    frames_in_window: 60,
    visibility: "visible",
    reload_requested_ms_ago: null,
  });
});

test("buildBeat: frames_age_ms is null before the first frame, an integer after", () => {
  assert.equal(P.buildBeat(input({ lastFramePerf: null })).frames_age_ms, null);
  const age = P.buildBeat(input({ nowPerf: 1000.6, lastFramePerf: 0.1 })).frames_age_ms;
  assert.ok(Number.isInteger(age));
  assert.equal(age, 1001);
});

test("buildBeat: reload_requested_ms_ago is null or a non-negative integer", () => {
  assert.equal(P.buildBeat(input()).reload_requested_ms_ago, null);
  assert.equal(P.buildBeat(input({ nowPerf: 200_000, reloadRequestedPerf: 49_999.5 })).reload_requested_ms_ago, 150_001);
  // A clock that seems to run backwards is 0, never negative.
  assert.equal(P.buildBeat(input({ nowPerf: 10, reloadRequestedPerf: 20 })).reload_requested_ms_ago, 0);
});

test("buildBeat: every number lands inside the platform's bounds", () => {
  const huge = P.buildBeat(input({
    seq: 99_999_999, nowPerf: 9e12, lastFramePerf: 0, framesInWindow: 1e9, reloadRequestedPerf: 0,
  }));
  assert.equal(huge.seq, 10_000_000);
  assert.equal(huge.uptime_ms, 31_536_000_000);
  assert.equal(huge.frames_age_ms, 2_147_483_647);
  assert.equal(huge.reload_requested_ms_ago, 2_147_483_647);
  assert.equal(huge.frames_in_window, 100_000);
  const tiny = P.buildBeat(input({ seq: 0, nowPerf: -5, framesInWindow: -1 }));
  assert.equal(tiny.seq, 1);
  assert.equal(tiny.uptime_ms, 0);
  assert.equal(tiny.frames_in_window, 0);
  const odd = P.buildBeat(input({ seq: NaN, nowPerf: NaN, lastFramePerf: 3 }));
  assert.equal(odd.seq, 1);
  assert.equal(odd.uptime_ms, 0);
  assert.equal(odd.frames_age_ms, null);
  for (const k of ["seq", "uptime_ms", "frames_in_window"]) assert.ok(Number.isInteger(huge[k]) && Number.isInteger(tiny[k]));
});

test("buildBeat: an invalid tag, version, visibility or load time is null, not sent", () => {
  const b = P.buildBeat(input({
    launchTag: KEY, version: "dpl bad", latestVersion: "", visibility: "unloaded", loadedAtMs: NaN,
  }));
  assert.equal(b.launch_tag, null);
  assert.equal(b.version, null);
  assert.equal(b.latest_version, null);
  assert.equal(b.visibility, null);
  assert.equal(b.loaded_at, null);
  assert.equal(P.buildBeat(input({ visibility: "hidden" })).visibility, "hidden");
  assert.equal(P.buildBeat(input({ visibility: null })).visibility, null);
});

/* ── stampText ─────────────────────────────────────────────────────────────── */

test("stampText: last six of the version, then MMM DD HH:MM in the club's zone", () => {
  // 15:38Z is 11:38 EDT on 20 Oct 2026.
  assert.equal(P.stampText(DPL, Date.parse("2026-10-20T15:38:00Z"), "America/New_York"), "NMKcNi · OCT 20 11:38");
  // Midnight is 00, not 24; a single-digit day is padded.
  assert.equal(P.stampText(DPL, Date.parse("2026-11-03T05:05:00Z"), "America/New_York"), "NMKcNi · NOV 03 00:05");
});

test("stampText: ------ when the version is unknown; a placeholder for a bad time", () => {
  assert.equal(P.stampText(null, Date.parse("2026-10-20T15:38:00Z"), "America/New_York"), "------ · OCT 20 11:38");
  assert.equal(P.stampText(DPL, NaN, "America/New_York"), "NMKcNi · --- -- --:--");
});

/* ── shouldSeedFromLoaded ──────────────────────────────────────────────────── */

test("shouldSeedFromLoaded: only when both are Vercel deployment ids", () => {
  const sha = "8c67115a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e";
  assert.equal(P.shouldSeedFromLoaded(DPL, DPL), true);
  assert.equal(P.shouldSeedFromLoaded(DPL, "dpl_other"), true);
  assert.equal(P.shouldSeedFromLoaded(DPL, sha), false);
  assert.equal(P.shouldSeedFromLoaded(DPL, "local"), false);
  assert.equal(P.shouldSeedFromLoaded(null, DPL), false);
  assert.equal(P.shouldSeedFromLoaded("local", "local"), false);
  assert.equal(P.shouldSeedFromLoaded(sha, DPL), false);
});

/* ── Which page a beat names, and that each page beats once (2026-10-20) ───────
   Each TV got an address of its own that day (tv-screens.ts), and a beat carries the
   ADDRESS's name: /reception "reception", /vestibule "vestibule", /outside "outside"
   (whatever it shows), /exit "exit", /board "board", /comingsoon "comingsoon". The
   platform refuses any other name with a 400, which it cannot tell from a silent TV;
   and a page that beat from two places would send two rows a minute under two names. */

test("SCREEN_PAGES is exactly the platform's list, in its order", () => {
  // orangish-app lib/screen-watch.ts SCREEN_PAGES (feat/screen-watchdog 490cdcdd, PR #660)
  // and the board_screen_beats.page CHECK in supabase/migrate_board_screen_watch.sql.
  // Change one, change all three — the platform deployed first.
  assert.deepEqual([...P.SCREEN_PAGES], ["reception", "vestibule", "outside", "exit", "board", "comingsoon"]);
});

test("every screen address has a page name: SCREEN_PAGES is SCREEN_PATHS without the slash", async () => {
  const T = await import("./tv-screens.ts");
  for (const tv of T.TV_SCREENS) {
    assert.ok(P.SCREEN_PAGES.includes(tv.id), `TV "${tv.id}" is not in SCREEN_PAGES: its beats would be a 400`);
  }
  assert.deepEqual(
    [...T.SCREEN_PATHS].map((p) => p.replace(/^\//, "")).sort(),
    [...P.SCREEN_PAGES].sort(),
    "a screen address with no page name (or a name with no address)",
  );
});

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Every .ts/.tsx source under app/, tests excluded, with its comments stripped (a
 *  comment may quote a call; only code counts). `//` counts as a comment only at the
 *  start of a line or after a space, so "https://…" in a string survives. */
function appSources() {
  const out = [];
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const f = path.join(dir, n);
      if (statSync(f).isDirectory()) walk(f);
      else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) {
        const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
        out.push([path.relative(APP, f).split(path.sep).join("/"), code]);
      }
    }
  };
  walk(APP);
  return out;
}

test("the heartbeat is sent from exactly these places, once each, under these names", () => {
  const found = {};
  for (const [rel, code] of appSources()) {
    const calls = [
      ...[...code.matchAll(/(?<!function )\buseScreenHeartbeat\(([^)]*)\)/g)].map((m) => `useScreenHeartbeat(${m[1].trim()})`),
      ...[...code.matchAll(/<ScreenHeartbeat\b([^>]*?)\/>/g)].map((m) => `<ScreenHeartbeat ${m[1].trim()} />`),
    ];
    if (calls.length) found[rel] = calls;
  }
  assert.deepEqual(found, {
    // The TV routes (/reception, /vestibule, /outside): ONE beat, beside the content,
    // named by the TV whatever it shows.
    "components/TvScreen.tsx": ["<ScreenHeartbeat page={tv.id} />"],
    // The Starter Pack's preview address, and the exit-door set's URL until re-pointed.
    "exit/page.tsx": ['<ScreenHeartbeat page="exit" />'],
    // Each its own page's only content.
    "board/CourtBoard.tsx": ['useScreenHeartbeat("board")'],
    "comingsoon/ComingSoon.tsx": ['useScreenHeartbeat("comingsoon")'],
    // The component itself.
    "components/ScreenHeartbeat.tsx": ["useScreenHeartbeat(page)"],
  }, "a content component that beats too would make its page beat twice, under two names");
});

test("TvScreen renders the heartbeat beside whatever the TV shows, not inside it", () => {
  const src = readFileSync(path.join(APP, "components", "TvScreen.tsx"), "utf8");
  assert.match(src, /<ScreenHeartbeat page=\{tv\.id\} \/>\s*\{RENDER\[tv\.shows\]\(tv\)\}/);
  // The content components a TV can show carry no heartbeat of their own.
  for (const rel of ["reception/ReceptionBoard.tsx", "exit/ExitScreen.tsx", "exit/WorkshopHero.tsx"]) {
    const code = appSources().find(([r]) => r === rel)[1];
    assert.doesNotMatch(code, /useScreenHeartbeat|ScreenHeartbeat/, `${rel} must not beat: TvScreen does`);
  }
});

/* ── screen-runtime ────────────────────────────────────────────────────────────
   Not pure, but small enough to pin with a stub window/document: the version the
   SCRIPTS say wins over a poll (the F1 fix rests on that), the snapshot is the same
   object until something changes (useSyncExternalStore loops otherwise), and nothing
   exists until first use (it is imported by components the server renders). Each
   test imports its own module instance (?a, ?b) because the runtime is per load. */
function stubDocument(search, scripts) {
  globalThis.window = { location: { search, href: `https://www.extonsports.com/reception${search}` } };
  globalThis.document = { scripts: scripts.map((src) => ({ src })) };
}
function unstubDocument() {
  delete globalThis.window;
  delete globalThis.document;
}

test("screen-runtime: created lazily from the document; scripts beat polls; stable snapshot", async () => {
  stubDocument(`?diag=1&k=${TAG}`, ["", `https://www.extonsports.com/_next/static/chunks/a.js?dpl=${DPL}`]);
  try {
    const R = await import("./screen-runtime.ts?a");
    assert.equal(R.getSnapshot(), null, "nothing at module load");
    assert.equal(R.getServerSnapshot(), null);
    const rt = R.screenRuntime();
    assert.equal(R.screenRuntime(), rt, "one per document load");
    assert.equal(rt.launchTag, TAG);
    assert.equal(rt.loadedVersion, DPL);
    assert.equal(rt.versionFromPoll, false);
    assert.match(rt.instance, /^[A-Za-z0-9-]{8,40}$/);

    let calls = 0;
    const off = R.subscribe(() => calls++);
    const s1 = R.getSnapshot();
    assert.deepEqual(s1, { version: DPL, latestVersion: null, loadedAtMs: rt.loadedAtMs, keyed: false, diag: true });
    assert.equal(R.getSnapshot(), s1, "the same object until something changes");

    R.noteVersionSeen("dpl_newer");
    assert.equal(rt.loadedVersion, DPL, "a poll never overrides what the running scripts say");
    assert.equal(rt.latestVersion, "dpl_newer");
    assert.notEqual(R.getSnapshot(), s1);
    assert.equal(calls, 1);
    R.noteVersionSeen("dpl_newer");
    assert.equal(calls, 1, "the same answer again is no change");

    R.noteKeyed();
    assert.equal(R.getSnapshot().keyed, true);
    assert.equal(calls, 2);

    assert.equal(rt.reloadRequestedPerf, null);
    R.noteReloadRequested();
    const at = rt.reloadRequestedPerf;
    assert.equal(typeof at, "number");
    R.noteReloadRequested();
    assert.equal(rt.reloadRequestedPerf, at, "the first request is the one that counts");
    off();
  } finally {
    unstubDocument();
  }
});

test("screen-runtime: with no ?dpl= on any script, the first poll stands in", async () => {
  stubDocument("", ["/_next/static/chunks/a.js"]);
  try {
    const R = await import("./screen-runtime.ts?b");
    const rt = R.screenRuntime();
    assert.equal(rt.loadedVersion, null);
    assert.equal(rt.launchTag, null);
    assert.equal(R.getSnapshot().diag, false);
    R.noteVersionSeen("local");
    assert.equal(rt.loadedVersion, "local");
    assert.equal(rt.versionFromPoll, true);
    R.noteVersionSeen("local2");
    assert.equal(rt.loadedVersion, "local", "only the FIRST poll stands in");
  } finally {
    unstubDocument();
  }
});

/* ── readKey memo (map F2) ─────────────────────────────────────────────────────
   The first call strips the key from the address bar. With a localStorage that
   throws, the key then exists nowhere but in that call's answer — so the second
   reader (the heartbeat, beside the page's own feed effect) must get the same one.
   Last in the file: it installs a global window, and the module's memo is for life. */
test("readKey: a second call returns the key though storage throws and the hash is gone", async () => {
  const replaced = [];
  const location = { hash: `#k=${KEY}`, pathname: "/reception", search: `?k=${TAG}` };
  globalThis.window = {
    location,
    history: {
      replaceState(_s, _t, url) {
        replaced.push(url);
        const u = new URL(url, "https://www.extonsports.com");
        location.hash = u.hash;
        location.pathname = u.pathname;
        location.search = u.search;
      },
    },
    localStorage: {
      setItem() { throw new Error("QuotaExceededError"); },
      getItem() { throw new Error("SecurityError"); },
    },
  };
  try {
    const K = await import("./screen-key.ts");
    assert.equal(K.readKey(), KEY);
    assert.equal(location.hash, "", "the key is wiped from the address bar");
    assert.equal(K.readKey(), KEY, "memoised: the second reader still gets it");
    // The launch tag in the search part survives the wipe, untouched.
    assert.deepEqual(replaced, [`/reception?k=${TAG}`]);
    assert.equal(location.search, `?k=${TAG}`);
    // And board-lib still hands out the same function.
    const L = await import("../board/board-lib.ts");
    assert.equal(L.readKey, K.readKey);
    assert.equal(L.PLATFORM, "https://app.orangish.io");
  } finally {
    delete globalThis.window;
  }
});
