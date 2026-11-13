import type { Metadata } from 'next'
import Link from 'next/link'
import { readToken } from '@/lib/live/token'
import { embedUrl, onAir } from '@/lib/live/youtube'
import { LIVE_COPY } from '@/app/components/live-pure'

/* extonsports.com/live/<token> — the watch page. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   The token is checked first and the broadcast second, so an expired link is told it has
   expired without our asking YouTube anything on its behalf.

   THREE HONEST ENDINGS, and they are different on purpose:
     expired  — your link is old; here is how to get a new one.
     off air  — your link is fine; there is no class running.
     unknown  — your link is fine and we could not reach YouTube. OUR fault, say so.
   Collapsing the third into the second would tell a parent standing in the car park that
   their child's class is not happening, which may be untrue. */

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Watch live',
  robots: { index: false, follow: false, nocache: true },
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-[72rem] px-5 pt-10 pb-20 sm:px-8">{children}</main>
}

function Problem({ title, body, action }: { title: string; body: string; action?: boolean }) {
  return (
    <Shell>
      <div className="max-w-[34rem] border-l-2 border-[var(--color-line-2)] bg-[var(--color-ink)] px-6 py-6">
        <p className="text-white text-[1.15rem] font-semibold leading-snug">{title}</p>
        <p className="mt-3 text-white/55 text-[0.95rem] leading-relaxed">{body}</p>
        {action ? (
          <Link
            href="/live"
            className="mt-6 inline-block bg-[var(--color-ember)] text-black hover:bg-[var(--color-ember-hi)] text-mono text-[0.7rem] transition-colors"
          >
            <span className="inline-block px-6 py-3">{LIVE_COPY.again.toUpperCase()}</span>
          </Link>
        ) : null}
      </div>
    </Shell>
  )
}

export default async function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const check = readToken(token, process.env.LIVE_LINK_KEY ?? '')
  if (!check.ok) {
    // malformed and bad_signature say the same thing as expired. A link that was never
    // valid and one that has run out are the same event to the person holding it, and
    // telling them apart would help only someone probing.
    return <Problem title={LIVE_COPY.expired} body={LIVE_COPY.expiredMore} action />
  }

  const air = await onAir()

  if (air.state === 'unknown') {
    console.error('[live] could not read the broadcast: %s', air.why)
    return <Problem title={LIVE_COPY.unknown} body={LIVE_COPY.unknownMore} />
  }
  if (air.state === 'off_air') {
    return <Problem title={LIVE_COPY.offAir} body={LIVE_COPY.offAirMore} />
  }

  /* ⚠️ THE ON-AIR VIEW DOES NOT USE <Shell>. A parent watches this on a phone held
     sideways, and Shell's max-w-[72rem] plus side padding left the picture floating in a
     black margin on every side (reported 2026-11-09, with a screenshot). The player below
     is full-bleed and sized to the LARGER of what the viewport allows in each direction, so
     it fills whichever dimension runs out first. Some letterboxing against a ~2.2:1 phone
     screen is unavoidable for a 16:9 picture - that is the shape of the content, not a bug
     - but none of it is now our own padding. */
  return (
    <main className="w-full pb-16">
      {/* ⚠️ THE TITLE IS OVERLAID ON THE PICTURE, NOT ABOVE IT.
          A row above the player steals height, and on a phone held sideways height is the
          scarce axis: 4.5rem of heading cost 108px of picture width at 915x412, because a
          16:9 box shrinks in BOTH directions when you take height from it. Overlaid, the
          player gets the whole viewport and the title sits on the black the video letterboxes
          into. Same reason every video app does this. */}
      <div className="relative mx-auto w-full" style={{ width: 'min(100%, calc(100dvh * 16 / 9))' }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 sm:px-6">
          <span className="inline-flex items-center gap-2 text-mono text-[0.62rem] tracking-[0.16em] text-[var(--color-ember)]">
            <span
              aria-hidden="true"
              className="inline-block h-[7px] w-[7px] rounded-full bg-[var(--color-ember)]"
            />
            ON AIR
          </span>
          <h1 className="text-white font-semibold leading-tight text-[clamp(1rem,2.6vw,1.5rem)] drop-shadow">
            {air.title}
          </h1>
        </div>

        <div
          className="w-full overflow-hidden bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          <iframe
            src={embedUrl(air.videoId)}
            title={air.title}
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-[46rem] px-4 text-white/45 text-[0.84rem] leading-relaxed sm:px-8">
        {LIVE_COPY.keepIt} Your link stops working at the end of today; tomorrow’s session
        needs a new one from{' '}
        <Link href="/live" className="text-[var(--color-ember)] hover:text-white transition-colors">
          extonsports.com/live
        </Link>
        .
      </p>
    </main>
  )
}
