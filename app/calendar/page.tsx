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

   ⚠️ NO LOGIN AND NO NAMES. The upstream returns a court, a time and one of two
   words ('booking' or 'programme') — never who holds the slot. That is what makes
   this safe to send to a mailing list. If the payload ever grows a name, this
   page stops being shareable and the endpoint is the thing to fix. */

export const metadata: Metadata = {
  title: 'Calendar of bookings',
  description:
    'Every court at Exton Sports Center, as it stands — which hours are taken and which are free to book.',
  alternates: { canonical: '/calendar' },
  openGraph: {
    title: 'Calendar of bookings — Exton Sports Center',
    description:
      'Every court, as it stands. Taken hours are shown without any detail of who has them.',
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
