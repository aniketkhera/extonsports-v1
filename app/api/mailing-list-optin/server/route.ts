// POST /api/mailing-list-optin/server — the waiver signing link's mailing-list box
// (2026-11-15). The platform's server calls this, with a shared secret, when a signer leaves
// the box ticked. The contract and every rule are in server-core.ts and its tests; the
// insert-only rule itself is the popup's (../optin-core.ts). This file only plugs in the
// secret, the total-per-minute cap and the live database and email (../live-deps.ts).
//
// The answer goes back BEFORE the database is touched; the lookup, the insert and the two
// emails run in after(), so neither the body nor the response time says whether the address
// was already on the list.

import { NextRequest, NextResponse, after } from 'next/server'
import { liveDeps } from '../live-deps'
import { createTotalCap, handleServerOptin, SERVER_LIMIT, SERVER_WINDOW_MS, type ServerOptinDeps } from './server-core'

const deps: ServerOptinDeps = {
  ...liveDeps,
  // Read per request, never at build time: unset means 503, not a crashed deploy. Vercel
  // still applies a new or changed variable only to the NEXT deployment, so set the secret
  // on this site before this route deploys, or redeploy after setting it (2026-11-15 review).
  secret: () => process.env.EXTON_OPTIN_SECRET,
  allow: createTotalCap(SERVER_LIMIT, SERVER_WINDOW_MS),
}

export async function POST(req: NextRequest) {
  const reply = await handleServerOptin(req, deps)
  const work = reply.work
  if (work) {
    after(async () => {
      try { await work() } catch (e) {
        console.error('[mailing-list-optin/server] unexpected:', e instanceof Error ? e.name : 'error')
      }
    })
  }
  return NextResponse.json(reply.body, { status: reply.status })
}
