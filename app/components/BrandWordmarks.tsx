/* Brand wordmarks for the partner academies, reproduced in each brand's
   real logo font (as rendered on smashshuttler.com):
     SmashShuttler — Caveat 700 cursive, "smash!" ember · "shuttler" white
   Fonts are loaded globally in layout.tsx (--font-caveat).

   Chester County Cricket Academy is the exception: it ships a crest, not a
   wordmark, and cccricketacademy.com uses no brand webface at all. So its mark
   is the shield artwork plus the name set in the site's own condensed face.
   Everything is sized in `em` so the same `className` font-size call sites use
   for the type wordmarks also scales the crest.

   Pass `className` to size the logo at the call site (font-size + margins). */

import Image from "next/image";

export function ChesterCountyCricketWordmark({
  className = "",
  title = "Chester County Cricket Academy",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4em",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <Image
        src="/academies/ccca-shield.png"
        alt=""
        width={360}
        height={239}
        style={{ height: "1.15em", width: "auto" }}
      />
      <span
        className="text-cond"
        style={{ fontSize: "0.46em", letterSpacing: "0.04em", lineHeight: 1.05 }}
      >
        <span style={{ display: "block", color: "var(--ember-ink)" }}>
          Chester County
        </span>
        <span style={{ display: "block", color: "var(--on-tile)" }}>Cricket Academy</span>
      </span>
    </span>
  );
}

export function SmashShuttlerWordmark({
  className = "",
  title = "SmashShuttler",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title}
      className={className}
      style={{
        fontFamily: "var(--font-caveat), cursive",
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--ember-ink)" }}>smash!</span>
      <span style={{ color: "var(--on-tile)" }}>shuttler</span>
    </span>
  );
}

/** Map a brand key → its wordmark, sized for the given context. */
export function BrandWordmark({
  brand,
  className = "",
  title,
}: {
  brand: "ccca" | "smashshuttler";
  className?: string;
  title?: string;
}) {
  return brand === "ccca" ? (
    <ChesterCountyCricketWordmark className={className} title={title} />
  ) : (
    <SmashShuttlerWordmark className={className} title={title} />
  );
}
