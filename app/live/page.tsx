import type { Metadata } from 'next'
import LiveGate from '@/app/components/LiveGate'
import LiveNowBadge from '@/app/components/LiveNowBadge'
import { LIVE_COPY } from '@/app/components/live-pure'

/* extonsports.com/live — the door. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-09: "let's do the email form on /live now", with YouTube behind it and
   "a new link every day".

   UNTIL 2026-11-12 this page showed the SAME thing whether or not a session was on air,
   and deliberately: telling a visitor "nothing is on now" before they have identified
   themselves publishes the club's timetable to anyone willing to poll a public address.

   Aniket reversed that on 2026-11-12 — "if we are streaming - show a LIVE NOW glowing on
   this page, as well as the top of extonsports.com homepage" — so LiveNowBadge appears
   while a broadcast is actually live, and nothing shows otherwise. The trade is real and
   is recorded in docs/live-stream.md rather than argued again here. What the page still
   does NOT do is hand over the way in: the badge says a session is on, never which video,
   so the emailed day link remains the only route to the picture.

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
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-mono text-[0.62rem] tracking-[0.18em] text-[var(--color-ember)]">
          EXTON SPORTS CENTER · LIVE
        </p>
        {/* Not a link: the visitor is already here. */}
        <LiveNowBadge />
      </div>

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
