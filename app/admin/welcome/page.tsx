import { redirect } from 'next/navigation'
import { getAdminSession } from '../../../lib/auth-guard'
import { selectOne, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { AdminNav } from '../layout'
import WelcomeClient from './WelcomeClient'

export const dynamic = 'force-dynamic'

const DEFAULT_BODY = `Thanks for joining the Exton Sports mailing list!

You'll be the first to hear about news, programs, and updates from Exton Sports.

— The Exton Sports team`

type WelcomeRow = { subject: string; body_md: string; enabled: boolean }

export default async function WelcomePage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  let initial: WelcomeRow = { subject: 'Welcome to Exton Sports', body_md: DEFAULT_BODY, enabled: false }
  if (supabaseConfigured()) {
    try {
      const row = await selectOne<WelcomeRow>('welcome_emails', {
        select: 'subject,body_md,enabled', filters: { property: `eq.${PROPERTY}` },
      })
      if (row) initial = { subject: row.subject, body_md: row.body_md || DEFAULT_BODY, enabled: row.enabled }
    } catch { /* fall back to defaults */ }
  }

  return (
    <>
      <AdminNav active="welcome" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D0D0D', margin: '0 0 6px 0' }}>
          Welcome email
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 24px 0', maxWidth: 620, lineHeight: 1.55 }}>
          When enabled, this is sent automatically to each new subscriber the moment they join the mailing list. Edit it here &mdash; it&rsquo;s the same Markdown the composer uses.
        </p>
        <WelcomeClient initial={initial} adminEmail={session.email} />
      </main>
    </>
  )
}
