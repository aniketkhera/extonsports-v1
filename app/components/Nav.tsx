"use client";

const navLinks = [
  { label: "Sports", href: "#sports" },
  { label: "Academies", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Visit", href: "#about" },
];

export default function Nav() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[var(--color-line)]"
      style={{
        height: 64,
        padding: "0 44px",
        background: "rgba(0,0,0,0.88)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <a href="#top" className="brand-wordmark text-[1.45rem]">
          <img
            src="/logo.png"
            alt="Exton Sports Center"
            width={38}
            height={38}
            style={{ display: "block", flexShrink: 0 }}
          />
          <span>
            EXTON <span className="brand-accent">SPORTS CENTER</span>
          </span>
        </a>

        {/* Coming-soon chip beside the title — persistent (nav is sticky) and
            links to the waitlist form. Hidden on the narrowest screens so it
            never crowds the wordmark; the bottom CTA carries the date there. */}
        <a
          href="#waitlist"
          className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 border border-[var(--color-ember)]/45 hover:border-[var(--color-ember)] hover:bg-[var(--color-ember)]/10 transition-colors whitespace-nowrap shrink-0"
        >
          <span className="relative flex h-[6px] w-[6px]">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-ember)] opacity-70 animate-ping" />
            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[var(--color-ember)]" />
          </span>
          <span className="text-mono text-[0.6rem] text-[var(--color-ember)]">
            Opening Mid-Aug 2026
          </span>
        </a>
      </div>

      <ul className="hidden md:flex items-stretch list-none">
        {navLinks.map((l, i) => (
          <li key={l.label}>
            <a
              href={l.href}
              className={`block px-[18px] text-[0.74rem] font-semibold text-mono text-white/60 hover:text-white hover:bg-white/[0.04] transition border-r border-white/[0.06] ${
                i === 0 ? "border-l border-white/[0.06]" : ""
              }`}
              style={{ lineHeight: "64px" }}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </header>
  );
}
