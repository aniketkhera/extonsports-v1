import Link from 'next/link'
import { LEGAL_NAME, LEGAL_ADDRESS_LINE, CONTACT_PHONE, CONTACT_EMAIL } from '@/lib/legal'

// Shared shell for the four legal pages (privacy, terms, disclaimer, sms).
//
// One component rather than four near-identical files, so the entity footer — the thing
// a messaging reviewer has to be able to find — cannot go missing from one of them. It
// is rendered here, once, for every legal page automatically.
//
// The footer of extonsports.com has linked to /privacy, /terms and /disclaimer since it
// was written, and until now all three returned 404. That is a visitor-facing bug in its
// own right, and it is also the shape of failure that contributed to Orangish's
// "unverifiable website" rejection, where /about and /contact were dead links.

// `samples` renders as message bubbles rather than prose. They exist for the same two
// audiences as everything else here: a customer seeing what to expect, and a reviewer
// checking that the sample messages filed with the campaign are the ones actually
// published. THEY MUST STAY WORD FOR WORD IDENTICAL TO THE CAMPAIGN SUBMISSION —
// comparing the two is a mechanical check a reviewer can run in seconds, and a mismatch
// is precisely what "unverifiable website" (error 30891) means.
export type Section = { title: string; body?: string; samples?: string[] }

export default function LegalPage({
  title, intro, updated, sections,
}: {
  title: string
  intro?: string
  updated: string
  sections: Section[]
}) {
  return (
    <div className="bg-[var(--legal-bg)] min-h-screen text-white">
      <div className="mx-auto max-w-[760px]" style={{ padding: '64px clamp(20px,5vw,48px) 80px' }}>
        <Link
          href="/"
          className="text-mono text-[0.7rem] tracking-widest text-white/45 hover:text-white transition"
        >
          ← EXTON SPORTS CENTER
        </Link>

        <h1 className="font-[family-name:var(--font-cond)] mt-6 mb-4 leading-[1.05]"
          style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {title}
        </h1>

        {intro && <p className="text-white/60 text-[0.98rem] leading-relaxed mb-2">{intro}</p>}
        <p className="text-white/30 text-[0.75rem] mb-10">Last updated {updated}</p>

        {sections.map((s, i) => (
          <section key={i} className="mb-9">
            <h2 className="text-[1.05rem] font-semibold mb-3 text-white/90">{s.title}</h2>
            {s.body && (
              <p className="text-white/55 text-[0.92rem] leading-[1.8] whitespace-pre-line">{s.body}</p>
            )}
            {s.samples?.map((msg, j) => (
              <p
                key={j}
                className="text-white/70 text-[0.9rem] leading-[1.7] bg-[var(--legal-surface)] border border-[var(--legal-line)] rounded-xl mt-3"
                style={{ padding: '13px 16px' }}
              >
                {msg}
              </p>
            ))}
          </section>
        ))}

        {/* The operating entity. Kept to the legal pages by choice — deliberately absent
            from the homepage — but reachable, because a messaging reviewer has to be able
            to tie this domain to the company on the Brand record. */}
        <div className="border-t border-[var(--legal-surface-2)] pt-6 mt-12">
          <p className="text-white/35 text-[0.78rem] leading-[1.8]">
            Exton Sports Center is a trading name of {LEGAL_NAME}.<br />
            {LEGAL_ADDRESS_LINE}<br />
            {CONTACT_PHONE} · {CONTACT_EMAIL}
          </p>
          <p className="text-white/25 text-[0.72rem] mt-4">
            <Link href="/privacy" className="hover:text-white/60 transition">Privacy Policy</Link>
            {' · '}
            <Link href="/terms" className="hover:text-white/60 transition">Terms of Service</Link>
            {' · '}
            <Link href="/disclaimer" className="hover:text-white/60 transition">Disclaimer</Link>
            {' · '}
            <Link href="/sms" className="hover:text-white/60 transition">SMS Terms</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
