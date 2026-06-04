export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#050505] border-t border-[#161616]">
      {/* Main grid */}
      <div
        className="mx-auto max-w-[1280px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-8"
        style={{ padding: "48px clamp(20px,4vw,48px) 36px" }}
      >
        {/* Brand + address */}
        <div className="sm:col-span-2 md:col-span-1">
          <a href="#top" className="brand-wordmark text-[1.05rem] inline-flex mb-4">

            <span>
              EXTON <span className="brand-accent">SPORTS CENTER</span>
            </span>
          </a>
          <p className="text-white/45 text-[0.8rem] leading-[1.7]">
            4 Tabas Lane, Building 2<br />
            Exton, PA 19341<br />
            <span className="text-white/30 text-[0.75rem]">Opposite Apna Bazar</span>
          </p>
          <div className="mt-3 space-y-1">
            <a href="tel:6099064271" className="block text-white/45 hover:text-[var(--color-ember)] text-[0.8rem] transition">
              609-906-4271
            </a>
            <a href="mailto:info@extonsports.com" className="block text-white/45 hover:text-[var(--color-ember)] text-[0.8rem] transition">
              info@extonsports.com
            </a>
          </div>
        </div>

        {/* Explore */}
        <div>
          <h4 className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest">EXPLORE</h4>
          <ul className="space-y-2.5">
            {[
              { label: "Sports", href: "#sports" },
              { label: "About", href: "#about" },
              { label: "Get directions", href: "https://maps.app.goo.gl/?q=4+Tabas+Lane+Exton+PA+19341" },
              { label: "Be first to know", href: "#waitlist" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                  className="text-white/55 hover:text-white text-[0.82rem] transition"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Membership */}
        <div>
          <h4 className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest">MEMBERSHIP</h4>
          <ul className="space-y-2.5">
            {[
              { label: "Guest access", href: "#waitlist" },
              { label: "Adult membership", href: "#waitlist" },
              { label: "Junior membership", href: "#waitlist" },
              { label: "Add-on / household", href: "#waitlist" },
              { label: "View options on Orangish", href: "https://orangish.io" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                  className="text-white/55 hover:text-white text-[0.82rem] transition"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest">LEGAL</h4>
          <ul className="space-y-2.5">
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Disclaimer", href: "/disclaimer" },
            ].map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="text-white/55 hover:text-white text-[0.82rem] transition"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-5 border-t border-white/8">
            <p className="text-white/25 text-[0.72rem] leading-relaxed">
              Opening July 2026 · Members &amp; guests only · Open 24/7
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t border-[#161616] flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{ padding: "18px clamp(20px,4vw,48px)" }}
      >
        <p className="text-[0.7rem] text-white/25 text-center sm:text-left">
          © {year} Exton Sports Center · All rights reserved
        </p>
        <p className="text-[0.7rem] text-white/20 text-center sm:text-right">
          Lessons &amp; membership via{" "}
          <a
            href="https://orangish.io"
            target="_blank"
            rel="noreferrer"
            className="text-white/35 hover:text-[var(--color-ember)] transition"
          >
            Orangish
          </a>
        </p>
      </div>
    </footer>
  );
}
