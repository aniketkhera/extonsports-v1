/* The club's round mark, for the in-club televisions' headers (2026-10-16, Aniket:
   "put the logo of exton sports center to the left top of EXTON SPORTS CENTER").

   /favicon.png, not /logo.png — the same choice /comingsoon made: logo.png is 128px
   and goes soft on a 75" panel, the favicon is the 1254px master. That file is a
   square with WHITE corners and the dark disc stops ~2.4% short of its edge, so a
   plain border-radius leaves a hairline white ring; clipping a slightly scaled-up
   image to the circle removes it. A thin brand-orange ring and a soft glow, as on
   /comingsoon, sit it on the navy. `size` is any CSS length; the ring scales with it.

   A plain <img>: a fixed asset at a size set in viewport units, which next/image
   would only make us describe twice. */
export default function ClubMark({ size, style }: { size: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block", width: size, height: size, flex: "none",
        borderRadius: "50%", overflow: "hidden",
        boxShadow: `0 0 0 calc(${size} * 0.035) rgba(248, 155, 114, 0.6), 0 0 calc(${size} * 0.35) rgba(248, 155, 114, 0.28)`,
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.png" alt=""
        style={{ display: "block", width: "100%", height: "100%", maxWidth: "none", transform: "scale(1.06)" }}
      />
    </span>
  );
}
