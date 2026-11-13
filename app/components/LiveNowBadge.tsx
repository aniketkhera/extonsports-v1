'use client'

/* The LIVE NOW badge. 2026-11-12.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket: "if we are streaming - show a LIVE NOW glowing on this page, as well as the
   top of extonsports.com homepage", then: "put the LIVE NOW in RED, bright RED, and put
   it near the green 24x7 sign."

   So it lives in the nav beside `.open-chip`, and it is a sibling of that chip in every
   way except loudness: same geometry, solid red fill instead of a soft green tint. The
   club being open is a standing fact; children being on camera right now is news.

   TWO SIZES, FOR THE REASON THE GREEN CHIP HAS TWO. A chip cannot sit beside the wordmark
   on a phone — Nav.tsx works the arithmetic out in full, and the short version is that the
   wordmark already spends every spare pixel below ~423px. So from `sm` up this is a chip
   on the nav row, and below `sm` it joins OPEN 24×7 on the second line under the wordmark.
   Same solution, same place, so there is one pattern to understand rather than two.

   WHY A CLIENT COMPONENT. The homepage is prerendered and rebuilt at most hourly
   (app/page.tsx: `export const revalidate = 3600`), so anything the server renders about
   on-air state is stale by up to an hour — it would still say LIVE NOW forty minutes after
   the coaches went home. Polling also means the badge appears on a page already open when
   a session starts, with no refresh.

   IT RENDERS NOTHING WHEN OFF AIR. Not a greyed-out chip, not "not live" — nothing. The
   nav off air is exactly the nav that was there before this existed.

   Colours live in globals.css (`.live-chip`, `.live-sub`), not here: the fill has to be
   able to carry a theme rule if it ever needs one, and an inline style outranks any
   selector a stylesheet could write. */

import { useEffect, useState } from 'react'
import { LIVE_NOW_COPY, LIVE_STATUS_PATH, parseLiveStatus, pollDelayMs } from './live-now-pure'

type Props = {
  /** 'chip' is the nav row and /live; 'sub' is the phone line under the wordmark. */
  variant?: 'chip' | 'sub'
  /** A way in to /live. Never set it for 'sub': that one renders inside the wordmark's
   *  own <Link>, and an anchor inside an anchor is invalid HTML. */
  asLink?: boolean
  className?: string
}

export default function LiveNowBadge({ variant = 'chip', asLink = false, className = '' }: Props) {
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
           blinking the badge off and on reads as a broken site. */
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

  const base = variant === 'sub' ? 'live-sub' : 'live-chip'
  const cls = `${base} items-center gap-2 shrink-0 ${className}`

  const inner = (
    <>
      <span aria-hidden="true" className="live-dot" />
      <span>{LIVE_NOW_COPY.label}</span>
    </>
  )

  /* role=status is announced by a screen reader when the element is inserted, which is
     exactly the moment that matters; the badge is mounted and unmounted wholesale rather
     than living in the tree with its text swapped. */
  return asLink ? (
    <a href={LIVE_NOW_COPY.href} title={LIVE_NOW_COPY.linkTitle} role="status" className={cls}>
      {inner}
    </a>
  ) : (
    <span role="status" aria-label={LIVE_NOW_COPY.announce} className={cls}>
      {inner}
    </span>
  )
}
