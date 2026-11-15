// POST /api/mailing-list-optin — the "Add me to the Exton Sports mailing list" box in the
// My bookings popup (2026-10-21). All the rules live in optin-core.ts and its tests; this
// file only plugs in mailer-admin's database client and email shell (live-deps.ts), the same
// ones the footer's /api/waitlist uses, so the row lands on the same property-scoped list
// and a new address gets the same welcome.
//
// The answer goes back BEFORE the database is touched; the lookup, the insert and the two
// emails run in after(), so neither the body nor the response time says whether the
// address was already on the list (Vercel keeps the function alive for them).

import { NextRequest, NextResponse, after } from 'next/server'
import { createRateLimiter, handleOptin, OPTIN_LIMIT, OPTIN_WINDOW_MS, type OptinDeps } from './optin-core'
import { liveDeps } from './live-deps'

// The database, email and staff notice are live-deps.ts's (2026-11-15), shared with the
// waiver link's server route; this route adds its per-IP limit.
const deps: OptinDeps = {
  ...liveDeps,
  allow: createRateLimiter(OPTIN_LIMIT, OPTIN_WINDOW_MS),
}

export async function POST(req: NextRequest) {
  const reply = await handleOptin(req, deps)
  const work = reply.work
  if (work) {
    after(async () => {
      try { await work() } catch (e) {
        console.error('[mailing-list-optin] unexpected:', e instanceof Error ? e.name : 'error')
      }
    })
  }
  return NextResponse.json(reply.body, { status: reply.status })
}
