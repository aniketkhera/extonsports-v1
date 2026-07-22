import WhatsAppButton from "./WhatsAppButton";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#050505] border-t border-[#161616]">
      {/* Three centered columns */}
      <div
        className="mx-auto max-w-[1280px] flex flex-wrap justify-center gap-16 md:gap-24"
        style={{ padding: "48px clamp(20px,4vw,48px) 36px" }}
      >
        <FooterCol
          title="Explore"
          links={[
            { label: "Sports", href: "/#sports" },
            { label: "Careers", href: "/#careers" },
            { label: "Get directions", href: "https://maps.app.goo.gl/pX53mpfkSt81DBnh6" },
          ]}
        />
        <FooterCol
          title="Membership"
          links={[
            { label: "Guest access", href: "/#waitlist" },
            { label: "Adult membership", href: "/#waitlist" },
            { label: "Junior membership", href: "/#waitlist" },
            { label: "Add-on / household", href: "/#waitlist" },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Disclaimer", href: "/disclaimer" },
          ]}
        />
      </div>

      {/* Follow on WhatsApp — centered CTA */}
      <div
        className="flex justify-center"
        style={{ padding: "0 clamp(20px,4vw,48px) 40px" }}
      >
        <WhatsAppButton label="Follow us on WhatsApp" />
      </div>

      {/* Bottom bar — centered */}
      <div
        className="border-t border-[#161616] flex items-center justify-center"
        style={{ padding: "18px clamp(20px,4vw,48px)" }}
      >
        <p className="text-[0.7rem] text-white/25 text-center">
          © {year} Exton Sports Center · All rights reserved
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="text-center">
      <h4 className="text-mono text-[0.65rem] text-white/35 mb-4 tracking-widest">
        {title.toUpperCase()}
      </h4>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noreferrer" : undefined}
              className="text-white/55 hover:text-white transition"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
