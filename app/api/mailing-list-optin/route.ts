// POST /api/mailing-list-optin — the "Add me to the Exton Sports mailing list" box in the
// My bookings popup (2026-10-21). All the rules live in optin-core.ts and its tests; this
// file only plugs in mailer-admin's database client and email shell, the same ones the
// footer's /api/waitlist uses, so the row lands on the same property-scoped list and a new
// address gets the same welcome.
//
// The answer goes back BEFORE the database is touched; the lookup, the insert and the two
// emails run in after(), so neither the body nor the response time says whether the
// address was already on the list (Vercel keeps the function alive for them).

import { NextRequest, NextResponse, after } from 'next/server'
import { createSupabase } from 'mailer-admin/lib/supabase'
import { sendOne, renderEmailHtml, markdownToEmailHtml, unsubscribeUrl } from 'mailer-admin/lib/email'
import { config } from '@/mailer-admin.config'
import { createRateLimiter, handleOptin, OPTIN_LIMIT, OPTIN_WINDOW_MS, type OptinDeps } from './optin-core'

const supa = createSupabase(config)

const deps: OptinDeps = {
  site: config,
  // Only the two calls the rule allows are handed over: a lookup and a plain insert.
  db: {
    configured: () => supa.configured(),
    selectRows: (table, opts) => supa.selectRows(table, opts),
    insertRow: (table, row) => supa.insertRow(table, row),
  },
  mail: {
    send: (a) => sendOne(config, a),
    welcomeHtml: ({ subject, bodyMd, token }) =>
      renderEmailHtml(config, {
        subject,
        bodyHtml: markdownToEmailHtml(bodyMd, { linkColor: config.theme.accent }),
        unsubscribeUrl: unsubscribeUrl(config, token),
      }),
  },
  allow: createRateLimiter(OPTIN_LIMIT, OPTIN_WINDOW_MS),
  log: (m) => console.error(m),
  accent: config.theme.accent,
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
