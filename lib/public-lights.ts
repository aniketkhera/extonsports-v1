// The lights block the public relay (app/api/court-slots/route.ts) may forward.
// Here, not in the route: a Next.js route module may export only route fields — its
// generated types reject anything else (found 2026-10-18 by tsc over .next/dev/types).

/**
 * The lights, for the unkeyed extonsports.com/reception and /vestibule (2026-10-18, Aniket:
 * "Add there too" — the chip was on the televisions only). Two halves:
 *
 * - The SCHEDULE: when each automated sport's lights are meant to be on. The platform's
 *   lighting_windows, which are this feed's own blocks plus 15 minutes either side.
 * - The LIVE STATE, since 2026-10-21 (`bridge`): what the on-site bridge last reported
 *   for each zone, and any staff override with when it ends. Until then this relay
 *   always sent `bridge: null`, because the live state says when somebody is in the
 *   hall, and it reached only a TV, through its key. Then a staff override lit squash
 *   with no booking, the TVs said LIGHTS ON and his laptop LIGHTS OFF, and Aniket asked,
 *   knowing what it shows: "show the real on/off state on the public page too (that's
 *   helpful for me too to check)".
 *
 * ⛔ STILL AN ALLOW-LIST, NOT A PASS-THROUGH. Per zone: its name (only a sport listed in
 * `sports`), on/off, and an override's on/off and end. Nothing else the upstream might
 * grow reaches a public page. The bridge's own transmit and error times are dropped
 * upstream already (the platform's shapeLightBridge), and would be dropped here if they
 * were not.
 */
export type PublicLightZone = {
  zone: string
  on: boolean | null
  override: { on: boolean; until: string } | null
}

export type PublicLights = {
  sports: string[]
  now: string
  windows: { zone: string; on_at: string; off_at: string }[]
  bridge: null | { reported_at: string; zones: PublicLightZone[] }
}

const ZONE = /^[a-z][a-z0-9 -]{0,39}$/
const isTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
/** The platform reads at most 20 bridge zones (lighting_bridge_report's own cap). */
const MAX_ZONES = 20

/** The upstream bridge, cut to what the chip reads — or null. LENIENT, unlike the
 *  windows below: a bridge that does not parse costs only the live state, and the chip
 *  then follows the schedule, exactly as it does when a report is stale. */
function publicBridge(raw: unknown, sports: ReadonlySet<string>): PublicLights['bridge'] {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as { reported_at?: unknown; zones?: unknown }
  if (!isTime(b.reported_at) || !Array.isArray(b.zones)) return null
  const zones: PublicLightZone[] = []
  for (const z of (b.zones as unknown[]).slice(0, MAX_ZONES)) {
    const x = z as { zone?: unknown; on?: unknown; override?: unknown } | null
    if (!x || typeof x.zone !== 'string' || !sports.has(x.zone)) continue
    const o = x.override as { on?: unknown; until?: unknown } | null | undefined
    zones.push({
      zone: x.zone,
      on: typeof x.on === 'boolean' ? x.on : null,
      override: o && typeof o === 'object' && typeof o.on === 'boolean' && isTime(o.until)
        ? { on: o.on, until: o.until }
        : null,
    })
  }
  return { reported_at: b.reported_at, zones }
}

/** The upstream `lights`, cut to the allow-list — or undefined. ⛔ A window that does not
 *  parse withholds them ALL, as the platform does: dropping one could put LIGHTS OFF over
 *  a court that is lit. */
export function publicLights(raw: unknown): PublicLights | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const l = raw as { sports?: unknown; now?: unknown; windows?: unknown; bridge?: unknown }
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
  if (!sports.length) return undefined
  return { sports, now: l.now, windows, bridge: publicBridge(l.bridge, new Set(sports)) }
}
