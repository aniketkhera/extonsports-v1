import type { Metadata } from 'next'
import LiveGate from '@/app/components/LiveGate'
import { LIVE_COPY } from '@/app/components/live-pure'

/* extonsports.com/live — the door. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-09: "let's do the email form on /live now", with YouTube behind it and
   "a new link every day".

   This page shows the SAME thing whether or not a session is on air, and deliberately so.
   Telling a visitor "nothing is on now" before they have identified themselves publishes
   the club's timetable to anyone who asks, and the page is on a public address. The watch
   page behind the link is where on-air and off-air differ.

   ⚠️ NOINDEX. A page whose whole purpose is to hand out links to video of children has no
   business in a search result. */
export const metadata: Metadata = {
  title: 'Watch live',
  description:
    'Parents of children at Exton Sports Center coaching can ask for a link to watch today’s session.',
  alternates: { canonical: '/live' },
  robots: { index: false, follow: false },
}

export default function LivePage() {
  return (
    <main className="mx-auto w-full max-w-[64rem] px-5 pt-14 pb-24 sm:px-8">
      <p className="text-mono text-[0.62rem] tracking-[0.18em] text-[var(--color-ember)]">
        EXTON SPORTS CENTER · LIVE
      </p>

      <h1 className="mt-3 text-white font-semibold leading-[1.04] text-[clamp(2rem,6vw,3.25rem)]">
        {LIVE_COPY.title}
      </h1>

      <p className="mt-4 max-w-[34rem] text-white/55 text-[1.02rem] leading-relaxed">
        {LIVE_COPY.lede}
      </p>

      <div className="mt-9 border-t border-[var(--color-line)] pt-9">
        <LiveGate />
      </div>

      <div className="mt-12 grid gap-7 border-t border-[var(--color-line)] pt-8 sm:grid-cols-3">
        <Note k="WHAT YOU SEE">
          All six courts at once, so you can follow your child wherever they move during the
          session.
        </Note>
        <Note k="WHEN">
          Only while a coaching session is actually running. Outside that, the page says so.
        </Note>
        <Note k="YOUR LINK">
          Works for today only, and we send a new one each day. Please keep it to yourself —
          it shows children at their session.
        </Note>
      </div>
    </main>
  )
}

function Note({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-mono text-[0.6rem] text-white/40">{k}</p>
      <p className="mt-2 text-white/65 text-[0.88rem] leading-relaxed">{children}</p>
    </div>
  )
}
