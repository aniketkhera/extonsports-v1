import type { Metadata } from 'next'
import LiveGate from '@/app/components/LiveGate'
import { LIVE_COPY } from '@/app/components/live-pure'
import s from '@/app/components/live-gate.module.css'

/* extonsports.com/live — the door. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-09: "let's do the email form on /live now", with YouTube behind it and
   "a new link every day".

   This page shows the SAME thing whether or not a session is on air, and deliberately so.
   Telling a visitor "nothing is on now" before they have identified themselves publishes
   the club's timetable to anyone who asks, and the page is indexed. The watch page behind
   the link is where on-air and off-air differ.

   ⚠️ NOINDEX. A page whose whole purpose is to hand out links to video of children has no
   business in a search result. */
export const metadata: Metadata = {
  title: 'Watch live',
  description: 'Parents of children at Exton Sports Center coaching can ask for a link to watch today’s session.',
  alternates: { canonical: '/live' },
  robots: { index: false, follow: false },
}

export default function LivePage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.1, margin: '0 0 12px' }}>
        {LIVE_COPY.title}
      </h1>
      <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#55504a', margin: '0 0 28px', maxWidth: '58ch' }}>
        {LIVE_COPY.lede}
      </p>

      <LiveGate />

      <p className={s.keepIt} style={{ maxWidth: '58ch' }}>
        Sessions are filmed for the children taking part and the parents who booked them.
        Please don’t share your link or re-publish the video.
      </p>
    </main>
  )
}
