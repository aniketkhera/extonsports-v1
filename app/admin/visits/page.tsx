import { redirect } from 'next/navigation'
import { getAdminSession } from '../../../lib/auth-guard'
import { selectRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { AdminNav } from '../layout'

export const dynamic = 'force-dynamic'

type Visit = {
  referrer: string | null
  utm_source: string | null
  utm_campaign: string | null
  region: string | null
  country: string | null
  device: string | null
  is_bot: boolean
  created_at: string
}

// Fetch last-30-day human visits and aggregate in-memory. At a
// coming-soon page's volume this is a few thousand rows max — cheap.
// (PostgREST GROUP BY would need an RPC; not worth it at this scale.)
async function loadVisits(): Promise<Visit[]> {
  if (!supabaseConfigured()) return []
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()
    return await selectRows<Visit>('visits', {
      select: 'referrer,utm_source,utm_campaign,region,country,device,is_bot,created_at',
      filters: { property: `eq.${PROPERTY}`, is_bot: 'eq.false', created_at: `gte.${since}` },
      order: 'created_at.desc',
      limit: 10000,
    })
  } catch (e) {
    console.error('[/admin/visits] load failed:', e instanceof Error ? e.message : e)
    return []
  }
}

function tally<T extends string>(rows: Visit[], key: (v: Visit) => T | null): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r) || '—'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

// Collapse a full referrer URL to its hostname for grouping.
function refHost(r: string | null): string {
  if (!r) return 'Direct / none'
  try {
    const h = new URL(r).hostname.replace(/^www\./, '')
    return h || 'Direct / none'
  } catch {
    return r.slice(0, 40)
  }
}

export default async function VisitsPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')

  const visits = await loadVisits()
  const now = Date.now()
  const within = (ms: number) => visits.filter(v => now - new Date(v.created_at).getTime() <= ms).length
  const today = within(24 * 3600_000)
  const last7 = within(7 * 24 * 3600_000)
  const last30 = visits.length

  const byRegion   = tally(visits, v => v.region)
  const byReferrer = tally(visits, v => refHost(v.referrer))
  const byDevice   = tally(visits, v => v.device)
  const byCampaign = tally(visits.filter(v => v.utm_source), v => v.utm_source)

  return (
    <>
      <AdminNav active="visits" />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D0D0D', margin: '0 0 6px 0' }}>
          Traffic
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 28px 0' }}>
          Every visit to extonsports.com — last 30 days, bots excluded.
          {' '}For full charts (over-time, real-time) see the Vercel Analytics tab.
        </p>

        {last30 === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 14, padding: '28px 22px', color: '#888', fontSize: 14, lineHeight: 1.6 }}>
            No visits logged yet. Once the <code>visits</code> table migration is applied and the
            site has had traffic, region / referrer / device breakdowns appear here.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
              <Stat label="Visits today"   value={today} tone="accent" />
              <Stat label="Last 7 days"    value={last7} />
              <Stat label="Last 30 days"   value={last30} tone="muted" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <BarCard title="By region (state)" rows={byRegion} total={last30} />
              <BarCard title="Where they came from" rows={byReferrer} total={last30} />
              <BarCard title="Device" rows={byDevice} total={last30} />
              <BarCard title="Campaign (utm_source)" rows={byCampaign} total={byCampaign.reduce((s, r) => s + r.count, 0)} emptyHint="Tag your shared links with ?utm_source=… to see campaigns here." />
            </div>
          </>
        )}
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
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value.toLocaleString()}</div>
    </div>
  )
}

function BarCard({ title, rows, total, emptyHint }: {
  title: string
  rows: Array<{ label: string; count: number }>
  total: number
  emptyHint?: string
}) {
  const top = rows.slice(0, 8)
  const max = top.length ? top[0].count : 1
  return (
    <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: 14 }}>
        {title}
      </div>
      {top.length === 0 ? (
        <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{emptyHint || 'No data yet.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {top.map(r => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0
            return (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: '#0D0D0D', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r.label}</span>
                  <span style={{ color: '#888' }}>{r.count} · {pct}%</span>
                </div>
                <div style={{ height: 6, background: '#F3E7DD', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(3, Math.round((r.count / max) * 100))}%`, background: '#F37A4A', borderRadius: 9999 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
