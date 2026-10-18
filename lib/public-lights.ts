// The lights schedule the public relay (app/api/court-slots/route.ts) may forward.
// Here, not in the route: a Next.js route module may export only route fields — its
// generated types reject anything else (found 2026-10-18 by tsc over .next/dev/types).

/**
 * The lights SCHEDULE, for the unkeyed extonsports.com/reception (2026-10-18, Aniket:
 * "Add there too" — the chip was on the televisions only). When each automated sport's
 * lights are meant to be on: the platform's lighting_windows, which are this feed's own
 * blocks plus 15 minutes either side, so nothing new is published.
 *
 * ⛔ `bridge` IS ALWAYS null HERE. What the on-site bridge last transmitted, and any staff
 * override, say when somebody is actually in the hall; they reach a TV only through its
 * key (the platform's court-board feed). The platform does not send them on this feed,
 * and this relay would not forward them if it did.
 */
export type PublicLights = {
  sports: string[]
  now: string
  windows: { zone: string; on_at: string; off_at: string }[]
  bridge: null
}

const ZONE = /^[a-z][a-z0-9 -]{0,39}$/
const isTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/** The upstream `lights`, cut to the schedule — or undefined. ⛔ A window that does not
 *  parse withholds them ALL, as the platform does: dropping one could put LIGHTS OFF over
 *  a court that is lit. */
export function publicLights(raw: unknown): PublicLights | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const l = raw as { sports?: unknown; now?: unknown; windows?: unknown }
  if (!Array.isArray(l.sports) || !Array.isArray(l.windows) || !isTime(l.now)) return undefined
  const windows: PublicLights['windows'] = []
  for (const w of l.windows as unknown[]) {
    const x = w as { zone?: unknown; on_at?: unknown; off_at?: unknown } | null
    if (!x || typeof x.zone !== 'string' || !ZONE.test(x.zone) || !isTime(x.on_at) || !isTime(x.off_at)) {
      return undefined
    }
    windows.push({ zone: x.zone, on_at: x.on_at, off_at: x.off_at })
  }
  const sports = (l.sports as unknown[]).filter((s): s is string => typeof s === 'string' && ZONE.test(s))
  return sports.length ? { sports, now: l.now, windows, bridge: null } : undefined
}
