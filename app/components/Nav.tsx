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
      <a href="#top" className="brand-wordmark text-[1.45rem]">

        <span>
          EXTON <span className="brand-accent">SPORTS CENTER</span>
        </span>
      </a>

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
        <li>
          <a
            href="#waitlist"
            className="block px-[18px] text-[0.74rem] font-bold text-mono text-white hover:bg-[var(--color-ember-hi)] bg-[var(--color-ember)] transition"
            style={{ lineHeight: "64px" }}
          >
            Be first to know
          </a>
        </li>
      </ul>
    </header>
  );
}
