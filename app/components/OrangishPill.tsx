import type { CSSProperties } from "react";

/* The orangish.io credit, as a pill — one piece for all six Exton surfaces.
   ────────────────────────────────────────────────────────────────────────
   2026-10-15, Aniket: "orangish.io as a pill, in the exton sports center font,
   orang in orange, ish.io in white with the black pill background" — approved
   from a mock-up of the live pages. Where it sits on each surface was settled
   earlier the same day; this only decides how it looks.

   Every colour is a literal, not a theme token, on purpose: the light theme
   remaps tokens and .text-white/NN utilities under [data-theme="light"], and a
   pill whose "ish.io" turned navy on the light footer would read as "orang".
   The pill is the same in both themes and on every screen.

   Sized in em of whatever small text it sits in (1.05em), so each call site
   keeps setting the size it already had.

   `tv`: the wall screens. A <span>, because nobody can tap a television, and a
   faint white hairline, because #0A0A0A on the boards' navy otherwise vanishes
   into the background from across the room. Full opacity there — the plain
   credit's dimming is gone with it. On the web it is a link, in the same tab. */

const PILL: CSSProperties = {
  display: "inline-block",
  verticalAlign: "middle",
  background: "#0A0A0A",
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

const TV_HAIRLINE: CSSProperties = { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)" };

const WORD = (
  <>
    <span style={{ color: "#F89B72" }}>orang</span>
    <span style={{ color: "#FFFFFF" }}>ish.io</span>
  </>
);

export default function OrangishPill({ tv = false }: { tv?: boolean }) {
  if (tv) return <span style={{ ...PILL, ...TV_HAIRLINE }}>{WORD}</span>;
  return (
    <a href="https://orangish.io" style={PILL}>
      {WORD}
    </a>
  );
}
