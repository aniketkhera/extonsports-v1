// The real database and email behind both mailing-list boxes: the My bookings popup
// (route.ts, 2026-10-21) and the waiver signing link (server/route.ts, 2026-11-15). Moved
// out of route.ts on 2026-11-15 so the two routes are handed the SAME two database calls and
// the same email shell, and cannot drift. mailer-admin's client and shell, the same ones the
// footer's /api/waitlist uses, so a row lands on the same property-scoped list and a new
// address gets the same welcome. Each route adds its own limiter (`allow`).

import { createSupabase } from 'mailer-admin/lib/supabase'
import { sendOne, renderEmailHtml, emailBodyHtml, unsubscribeUrl } from 'mailer-admin/lib/email'
import { config } from '@/mailer-admin.config'
import { noticeDepsFor } from '@/lib/signup-notice-send'
import type { OptinDeps } from './optin-core'

const supa = createSupabase(config)

export const liveDeps: Omit<OptinDeps, 'allow'> = {
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
        bodyHtml: emailBodyHtml(config, bodyMd),
        unsubscribeUrl: unsubscribeUrl(config, token),
      }),
  },
  log: (m) => console.error(m),
  // The staff notice, the same one the footer sends (lib/signup-notice.ts, 2026-10-21).
  notice: noticeDepsFor(config),
}
