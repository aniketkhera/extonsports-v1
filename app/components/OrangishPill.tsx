import type { CSSProperties } from "react";
import spin from "./OrangishPill.module.css";

/* The orangish.io credit, as a pill — one piece for all six Exton surfaces.
   ────────────────────────────────────────────────────────────────────────
   2026-10-15, Aniket: "orangish.io as a pill, in the exton sports center font,
   orang in orange, ish.io in white with the black pill background" — approved
   from a mock-up of the live pages. Where it sits on each surface was settled
   earlier the same day; this only decides how it looks.

   TWO PILLS, ONE FOR EACH KIND OF GROUND (later 2026-10-15, Aniket: "change it
   based on whether it's light or dark mode"). A black pill on a dark page is a
   hole, not a mark, so the pill is the opposite of what is behind it:

   - on a LIGHT ground, the approved black pill — "orang" #F89B72, "ish.io" white;
   - on a DARK ground, a white pill — "ish.io" #0A0A0A, and "orang" in #CE5718,
     the darker ember the light theme already sets text in (--ember-ink there),
     because #F89B72 on white falls under 2:1. No hairline on either: both edges
     carry against their ground (the TVs' faint white one is gone with the black).

   The WEBSITE follows the visitor's theme through the --pill-* tokens in
   globals.css — :root holds the white pill (the dark values, as for every other
   token there), :root[data-theme="light"] the black one. data-theme is the site's
   only switch (the inline script in layout.tsx; no "system" option), so explicit
   light, explicit dark and the light default are all covered, and a page whose
   script failed falls back to dark CSS and gets the white pill with it.

   Dedicated tokens and inline styles, never the shared ones or a utility class:
   the light theme remaps --color-*, --ember-ink and .text-white/NN under
   [data-theme="light"], and a pill whose "ish.io" turned navy would read as
   "orang". Nothing else reads or remaps --pill-*.

   The WALL SCREENS (`tv`) are always a dark ground and never follow a theme —
   the same rule as board.css, comingsoon.module.css and ReceptionBoard: literals,
   so a visitor's preference can never wash out a television. Always the white
   pill, as a <span>, because nobody can tap a television. On the web it is a
   link, in the same tab.

   Sized in em of whatever small text it sits in (1.05em), so each call site
   keeps setting the size it already had. */

const PILL: CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  borderRadius: 999,
  padding: "0.22em 0.8em 0.26em",
  // Oswald — the site's --font-cond, the face of the Exton Sports Center wordmark.
  fontFamily: "var(--font-cond), 'Arial Narrow', sans-serif",
  fontWeight: 500,
  fontSize: "1.05em",
  letterSpacing: "0.05em",
  lineHeight: 1.15,
  textTransform: "none",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

type Ink = { bg: string; orang: string; ish: string };

/** The white pill, for a dark ground. Keep in step with the :root --pill-* tokens. */
const ON_DARK: Ink = { bg: "#FFFFFF", orang: "#CE5718", ish: "#0A0A0A" };
/** Whichever the visitor's theme says — see the --pill-* tokens in globals.css. */
const THEMED: Ink = { bg: "var(--pill-bg)", orang: "var(--pill-orang)", ish: "var(--pill-ish)" };

function Word({ ink }: { ink: Ink }) {
  return (
    <>
      <span style={{ color: ink.orang }}>orang</span>
      <span style={{ color: ink.ish }}>ish.io</span>
    </>
  );
}

export default function OrangishPill({ tv = false }: { tv?: boolean }) {
  if (tv) {
    /* On the wall screens the pill turns about its horizontal axis, fast then slowing,
       then rests (2026-10-20 — see OrangishPill.module.css). The website's pill stays still:
       it sits in a footer people read, not on a wall people glance at. */
    return (
      <span className={spin.stage}>
        <span className={spin.spin} style={{ ...PILL, background: ON_DARK.bg }}>
          <Word ink={ON_DARK} />
        </span>
      </span>
    );
  }
  return (
    <a href="https://orangish.io" style={{ ...PILL, background: THEMED.bg }}>
      <Word ink={THEMED} />
    </a>
  );
}
