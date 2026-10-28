/* What the TV registry promises, 2026-10-20 (app/components/tv-screens.ts).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts source; Node strips the types itself)

   Why this is a test and not just a careful reading: tsc passes every one of these
   when it is broken. A TV entry with no route folder type-checks fine and deploys a
   404 to the wall. A folder copied from app/vestibule that still says "vestibule"
   type-checks fine and puts the wrong TV's content on the new set. A list of
   screen paths kept by hand in SiteChrome type-checks fine and gives a television
   the WhatsApp bubble and a daily "visit", which is what /reception got in its
   first week. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(APP, "..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

const R = await import("./tv-screens.ts");
const TVS = R.TV_SCREENS;

test("there is a TV for each set on the wall today: reception, vestibule, outside, badminton, cricket", () => {
  // A NEW TV fails here until its id is added: step 3 of "ADDING THE NEXT TV" in
  // tv-screens.ts, whose steps 6 to 8 (pairing, the key, the platform) no test sees.
  assert.deepEqual(TVS.map((t) => t.id), ["reception", "vestibule", "outside", "badminton", "cricket"],
    "the sets on the wall changed: follow ADDING THE NEXT TV in tv-screens.ts, then add the id here");
});

test("every TV has a unique id, and its route is /<id>", () => {
  assert.equal(new Set(TVS.map((t) => t.id)).size, TVS.length);
  for (const t of TVS) {
    assert.match(t.id, /^[a-z][a-z0-9-]*$/, `${t.id}: tv-keeper names are one lower-case word`);
    assert.equal(t.route, `/${t.id}`);
  }
});

test("every TV's route is a real page folder that renders THAT TV", () => {
  for (const t of TVS) {
    const rel = `app/${t.id}/page.tsx`;
    assert.ok(existsSync(path.join(ROOT, rel)), `${rel} is missing: ${t.route} would be a 404 on the wall`);
    const page = read(rel);
    assert.ok(page.includes(`<TvScreen id="${t.id}" />`), `${rel} must render <TvScreen id="${t.id}" />`);
    assert.ok(page.includes(`tvMetadata('${t.id}')`), `${rel} must export tvMetadata('${t.id}')`);
    assert.ok(page.includes(`tvViewport('${t.id}')`), `${rel} must export tvViewport('${t.id}')`);
    // A folder copied from another TV and only half edited.
    for (const other of TVS.filter((o) => o.id !== t.id)) {
      assert.ok(!page.includes(`id="${other.id}"`) && !page.includes(`('${other.id}')`), `${rel} still names ${other.id}`);
    }
  }
});

test("the TV routes are real folders: there is no catch-all at the app root", () => {
  const dynamic = readdirSync(APP).filter((n) => n.startsWith("[") && statSync(path.join(APP, n)).isDirectory());
  assert.deepEqual(dynamic, []);
});

test("every TV's route is in SCREEN_PATHS, with /exit, /board and /comingsoon", () => {
  for (const t of TVS) assert.ok(R.SCREEN_PATHS.includes(t.route), `${t.route} is not in SCREEN_PATHS`);
  for (const p of ["/exit", "/board", "/comingsoon"]) assert.ok(R.SCREEN_PATHS.includes(p), `${p} left SCREEN_PATHS`);
  assert.equal(new Set(R.SCREEN_PATHS).size, R.SCREEN_PATHS.length);
});

test("SiteChrome skips its extras on the registry's SCREEN_PATHS, not on a list of its own", () => {
  const chrome = read("app/components/SiteChrome.tsx");
  assert.match(chrome, /^import \{ SCREEN_PATHS \} from "\.\/tv-screens";\r?$/m);
  assert.doesNotMatch(chrome, /\bconst SCREEN_PATHS\b/);
  assert.match(chrome, /SCREEN_PATHS\.some\(/);
});

test("every TV's content resolves: a key of TV_CONTENT, with a renderer in TvScreen.tsx", () => {
  const screen = read("app/components/TvScreen.tsx");
  for (const key of Object.keys(R.TV_CONTENT)) {
    assert.ok(screen.includes(`\n  "${key}": `), `TvScreen.tsx has no renderer for "${key}"`);
  }
  for (const t of TVS) assert.ok(Object.hasOwn(R.TV_CONTENT, t.shows), `${t.id} shows "${t.shows}", which is not in TV_CONTENT`);
});

test("TV pages are never indexed, and never in the sitemap", () => {
  const sitemap = read("app/sitemap.ts");
  for (const t of TVS) {
    assert.deepEqual(R.tvMetadata(t.id).robots, { index: false, follow: false });
    assert.equal(R.tvMetadata(t.id).title, t.title);
    assert.ok(!sitemap.includes(`'${t.route}'`), `${t.route} is in sitemap.ts`);
  }
});

test("a TV page's viewport is its content's: none for the board, the dark ground for the Starter Pack and the vestibule", () => {
  assert.deepEqual(R.tvViewport("reception"), {});
  // The vestibule's own layout (2026-10-21) paints the same dark ground as /exit.
  assert.deepEqual(R.tvViewport("vestibule"), { themeColor: "#0B1623", colorScheme: "dark" });
  assert.deepEqual(R.tvViewport("outside"), { themeColor: "#0B1623", colorScheme: "dark" });
  assert.deepEqual(R.contentViewport("starter-pack"), R.tvViewport("outside"));
  // /exit takes it from the same place, so the two heads cannot drift apart.
  assert.match(read("app/exit/page.tsx"), /^export const viewport = contentViewport\('starter-pack'\)\r?$/m);
});

test("tvViewport hands out a copy: nothing can change TV_CONTENT through it", () => {
  const v = R.tvViewport("outside");
  v.themeColor = "#FFFFFF";
  assert.equal(R.TV_CONTENT["starter-pack"].viewport.themeColor, "#0B1623");
});

test("tvScreen refuses an id that is not a TV", () => {
  assert.throws(() => R.tvScreen("lobby"), /No TV lobby/);
});

test("no TV route is shadowed by a redirect or by a file in public/", () => {
  const config = read("next.config.ts");
  for (const t of TVS) {
    assert.ok(!config.includes(`source: '${t.route}'`), `next.config.ts redirects ${t.route}`);
    const pub = path.join(ROOT, "public", t.id);
    // A FOLDER is fine (public/reception holds the board's ball icons); a file is not.
    assert.ok(!existsSync(pub) || statSync(pub).isDirectory(), `public/${t.id} is a file and would shadow ${t.route}`);
  }
});
