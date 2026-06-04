import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '../../lib/auth-guard'
import { selectRows, supabaseConfigured } from '../../lib/supabase'
import { AdminNav } from './layout'

export const dynamic = 'force-dynamic'

type SubscriberCounts = {
  total: number
  active: number
  unsubscribed: number
  last7: number
}

type Mailer = {
  id: string
  subject: string
  sent_at: string
  recipient_count: number
}

async function loadStats(): Promise<{ counts: SubscriberCounts; lastMailer: Mailer | null }> {
  if (!supabaseConfigured()) {
    return { counts: { total: 0, active: 0, unsubscribed: 0, last7: 0 }, lastMailer: null }
  }
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString()
    // Three parallel fetches.
    const [all, unsub, recent, lastMailerRows] = await Promise.all([
      selectRows<{ id: string }>('subscribers', { select: 'id' }),
      selectRows<{ id: string }>('subscribers', { select: 'id', filters: { unsubscribed_at: 'not.is.null' } }),
      selectRows<{ id: string }>('subscribers', { select: 'id', filters: { subscribed_at: `gte.${sevenDaysAgo}`, unsubscribed_at: 'is.null' } }),
      selectRows<Mailer>('mailers', { select: 'id,subject,sent_at,recipient_count', order: 'sent_at.desc', limit: 1 }),
    ])
    return {
      counts: {
        total: all.length,
        active: all.length - unsub.length,
        unsubscribed: unsub.length,
        last7: recent.length,
      },
      lastMailer: lastMailerRows[0] || null,
    }
  } catch (e) {
    console.error('[/admin] stats load failed:', e instanceof Error ? e.message : e)
    return { counts: { total: 0, active: 0, unsubscribed: 0, last7: 0 }, lastMailer: null }
  }
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const { counts, lastMailer } = await loadStats()

  return (
    <>
      <AdminNav active="dashboard" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D0D0D', margin: '0 0 6px 0' }}>
          Welcome back.
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px 0' }}>
          Mailing list + outreach for ExtonSports.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <Stat label="Active subscribers" value={counts.active} />
          <Stat label="Unsubscribed"       value={counts.unsubscribed} tone="muted" />
          <Stat label="Signups (last 7d)"  value={counts.last7} tone="accent" />
          <Stat label="Total ever"         value={counts.total} tone="muted" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Tile href="/admin/compose" title="Compose new mailer" desc="Send a weekly update or promo to your subscribers." cta="Open composer →" />
          <Tile href="/admin/subscribers" title="Manage subscribers" desc="View, add, import, or export your mailing list." cta="Open list →" />
        </div>

        <div style={{ marginTop: 28, padding: '20px 22px', background: '#fff', border: '1px solid #E8D5C8', borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>
            Most recent mailer
          </div>
          {lastMailer ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0D0D0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lastMailer.subject}
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  {new Date(lastMailer.sent_at).toLocaleString()} · {lastMailer.recipient_count} recipients
                </div>
              </div>
              <Link href="/admin/sends" style={{ fontSize: 13, fontWeight: 700, color: '#F37A4A', textDecoration: 'none' }}>View all →</Link>
            </div>
          ) : (
            <div style={{ fontSize: 14, color: '#888' }}>
              No mailers sent yet. <Link href="/admin/compose" style={{ color: '#F37A4A', fontWeight: 700 }}>Send your first →</Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

function Stat({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'muted' | 'accent' }) {
  const color = tone === 'accent' ? '#F37A4A' : tone === 'muted' ? '#888' : '#0D0D0D'
  return (
    <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function Tile({ href, title, desc, cta }: { href: string; title: string; desc: string; cta: string }) {
  return (
    <Link href={href} style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 14, padding: '20px 22px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#0D0D0D', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#666', lineHeight: 1.55, marginBottom: 12 }}>{desc}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#F37A4A' }}>{cta}</div>
    </Link>
  )
}
