'use client'

/* The off-air watch page, waiting for the session. 2026-11-13.
   ──────────────────────────────────────────────────────────────────────────────
   Aniket: "make the off-air page auto-refresh". A parent who opens their link at 5:55 for
   a 6:00 session used to see "No session is on air" until they thought to reload.

   It polls the same public boolean the LIVE NOW badge does (/api/live/status) on the same
   cadence and backoff, and when it turns true it asks the server for the page again —
   router.refresh(), not a reload, so nothing flashes. The server, not this component,
   decides what the parent sees: the token is checked again and the video id still never
   passes through anything public.

   It also refreshes every five minutes regardless, so the "next session" line cannot sit
   there stale all evening if a booking moves.

   ONE DIRECTION ONLY. This is mounted on the off-air and can't-tell pages, never on the
   picture: a single failed status read must not pull a parent out of a session that is
   still running. */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LIVE_STATUS_PATH, parseLiveStatus, pollDelayMs } from './live-now-pure'

const FULL_REFRESH_MS = 5 * 60_000

export default function OffAirRefresh() {
  const router = useRouter()

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
      if (document.hidden) return arm(pollDelayMs(0))
      try {
        const res = await fetch(LIVE_STATUS_PATH, { cache: 'no-store' })
        if (!res.ok) throw new Error(`status ${res.status}`)
        failures = 0
        // Keep polling after a refresh too. The server's own read can lag this one by
        // its 30 s cache, and if it does the page comes back off air; the next look
        // tries again. Once the picture renders, this component is gone and so is the loop.
        if (parseLiveStatus(await res.json()) && !stopped) router.refresh()
      } catch {
        failures += 1
      }
      if (!stopped) arm(pollDelayMs(failures))
    }

    const onVisible = () => {
      if (!document.hidden && !stopped) void look()
    }
    const full = setInterval(() => {
      if (!document.hidden && !stopped) router.refresh()
    }, FULL_REFRESH_MS)

    void look()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      clearInterval(full)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router])

  return null
}
