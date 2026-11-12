'use client'

/* The LIVE NOW badge. 2026-11-12.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-11-12: "if we are streaming - show a LIVE NOW glowing on this page, as
   well as the top of extonsports.com homepage."

   WHY A CLIENT COMPONENT AND NOT A SERVER ONE. The homepage is prerendered and rebuilt at
   most hourly (app/page.tsx: `export const revalidate = 3600`), so anything the server
   renders about on-air state is stale by up to an hour — it would still say LIVE NOW
   forty minutes after the coaches went home. This polls instead, which also means the
   badge appears on a page already open when a session starts, with no refresh.

   IT RENDERS NOTHING WHEN OFF AIR. Not a greyed-out pill, not "not live" — nothing. The
   page off air must look exactly as it did before this existed.

   COLOURS LIVE IN globals.css, NOT HERE. LiveGate.tsx records that Tailwind's
   arbitrary-value utilities (`bg-[var(--color-ink-2)]`) are resolved at build time and did
   not follow the `:root[data-theme="light"]` override, so a dark token painted a light
   surface. Its fix was inline styles. The fix here is a plain class instead, because this
   badge needs a light-theme rule of its own — the halo reads as a smudge on a pale ground,
   exactly as the nav's `.opening-glow` chip does — and an inline style outranks any rule a
   stylesheet could write.

   EMBER, NOT RED. A red dot is the convention, but this palette has no red token (only
   ember, green and the greys) and inventing one for a badge would leave an off-palette
   colour for the next person to wonder about. Ember is the site's attention colour and
   the words carry the meaning. */

import { useEffect, useState } from 'react'
import { LIVE_NOW_COPY, LIVE_STATUS_PATH, parseLiveStatus, pollDelayMs } from './live-now-pure'

type Props = {
  /** The homepage badge is a way in to /live. The badge ON /live has nowhere to go. */
  asLink?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function LiveNowBadge({ asLink = false, className = '', style }: Props) {
  const [live, setLive] = useState(false)

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0

    const arm = (ms: number) => {
      clearTimeout(timer)
      timer = setTimeout(look, ms)
    }

    async function look(): Promise<void> {
      if (stopped) return
      /* A hidden tab asks nothing. A phone left on this page overnight would otherwise
         poll till morning for a badge nobody can see. The visibility handler below asks
         immediately on return, so coming back to the tab is never stale. */
      if (typeof document !== 'undefined' && document.hidden) return arm(pollDelayMs(0))

      try {
        const res = await fetch(LIVE_STATUS_PATH, { cache: 'no-store' })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const next = parseLiveStatus(await res.json())
        failures = 0
        if (!stopped) setLive(next)
      } catch {
        failures += 1
        /* Two strikes before going dark, not one. The badge must not claim a camera is
           on children when we cannot confirm it — but a single dropped request on a
           phone changing cell mid-session is not evidence the session ended, and
           blinking the badge off and on reads as a broken site. Two consecutive
           failures is ~90 s of silence, which is a real outage. */
        if (!stopped && failures >= 2) setLive(false)
      }
      if (!stopped) arm(pollDelayMs(failures))
    }

    const onVisible = () => {
      if (!document.hidden && !stopped) void look()
    }

    void look()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!live) return null

  const inner = (
    <>
      <span aria-hidden="true" className="live-now-dot" />
      <span>{LIVE_NOW_COPY.label}</span>
      {/* Announced once when it appears; the dot and the pill are decoration. */}
      <span className="sr-only">{LIVE_NOW_COPY.announce}</span>
    </>
  )

  const shared =
    'live-now-pill text-mono inline-flex items-center gap-2 px-3 py-1.5 ' +
    'text-[0.62rem] tracking-[0.18em] ' +
    className

  /* aria-live on a wrapper that is always in the tree would be better, but this badge is
     mounted and unmounted wholesale; role=status on the thing itself is announced by
     screen readers when it is inserted, which is exactly the moment that matters. */
  return asLink ? (
    <a href={LIVE_NOW_COPY.href} title={LIVE_NOW_COPY.linkTitle} role="status" className={shared} style={style}>
      {inner}
    </a>
  ) : (
    <span role="status" className={shared} style={style}>
      {inner}
    </span>
  )
}
