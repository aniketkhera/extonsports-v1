// Send pipeline. Takes a compiled-once email (subject + bodyHtml +
// body_md) and a list of recipients, batches them through Resend,
// interpolating each recipient's unique unsubscribe token into the
// rendered footer link.
//
// Why interpolate per recipient instead of using {{token}} merge
// fields: Resend supports per-recipient variables but the more
// portable approach is to render each recipient's HTML on our side.
// At 200 contacts × 1 send/week this is irrelevant overhead.
//
// List-Unsubscribe headers are set on every send so Gmail / Apple
// Mail show their built-in one-tap unsubscribe button. This is also
// a strong deliverability signal — Gmail boosts senders who set it.

import { Resend } from 'resend'
import { renderEmailHtml } from './email-template'

const BATCH_SIZE = 100
const BATCH_DELAY_MS = 1100

export type Recipient = {
  email: string
  unsubscribe_token: string
}

export type SendArgs = {
  subject: string
  bodyHtml: string  // pre-rendered (markdownToEmailHtml output, NOT yet wrapped in shell)
  recipients: Recipient[]
}

export type SendReport = {
  sent: number
  failed: number
  errors: Array<{ batchIndex: number; emails: string[]; message: string }>
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://extonsports.com'
// FROM switches to news@extonsports.com once the domain is verified
// on Resend (Task #9 — DNS records in Squarespace). Until then,
// noreply@orangish.io is the verified fallback.
const FROM = process.env.RESEND_FROM || 'Exton Sports <noreply@orangish.io>'
const REPLY_TO = 'info@extonsports.com'

export function unsubscribeUrl(token: string): string {
  return `${APP_URL.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`
}

export async function sendMailer(args: SendArgs): Promise<SendReport> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')

  const resend = new Resend(key)
  const report: SendReport = { sent: 0, failed: 0, errors: [] }

  for (let i = 0; i < args.recipients.length; i += BATCH_SIZE) {
    const batch = args.recipients.slice(i, i + BATCH_SIZE)
    const payload = batch.map(r => {
      const unsubUrl = unsubscribeUrl(r.unsubscribe_token)
      return {
        from: FROM,
        to: r.email,
        replyTo: REPLY_TO,
        subject: args.subject,
        html: renderEmailHtml({
          subject: args.subject,
          bodyHtml: args.bodyHtml,
          unsubscribeUrl: unsubUrl,
        }),
        headers: {
          // Gmail/Apple/Outlook show a built-in Unsubscribe button
          // when this header is present. The Post header tells
          // clients they can call it via a single POST request — no
          // landing page redirect needed for the in-client UI path.
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const { error } = await resend.batch.send(payload)
      if (error) {
        report.failed += batch.length
        report.errors.push({
          batchIndex: i / BATCH_SIZE,
          emails: batch.map(b => b.email),
          message: error.message || 'unknown Resend error',
        })
      } else {
        report.sent += batch.length
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'network error'
      report.failed += batch.length
      report.errors.push({
        batchIndex: i / BATCH_SIZE,
        emails: batch.map(b => b.email),
        message: msg,
      })
    }

    // Resend's rate limit is 10 req/s on the batch endpoint. 1.1s
    // between batches is comfortable. Skip the delay after the last
    // batch.
    if (i + BATCH_SIZE < args.recipients.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  return report
}

// Sending a single email — used by the magic-link auth flow and the
// "send test to self" composer button. Shares the same FROM /
// REPLY_TO so domain auth is consistent.
export async function sendOne(args: {
  to: string
  subject: string
  html: string
  // Plaintext List-Unsubscribe is omitted for transactional sends
  // (magic links, test sends) because those don't need it.
}): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const resend = new Resend(key)
  const { error } = await resend.emails.send({
    from: FROM,
    to: args.to,
    replyTo: REPLY_TO,
    subject: args.subject,
    html: args.html,
  })
  if (error) throw new Error(error.message || 'Resend send failed')
}
