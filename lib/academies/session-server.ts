import { cookies } from 'next/headers'
import { ACADEMY_COOKIE, ACADEMY_LINK_COOKIE, TOKEN_RE } from './session'

// Cookie READS for /academies, 2026-11-16. Split from ./session.ts only because next/headers
// cannot load under node:test (lib/my-bookings/session-server.ts, the same split).
//
// Shape-checked on the way in, so a hand-edited or truncated cookie is treated as absent
// rather than forwarded to the platform as a bearer. Reading works in a page as well as a
// route handler; WRITING does not (Next 16 docs, cookies.md) — every set/clear is in
// app/api/academies/* and app/academies/link/route.ts.

async function read(name: string): Promise<string | null> {
  const v = (await cookies()).get(name)?.value
  return v && TOKEN_RE.test(v) ? v : null
}

export function readAcademyToken(): Promise<string | null> {
  return read(ACADEMY_COOKIE)
}

export function readAcademyLink(): Promise<string | null> {
  return read(ACADEMY_LINK_COOKIE)
}
