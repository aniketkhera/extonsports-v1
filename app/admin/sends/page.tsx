import { redirect } from 'next/navigation'
import { getAdminSession } from '../../../lib/auth-guard'
import { selectRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { AdminNav } from '../layout'
import SendsClient, { type MailerRow } from './SendsClient'

export const dynamic = 'force-dynamic'

export default async function SendsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  let rows: MailerRow[] = []
  let loadError: string | null = null
  if (supabaseConfigured()) {
    try {
      rows = await selectRows<MailerRow>('mailers', {
        select: 'id,subject,body_md,body_html,sent_at,sent_by_email,recipient_count,filter_json,send_errors',
        filters: { property: `eq.${PROPERTY}` },
        order: 'sent_at.desc',
        limit: 200,
      })
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Could not load send history.'
    }
  } else {
    loadError = 'Supabase env vars not configured on this deployment.'
  }

  return (
    <>
      <AdminNav active="sends" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <SendsClient rows={rows} loadError={loadError} />
      </main>
    </>
  )
}
