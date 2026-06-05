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

type Signup = {
  referrer: string | null
  utm_source: string | null
  region: string | null
  subscribed_at: string
}

// Signups in the same 30-day window. Filtered to source='homepage' —
// the people who came through the on-site form (i.e. through a tracked
// visit). Migrated / manually-added subscribers aren't part of the
// visit→signup funnel and would distort conversion (signups with no
// matching visit). This keeps rates ≤ ~100% and meaningful.
async function loadSignups(): Promise<Signup[]> {
  if (!supabaseConfigured()) return []
  try {
    const since = new Date(Date.now() - 30 * 24 * 3600_000).toISOString()
    return await selectRows<Signup>('subscribers', {
      select: 'referrer,utm_source,region,subscribed_at',
      filters: { property: `eq.${PROPERTY}`, source: 'eq.homepage', subscribed_at: `gte.${since}` },
      limit: 10000,
    })
  } catch (e) {
    console.error('[/admin/visits] signups load failed:', e instanceof Error ? e.message : e)
    return []
  }
}

// Count rows by a string key (works for any row shape).
function countByKey<T>(rows: T[], key: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    m.set(k, (m.get(k) || 0) + 1)
  }
  return m
}

// Join visits + signups by a shared key → conversion rows.
type ConvRow = { label: string; visits: number; signups: number; rate: number | null }
function buildConversion<V, S>(
  visits: V[], signups: S[],
  vKey: (v: V) => string, sKey: (s: S) => string,
): ConvRow[] {
  const v = countByKey(visits, vKey)
  const s = countByKey(signups, sKey)
  const labels = new Set<string>([...v.keys(), ...s.keys()])
  return [...labels]
    .map(label => {
      const visits = v.get(label) || 0
      const signups = s.get(label) || 0
      // rate is null (shown "—") when we have signups but no tracked
      // visits — e.g. migrated/pre-logging subscribers. Avoids a
      // misleading 0% or a divide-by-zero Infinity.
      const rate = visits > 0 ? signups / visits : null
      return { label, visits, signups, rate }
    })
    .filter(r => r.visits > 0 || r.signups > 0)
    .sort((a, b) => b.visits - a.visits || b.signups - a.signups)
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

  const [visits, signups] = await Promise.all([loadVisits(), loadSignups()])
  const now = Date.now()
  const within = (ms: number) => visits.filter(v => now - new Date(v.created_at).getTime() <= ms).length
  const today = within(24 * 3600_000)
  const last7 = within(7 * 24 * 3600_000)
  const last30 = visits.length

  const byRegion   = tally(visits, v => v.region)
  const byReferrer = tally(visits, v => refHost(v.referrer))
  const byDevice   = tally(visits, v => v.device)
  const byCampaign = tally(visits.filter(v => v.utm_source), v => v.utm_source)

  // Conversion: visits vs signups, matched by normalized source + region.
  const convBySource = buildConversion(visits, signups, v => refHost(v.referrer), s => refHost(s.referrer))
  const convByRegion = buildConversion(visits, signups, v => v.region || '—', s => s.region || '—')
  const overallRate  = last30 > 0 ? signups.length / last30 : null

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
              <Stat label="Visits today"   value={today} tone="accent" />
              <Stat label="Last 7 days"    value={last7} />
              <Stat label="Last 30 days"   value={last30} tone="muted" />
              <Stat label="Signup rate (30d)" display={overallRate == null ? '—' : `${(overallRate * 100).toFixed(1)}%`} value={signups.length} tone="accent" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <BarCard title="By region (state)" rows={byRegion} total={last30} />
              <BarCard title="Where they came from" rows={byReferrer} total={last30} />
              <BarCard title="Device" rows={byDevice} total={last30} />
              <BarCard title="Campaign (utm_source)" rows={byCampaign} total={byCampaign.reduce((s, r) => s + r.count, 0)} emptyHint="Tag your shared links with ?utm_source=… to see campaigns here." />
            </div>

            <ConversionCard
              title="Conversion by source — visits vs signups"
              rows={convBySource}
              note="Which channels actually produce signups, not just clicks. Rates firm up as traffic builds."
            />
            <div style={{ height: 14 }} />
            <ConversionCard title="Conversion by region" rows={convByRegion} />
          </>
        )}
      </main>
    </>
  )
}

function Stat({ label, value, display, tone = 'normal' }: { label: string; value: number; display?: string; tone?: 'normal' | 'muted' | 'accent' }) {
  const color = tone === 'accent' ? '#F37A4A' : tone === 'muted' ? '#888' : '#0D0D0D'
  return (
    <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{display ?? value.toLocaleString()}</div>
      {display != null && <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{value.toLocaleString()} signups</div>}
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

function ConversionCard({ title, rows, note }: { title: string; rows: ConvRow[]; note?: string }) {
  const top = rows.slice(0, 10)
  return (
    <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#888', marginBottom: note ? 6 : 14 }}>
        {title}
      </div>
      {note && <div style={{ fontSize: 12, color: '#aaa', marginBottom: 14, lineHeight: 1.5 }}>{note}</div>}
      {top.length === 0 ? (
        <div style={{ fontSize: 13, color: '#aaa' }}>No data yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#888', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <th style={{ padding: '4px 0' }}>Source</th>
              <th style={{ padding: '4px 8px', textAlign: 'right' }}>Visits</th>
              <th style={{ padding: '4px 8px', textAlign: 'right' }}>Signups</th>
              <th style={{ padding: '4px 0', textAlign: 'right' }}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {top.map(r => {
              // Highlight a strong converter (≥5% with a meaningful base).
              const strong = r.rate != null && r.rate >= 0.05 && r.visits >= 5
              return (
                <tr key={r.label} style={{ borderTop: '1px solid #F3E7DD' }}>
                  <td style={{ padding: '7px 0', color: '#0D0D0D', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{r.label}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#666' }}>{r.visits.toLocaleString()}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#666' }}>{r.signups.toLocaleString()}</td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 700, color: r.rate == null ? '#bbb' : strong ? '#16A34A' : '#0D0D0D' }}>
                    {r.rate == null ? '—' : `${(r.rate * 100).toFixed(1)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
