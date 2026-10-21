/* The real Resend send and database count behind Exton's signup notice (lib/signup-notice.ts),
   for the two routes that send it: the My bookings popup and the footer bar (2026-10-21).
   ──────────────────────────────────────────────────────────────────────────────────
   Why not mailer-admin's sendOne: it sends html only. The notice also carries a plain-text
   part (better for deliverability, and for anyone reading mail as text), so this is
   sendOne plus `text`: the same From and Reply-To from the same config, so the notice comes
   from Exton Sports Center <noreply@extonsports.com> like every other Exton list email
   (mailer-admin.config.ts says why that address). */

import { Resend } from 'resend'
import type { MailerConfig } from 'mailer-admin/config'
import { countActiveSubscribers, EXTON_HOST, type NoticeDeps, type NoticeMail } from './signup-notice'

/** mailer-admin's sendOne, plus the plain-text part. Throws on failure; sendSignupNotice
 *  catches and logs it. */
export async function sendNoticeMail(cfg: MailerConfig, mail: NoticeMail): Promise<void> {
  const key = cfg.resend.apiKey
  if (!key) throw new Error('RESEND_API_KEY is not set')
  const { error } = await new Resend(key).emails.send({
    from: cfg.resend.from,
    to: mail.to,
    ...(cfg.email.replyTo ? { replyTo: cfg.email.replyTo } : {}),
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  })
  if (error) throw new Error(error.message || 'Resend send failed')
}

/** Everything sendSignupNotice needs, from the site's mailer config. */
export function noticeDepsFor(cfg: MailerConfig, log: (message: string) => void = (m) => console.error(m)): NoticeDeps {
  return {
    brand: {
      name: cfg.brandName,
      host: EXTON_HOST,
      logoUrl: cfg.email.logoUrl,
      theme: cfg.theme,
    },
    // The database creds are read per call, like mailer-admin's own client, so a deploy
    // without them still builds and simply leaves the count row out.
    countActive: () => countActiveSubscribers(cfg.supabase(), cfg.property),
    send: (mail) => sendNoticeMail(cfg, mail),
    log,
  }
}
