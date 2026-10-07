import type { Metadata } from 'next'
import Link from 'next/link'
import BookingsCalendar from '@/app/components/BookingsCalendar'

/* The bookings calendar as a PAGE, so it has a URL that can be put in an email.
   ───────────────────────────────────────────────────────────────────────────────
   Same component as the hero's "Show calendar of bookings" popup, rendered with
   `standalone` — no portal, no scrim, no Close button. That is deliberate and it
   is the whole point: a shared link and the popup must never drift into showing
   different availability, so there is one grid and one data path, not two.

   It reads /api/court-slots like the popup does, which is a cached server-side
   proxy to the platform — so this page needs no auth, no club id in the bundle,
   and one cached response serves everyone who opens the emailed link.

   ⚠️ NO LOGIN, AND INITIALS RATHER THAN NAMES. This said "NO NAMES" until
   2026-10-07, when Aniket asked for the holder's initials on booked hours. The
   upstream now returns a court, a time, one of two words ('booking' or
   'programme') and — for a booking only — two letters.

   So this page is still shareable, but it is no longer anonymous, and the
   difference matters because the link goes to a mailing list and Google indexes
   it at priority 0.8. What keeps it defensible: programme hours stay unnamed,
   under-18 holders are stripped upstream before the reduction, and a FULL name
   never crosses the wire at all. If a full name ever appears in the payload,
   that is a bug in the platform's lib/court-slots.ts, and this page should stop
   being shared until it is fixed. */

export const metadata: Metadata = {
  title: 'Calendar of bookings',
  description:
    'Every court at Exton Sports Center, as it stands — which hours are taken and which are free to book.',
  alternates: { canonical: '/calendar' },
  openGraph: {
    title: 'Calendar of bookings — Exton Sports Center',
    description:
      'Every court, as it stands — which hours are taken, which are free to book.',
    url: '/calendar',
  },
}

export default function CalendarPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ink)] pt-10 pb-16 px-4">
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <Link
          href="/"
          className="inline-block text-mono text-[0.62rem] tracking-[0.14em] uppercase text-white/45 hover:text-white transition-colors mb-5"
        >
          ← Exton Sports Center
        </Link>
      </div>
      {/* `open` is always true: there is no trigger to open it and no overlay to
          dismiss. onClose is deliberately NOT passed — this is a Server Component
          and a function cannot cross the client boundary; in standalone nothing
          can call it anyway. */}
      <BookingsCalendar open standalone />
    </main>
  )
}
