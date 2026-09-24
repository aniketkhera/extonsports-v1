/* Brand wordmarks for the partner academies, reproduced in each brand's
   real logo font (as rendered on philadelphiabadminton.com):
     Philadelphia Badminton — Space Grotesk 700, "Philadelphia" ember ·
     "Badminton" white, stacked over two lines as their own hero sets it
   Fonts are loaded globally in layout.tsx (--font-space-grotesk).
   (Nothing imports this file — Hero.tsx and ComingSoon.tsx each inline their
   own lockups. Kept in step so it cannot mislead.)

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

export function PhiladelphiaBadmintonWordmark({
  className = "",
  title = "Philadelphia Badminton",
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
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontWeight: 700,
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "block", color: "var(--ember-ink)" }}>Philadelphia</span>
      <span style={{ display: "block", color: "var(--on-tile)" }}>Badminton</span>
    </span>
  );
}

/** Map a brand key → its wordmark, sized for the given context. */
export function BrandWordmark({
  brand,
  className = "",
  title,
}: {
  brand: "ccca" | "philadelphia-badminton";
  className?: string;
  title?: string;
}) {
  return brand === "ccca" ? (
    <ChesterCountyCricketWordmark className={className} title={title} />
  ) : (
    <PhiladelphiaBadmintonWordmark className={className} title={title} />
  );
}
