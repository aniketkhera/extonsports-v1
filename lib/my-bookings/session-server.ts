import { cookies } from 'next/headers'
import { DEVICE_COOKIE, LINK_COOKIE, PACK_SEL_COOKIE, TOKEN_RE, decodePackSel, type PackSelection } from './session'

// Cookie READS for /my-bookings, 2026-10-20. Split from ./session.ts only because
// next/headers cannot load under node:test; everything that decides anything is there.
//
// Shape-checked on the way in, so a hand-edited or truncated cookie is treated as absent
// rather than forwarded to the platform as a bearer. Reading works in a page as well as a
// route handler; WRITING does not (Next 16 docs, cookies.md) — every set/clear is in
// app/api/my-bookings/* and app/my-bookings/link/route.ts.

async function read(name: string): Promise<string | null> {
  const v = (await cookies()).get(name)?.value
  return v && TOKEN_RE.test(v) ? v : null
}

export function readDeviceToken(): Promise<string | null> {
  return read(DEVICE_COOKIE)
}

export function readLinkToken(): Promise<string | null> {
  return read(LINK_COOKIE)
}

/**
 * The court pack slot parked by GET /my-bookings/pack/start, or null, 2026-10-21
 * (orangish-app docs/court-packs.md §8.1). Re-checked by ./session.ts decodePackSel, the
 * same rules as the query string it came from, so a hand-edited cookie reads as "no slot"
 * ("Pick a time first"), never as a slot the platform is asked about. Clearing it is the
 * book route's job (POST /api/my-bookings/pack/book, on booked or already).
 */
export async function readPackSelection(): Promise<PackSelection | null> {
  return decodePackSel((await cookies()).get(PACK_SEL_COOKIE)?.value)
}
