import type { Metadata, Viewport } from "next";

/* THE CLUB'S TELEVISIONS — one entry per physical set (2026-10-20).
   ──────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-20: "let's make this for each tv like we did for reception -
   www.extonsports.com/outside, extonsports.com/vestibule (I have two more TVs yet
   to be installed, will get to those too later)".

   Until then a TV's address said what it SHOWED, not which TV it was. The reception
   and vestibule sets both loaded /reception, each with its own key, and the old
   outside set was pointed at /exit the day it became the Starter Pack screen. So
   changing what a TV showed meant editing tvs.json on the N95, a root-owned file
   that holds pairing tokens and board keys, and a promo's URL had become a TV's
   identity.

   Now every TV has ONE address of its own, named after tv-keeper's name for it,
   and what it shows is decided HERE:
     reception  → extonsports.com/reception
     vestibule  → extonsports.com/vestibule
     outside    → extonsports.com/outside
   tv-keeper points each set at its own address once. After that, changing what a
   TV shows is its `shows:` line below plus a deploy. Every screen reloads itself
   when a deploy lands (useReloadOnDeploy), so nobody touches the box.

   ⛔ NAMES ARE NOT DECIDED HERE, AND NOT BY THE ROUTE. Whether the court board
   names bookers is decided server-side per screen KEY (board_screens.names_visible
   on the platform). The reception key names them, the vestibule key does not, and
   no key at all gets the public view. /vestibule opened with the reception key
   would name people, and /reception opened with no key would not. The key
   travels in the URL fragment (#k=). Browsers keep a fragment across the apex →
   www 308 and never send it to a server.

   ── ADDING THE NEXT TV ──────────────────────────────────────────────────────
   In this repo:
   1. An entry in TV_SCREENS: `id` is the name it is paired under in tv-keeper
      (lower case, one word), `route` is "/" + id, and `shows` is what it shows.
   2. A route folder, app/<id>/page.tsx: copy app/vestibule/page.tsx and change the
      id in its three places. Use a real folder, not a catch-all at the root, so a
      mistyped address is a 404 instead of a blank screen, and no TV name can ever
      shadow one of the site's own pages. npm test fails until the folder exists.
   3. The id in the first test of tv-screens.test.mjs. That test names the sets on
      the wall on purpose, so npm test fails until the new one is added.
   4. SiteChrome needs nothing: SCREEN_PATHS below is built from this list, so the
      new route never shows the WhatsApp bubble, analytics or the visit beacon.
      (/reception had all three in its first week, because it was missed.)
      sitemap.ts needs nothing either. The page is noindex (tvMetadata) and stays
      out of the sitemap.
   5. Deploy, and check from the N95 that https://www.extonsports.com/<id> answers
      200. (The keeper's loop will not launch a page that does not load from there.)

   On the set, and on the N95 (tv-keeper, orangish-cameras repo):
   6. A new set has never been paired, and `point` refuses a name it has not paired
      ("No paired TV named …"), so it is PAIRED, not pointed. On the set: TV Name
      (Settings → System) = <id>, because tv-keeper finds a set by that name, and
      Auto Power Off = Off. Then:
        docker exec -it tv-keeper node index.js pair <id> https://extonsports.com/<id>
      and type the PIN the set shows. If the set cannot report what it is showing
      (the vestibule's firmware cannot), give it "trustAppReport": false: on
      tv-keeper's watchdog build that is `set <id> trustAppReport false`, on an
      older one an edit to tvs.json.
   7. A KEY ONLY IF IT NEEDS ONE: to name bookers on the court board, or, once the
      heartbeat ships, to be watched (only a keyed page beats). Without a key the
      board is the public view. If it needs one, then in this order (2026-10-20,
      after review):
      a. NAMES FIRST. A new key NAMES MEMBERS: board_screens.names_visible defaults
         to true. Any set the public can see must have names off. Mint it with
         `--no-names`, which exists only once orangish-app feat/screen-watchdog is
         merged; until then, set names_visible = false on the new board_screens row
         before the set is pointed at the key.
      b. Mint it for THIS address. Without BOARD_URL the script writes /board, and
         the set would show /board instead of /<id>. In orangish-app:
           BOARD_URL=https://extonsports.com/<id> node --env-file=.env.local
             scripts/provision-board-screen.mjs --location <uuid> --label "<id> TV"
             --out <file>
         (PowerShell: $env:BOARD_URL='https://extonsports.com/<id>' first.)
      c. Point the set from that file, so nobody types or reads the key, then
         relaunch it (tv-keeper ignores the fragment when it compares, so a set
         that only gained a key counts as "already showing its page" until the
         hourly reload):
           docker exec tv-keeper node index.js point <id> @/app/state/<id>.url
           docker exec tv-keeper node index.js reload <id>
         The file is a path INSIDE the container, mode 600, shredded afterwards.
         orangish-app docs/screen-watch.md ("Re-mint") has every step of that.
         ONLY tv-keeper's watchdog build understands "@<file>". Check first that
           docker exec tv-keeper grep -c "rawTarget.startsWith('@')" index.js
         prints more than 0. An older build reads "@<file>" as a /tv pairing code:
         it deletes the set's url and points it at app.orangish.io/tv?code=….
   8. Its heartbeat page name (2026-10-20): <id> goes in SCREEN_PAGES in
      app/components/screen-pure.ts (tsc fails in TvScreen.tsx, and npm test
      fails, until it does), AND in the platform's page list (orangish-app
      SCREEN_PAGES in lib/screen-watch.ts, and the board_screen_beats.page
      CHECK), the platform deployed BEFORE the site. Otherwise every beat from
      the new set, once keyed, is refused (400 "bad page") and it looks silent.

   ── SWAPPING A PROMO ────────────────────────────────────────────────────────
   Change that TV's `shows:` to another key of TV_CONTENT and deploy. A NEW promo
   needs three things: its component (like app/exit/ExitScreen.tsx), a key in
   TV_CONTENT, and its line in TvScreen.tsx (tsc fails until every key has one).
   A preview address of its own, like /exit for the Starter Pack, is optional and
   is not a TV.
   ⚠️ A KEYED TV must keep beating. tv-keeper's watchdog relaunches a keyed set
   that has beaten and then goes quiet ("silent"), and may then power-cycle it.
   That is why the heartbeat is rendered once in TvScreen.tsx, named by the TV,
   and not inside any content component (2026-10-20): a new promo beats under its
   TV's name with nothing added. Do not call useScreenHeartbeat in a content
   component: the page would beat twice a minute, under two names
   (screen-pure.test.mjs fails if one does). */

/** What a TV can show. TvScreen.tsx renders each key. `viewport` is the one the
 *  content's own page uses, so that a TV route's <head> matches it exactly: the
 *  court board's /reception sets none, and the Starter Pack's /exit sets the dark
 *  ground it paints. */
export const TV_CONTENT = {
  /** The court board, grouped by sport: app/reception/ReceptionBoard.tsx. */
  "court-board": { viewport: {} },
  /** The Squash Starter Pack promotion: app/exit/ExitScreen.tsx (preview at /exit). */
  "starter-pack": { viewport: { themeColor: "#0B1623", colorScheme: "dark" } },
} as const satisfies Record<string, { viewport: Viewport }>;

export type TvContent = keyof typeof TV_CONTENT;

export type Tv = {
  /** The name the set is paired under in tv-keeper (tvs.json `name`). */
  id: string;
  /** Its address on extonsports.com, always "/" + id. */
  route: `/${string}`;
  /** The page's <title>. Nobody sees it on the wall. It names the TAB when somebody
   *  opens the address on a laptop. */
  title: string;
  /** Where it hangs, for a person reading this list. */
  location: string;
  /** The set, for reference: the 16:9 box makes the page fit any of them. */
  set: string;
  /** What it shows. Changing this line changes the TV. */
  shows: TvContent;
};

export const TV_SCREENS = [
  {
    id: "reception",
    route: "/reception",
    title: "Reception board",
    location: "Reception desk",
    set: 'VIZIO M55Q6-L4, 55"',
    shows: "court-board",
  },
  {
    id: "vestibule",
    route: "/vestibule",
    title: "Vestibule screen",
    location: "Vestibule",
    set: 'VIZIO W4K75M, 75"',
    shows: "court-board",
  },
  {
    /* Still named "outside" in tv-keeper. The set faced the street until
       2026-10-20, when it moved indoors to face the EXIT door. Renaming it would
       mean re-pairing it, which is not worth doing for a name. */
    id: "outside",
    route: "/outside",
    title: "Outside screen",
    location: "Exit door (keeper name 'outside')",
    set: 'VIZIO WHD32M, 32"',
    shows: "starter-pack",
  },
] as const satisfies readonly Tv[];

export type TvId = (typeof TV_SCREENS)[number]["id"];

/** One TV's entry exactly as written in TV_SCREENS. Its `id` is the TvId union
 *  ("reception" | "vestibule" | "outside"), not a string, so a prop typed by TvId,
 *  such as the heartbeat's page name, takes tv.id with no cast (2026-10-20). */
export type TvEntry = (typeof TV_SCREENS)[number];

export function tvScreen(id: TvId): TvEntry {
  const tv = TV_SCREENS.find((t) => t.id === id);
  if (!tv) throw new Error(`No TV ${id} in TV_SCREENS`);
  return tv;
}

/** A TV page's metadata: its title, and never indexed. A TV page is furniture, not a
 *  page, and a search result that lands a member on a screen with no navigation on
 *  it is a dead end. */
export function tvMetadata(id: TvId): Metadata {
  return { title: tvScreen(id).title, robots: { index: false, follow: false } };
}

/** A TV page's viewport: the one its content's own page uses (TV_CONTENT). A copy,
 *  so Next can never mutate the shared constant. */
export function tvViewport(id: TvId): Viewport {
  return { ...TV_CONTENT[tvScreen(id).shows].viewport };
}

/** The viewport of a piece of content, for the content's own preview page (/exit). */
export function contentViewport(content: TvContent): Viewport {
  return { ...TV_CONTENT[content].viewport };
}

/** Every path that is a SCREEN rather than a page somebody visits. SiteChrome skips
 *  the WhatsApp bubble, analytics and the visit beacon on these; see there for why.
 *  This is every TV's own route, plus the screens that are not any TV's address:
 *  /exit (the Starter Pack's preview, and the exit-door TV's URL until tv-keeper is
 *  re-pointed at /outside), and /board and /comingsoon (no TV shows them today;
 *  they are kept as pages). Built from TV_SCREENS so that a new TV cannot be
 *  missed out. */
export const SCREEN_PATHS: readonly string[] = [
  ...TV_SCREENS.map((t) => t.route),
  "/exit",
  "/board",
  "/comingsoon",
];
