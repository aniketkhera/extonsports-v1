import { redirect } from 'next/navigation'
import { getAdminSession } from '../../../lib/auth-guard'
import { selectRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { AdminNav } from '../layout'
import SubscribersClient, { type SubscriberRow } from './SubscribersClient'

export const dynamic = 'force-dynamic'

export default async function SubscribersPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  let rows: SubscriberRow[] = []
  let loadError: string | null = null

  if (supabaseConfigured()) {
    try {
      rows = await selectRows<SubscriberRow>('subscribers', {
        select: 'id,email,first_name,last_name,source,tags,subscribed_at,unsubscribed_at',
        filters: { property: `eq.${PROPERTY}` },
        order: 'subscribed_at.desc',
        limit: 1000,
      })
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Could not load subscribers.'
    }
  } else {
    loadError = 'Supabase env vars not configured on this deployment.'
  }

  return (
    <>
      <AdminNav active="subscribers" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <SubscribersClient initialRows={rows} loadError={loadError} />
      </main>
    </>
  )
}
