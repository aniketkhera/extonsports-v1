import { redirect } from 'next/navigation'
import { getAdminSession } from '../../../lib/auth-guard'
import { selectRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { AdminNav } from '../layout'
import ComposeClient, { type RecipientRow } from './ComposeClient'

export const dynamic = 'force-dynamic'

export default async function ComposePage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  let recipients: RecipientRow[] = []
  let loadError: string | null = null
  if (supabaseConfigured()) {
    try {
      recipients = await selectRows<RecipientRow>('subscribers', {
        select: 'id,email,first_name,last_name,source,tags',
        filters: { property: `eq.${PROPERTY}`, unsubscribed_at: 'is.null' },
        order: 'subscribed_at.desc',
        limit: 5000,
      })
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Could not load recipients.'
    }
  } else {
    loadError = 'Supabase env vars not configured on this deployment.'
  }

  return (
    <>
      <AdminNav active="compose" />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 48px' }}>
        <ComposeClient
          recipients={recipients}
          loadError={loadError}
          adminEmail={session.email}
        />
      </main>
    </>
  )
}
