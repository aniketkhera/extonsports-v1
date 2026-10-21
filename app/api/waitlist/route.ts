// POST /api/waitlist: the footer bar's "Join our mailing list".
//
// mailer-admin's subscribe route does all the work, unedited (dedupe, resubscribe, welcome,
// tags/UTM/geo, honeypot, per-IP limit). Since 2026-10-21 it runs inside
// createFooterSubscribe, which turns the package's plain owner notice off and sends Exton's
// new one (lib/signup-notice.ts) for a genuinely new address only. footer-notice.ts says
// why it is a wrapper and not a change to the shared package.
//
// The notice is sent in after(), so the visitor's answer, the package's own Response, is
// not held up by it.

import { after } from 'next/server'
import { config } from '@/mailer-admin.config'
import { createFooterSubscribe } from './footer-notice'

export const { POST } = createFooterSubscribe(config, {
  defer: (work) =>
    after(async () => {
      try { await work() } catch (e) {
        console.error('[waitlist] notice: unexpected:', e instanceof Error ? e.name : 'error')
      }
    }),
})
