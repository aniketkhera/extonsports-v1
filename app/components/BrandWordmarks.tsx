/* Brand wordmarks for the partner academies, reproduced in each brand's
   real logo font (as rendered on excelcricket.com / smashshuttler.com):
     ExcelCricket  — Comfortaa 700, "excel" ember · "cricket" white
     SmashShuttler — Caveat 700 cursive, "smash!" ember · "shuttler" white
   Fonts are loaded globally in layout.tsx (--font-comfortaa / --font-caveat).
   Pass `className` to size the logo at the call site (font-size + margins). */

export function ExcelCricketWordmark({
  className = "",
  title = "ExcelCricket",
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
        fontFamily: "var(--font-comfortaa), cursive",
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: "var(--color-ember)" }}>excel</span>
      <span style={{ color: "#FFFFFF" }}>cricket</span>
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
      <span style={{ color: "var(--color-ember)" }}>smash!</span>
      <span style={{ color: "#FFFFFF" }}>shuttler</span>
    </span>
  );
}

/** Map a brand key → its wordmark, sized for the given context. */
export function BrandWordmark({
  brand,
  className = "",
  title,
}: {
  brand: "excelcricket" | "smashshuttler";
  className?: string;
  title?: string;
}) {
  return brand === "excelcricket" ? (
    <ExcelCricketWordmark className={className} title={title} />
  ) : (
    <SmashShuttlerWordmark className={className} title={title} />
  );
}
