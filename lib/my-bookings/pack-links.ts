// Short links to the buy page, for flyers and QR codes, 2026-10-25 (Aniket asked for it):
// www.extonsports.com/court-packs/badminton and /court-packs/cricket land on /court-packs
// with that sport's tile already picked. Pure — node:test loads it as is; the route that
// uses it is app/court-packs/[sport]/route.ts.
//
// WHY A NAME AND NOT AN ID: the page picks a sport by the platform's sport UUID
// (?sport=<id>), and a UUID cannot be printed on a flyer or kept in step with the platform
// by hand. So the slug is matched against the sport NAMES in the live offers list (the
// same one the page renders, lib/my-bookings/platform.ts packOffers) and the id is read
// from there. No id is kept on this site: a sport the platform renames or stops selling
// simply stops matching, and the visitor still lands on /court-packs, which shows what IS
// on sale (or PACK_BUY_COPY.notOnSale).
//
// FAILS TO THE PLAIN PAGE, NEVER TO AN ERROR: a slug of the wrong shape, one that names no
// sport on sale, two sports that would both answer to it, or no offers at all — every one
// is PACK_PATH. A printed QR code can only ever land somewhere that works.

import { PACK_PATH, packBuyUrl } from '../booking'

/**
 * A short link's slug: lower-case letters and hyphens, 1–30 of them (2026-10-25). Anything
 * else is refused before the platform is asked — the route makes no call for it.
 */
export const PACK_LINK_SLUG_RE = /^[a-z-]{1,30}$/

/** How a sport's name reads in a short link: "Badminton" → "badminton", "Table Tennis" →
 *  "table-tennis". Case-insensitive by construction; a name with any other character
 *  (digits, punctuation) never matches a valid slug, and so is simply not short-linked. */
export function sportSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

/**
 * The ONE sport id whose offers carry this slug's name, or null. Several offers per sport
 * are normal (a 5-pack and a 10-pack, 2026-10-22) and count once; two DIFFERENT sport ids
 * answering to one name cannot be told apart from a flyer, so they pick neither.
 */
export function packSportForSlug(
  slug: unknown,
  offers: ReadonlyArray<{ sportId: string; sport: string }> | null,
): string | null {
  if (typeof slug !== 'string' || !PACK_LINK_SLUG_RE.test(slug) || !offers) return null
  const ids = new Set(offers.filter((o) => sportSlug(o.sport) === slug).map((o) => o.sportId))
  return ids.size === 1 ? [...ids][0] : null
}

/**
 * A short link's ?credits=, read exactly as app/court-packs/page.tsx reads its own: a whole
 * number of one or two digits, or nothing. Whether that size is ON SALE is packBuyUrl's to
 * decide against the offers, so a /court-packs/badminton?credits=10 flyer keeps working
 * only while the 10-pack does.
 */
export function packLinkCredits(v: string | null | undefined): number | null {
  return typeof v === 'string' && /^[1-9]\d?$/.test(v) ? Number(v) : null
}

/**
 * Where /court-packs/<slug> sends the visitor: "/court-packs?sport=<id>" (with "&credits=<n>"
 * when that size is on sale for that sport), built by lib/booking.ts packBuyUrl — the one
 * builder of that address — or plain PACK_PATH when the slug picks no sport.
 */
export function packLinkTarget(
  slug: unknown,
  offers: ReadonlyArray<{ sportId: string; sport: string; credits: number }> | null,
  credits?: number | null,
): string {
  const sportId = packSportForSlug(slug, offers)
  return (sportId && packBuyUrl(sportId, offers, credits)) || PACK_PATH
}
