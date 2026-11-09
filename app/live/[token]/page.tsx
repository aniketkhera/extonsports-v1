import type { Metadata } from 'next'
import Link from 'next/link'
import { readToken } from '@/lib/live/token'
import { embedUrl, onAir } from '@/lib/live/youtube'
import { LIVE_COPY } from '@/app/components/live-pure'
import s from '@/app/components/live-gate.module.css'

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
  return <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 72px' }}>{children}</main>
}

function Problem({ title, body, action }: { title: string; body: string; action?: boolean }) {
  return (
    <Shell>
      <div className={s.state}>
        <p className={s.stateTitle}>{title}</p>
        <p className={s.stateBody}>{body}</p>
        {action ? (
          <Link className={s.stateAction} href="/live">
            {LIVE_COPY.again}
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

  return (
    <Shell>
      <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', lineHeight: 1.15, margin: '0 0 14px' }}>
        {air.title}
      </h1>
      <div className={s.player}>
        <iframe
          src={embedUrl(air.videoId)}
          title={air.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <p className={s.keepIt} style={{ maxWidth: '62ch' }}>
        {LIVE_COPY.keepIt} Your link stops working at the end of today; tomorrow’s session
        needs a new one from <Link href="/live" style={{ color: '#F37A4A' }}>extonsports.com/live</Link>.
      </p>
    </Shell>
  )
}
