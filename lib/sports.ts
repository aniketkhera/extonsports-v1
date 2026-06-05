// Sport-interest segmentation for subscribers.
//
// Stored as namespaced entries in the existing `subscribers.tags[]`
// array — e.g. "sport:cricket" — so NO schema change is needed (the
// column + its GIN index already exist and are shared across every
// property site) and one subscriber can carry interest in several
// sports at once. The five sports mirror the public site (Sports.tsx).
//
// Why tags[] and not the `source` column: `source` is the acquisition
// channel ("homepage", "manual", "wix-migration", "cricket-outreach").
// Sport interest is a separate, potentially multi-valued attribute — a
// cricket prospect who signs up through the homepage is source=homepage
// but tags=["sport:cricket"]. Keeping them apart means the Traffic
// dashboard can answer both "where did they come from" and "which sport
// pulled them in" independently.
//
// Isomorphic + dependency-free: safe to import from both client
// components and server routes.

export const SPORTS = ['cricket', 'squash', 'badminton', 'turf', 'fitness'] as const
export type Sport = (typeof SPORTS)[number]

const SPORT_SET: ReadonlySet<string> = new Set(SPORTS)
export const SPORT_TAG_PREFIX = 'sport:'

export function isKnownSport(value: string | null | undefined): value is Sport {
  return !!value && SPORT_SET.has(value.toLowerCase())
}

// "cricket" → "sport:cricket". Returns null for an unknown/empty value
// so callers never persist a garbage tag.
export function sportTag(value: string | null | undefined): string | null {
  return isKnownSport(value) ? `${SPORT_TAG_PREFIX}${value.toLowerCase()}` : null
}

export function isSportTag(tag: string): boolean {
  return tag.startsWith(SPORT_TAG_PREFIX)
}

// "sport:cricket" → "cricket"
export function sportFromTag(tag: string): string {
  return tag.slice(SPORT_TAG_PREFIX.length)
}

// Pull the sport names out of a subscriber's tags[] (drops any
// non-sport tags so this is safe to use as tags[] gains other uses).
export function sportsFromTags(tags: string[] | null | undefined): string[] {
  return (tags || []).filter(isSportTag).map(sportFromTag)
}

// Title-case for display: "cricket" → "Cricket".
export function sportLabel(sport: string): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

// Best-effort sport inference for an inbound signup. Prefers an explicit
// ?sport= param, then falls back to a UTM that names a sport — so a link
// like ?utm_source=cricket or ?utm_campaign=cricket-gpcl auto-segments
// even when the outreach link forgot the explicit param. Only the first
// token (split on common separators) is considered, so "cricket-gpcl"
// resolves to "cricket".
export function deriveSport(
  explicit: string | null | undefined,
  utmSource: string | null | undefined,
  utmCampaign: string | null | undefined,
): Sport | null {
  const firstToken = (v: string | null | undefined) =>
    (v || '').toLowerCase().split(/[-_:./ ]/)[0]
  for (const candidate of [explicit, utmSource, utmCampaign].map(firstToken)) {
    if (isKnownSport(candidate)) return candidate
  }
  return null
}
