'use client'

import { useMemo, useState, useRef } from 'react'

export type SubscriberRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: string | null
  tags: string[]
  subscribed_at: string
  unsubscribed_at: string | null
}

type Filter = 'all' | 'active' | 'unsubscribed'

export default function SubscribersClient({
  initialRows, loadError,
}: { initialRows: SubscriberRow[]; loadError: string | null }) {
  const [rows, setRows] = useState<SubscriberRow[]>(initialRows)
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  // Per-row two-click confirm: first click on Unsub/Resub puts the
  // row id here; the button reverts to its default state after a
  // short timeout if not clicked a second time. Inline pattern per
  // [[feedback_no_popups]] — avoids browser confirm() dialogs.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) if (r.source) set.add(r.source)
    return Array.from(set).sort()
  }, [rows])

  const visible = useMemo(() => rows.filter(r => {
    if (filter === 'active'       && r.unsubscribed_at) return false
    if (filter === 'unsubscribed' && !r.unsubscribed_at) return false
    if (sourceFilter && r.source !== sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase()
      if (!r.email.toLowerCase().includes(q) && !name.includes(q)) return false
    }
    return true
  }), [rows, filter, search, sourceFilter])

  async function refresh() {
    try {
      const res = await fetch('/api/admin/subscribers')
      if (!res.ok) return
      const j = await res.json()
      setRows(j.rows || [])
    } catch {/* swallow */}
  }

  async function exportCsv() {
    const header = 'email,first_name,last_name,source,tags,subscribed_at,unsubscribed_at\n'
    const lines = visible.map(r => [
      r.email,
      r.first_name || '',
      r.last_name || '',
      r.source || '',
      (r.tags || []).join('|'),
      r.subscribed_at,
      r.unsubscribed_at || '',
    ].map(csvCell).join(','))
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `extonsports-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#0D0D0D', margin: 0 }}>
          Subscribers <span style={{ fontWeight: 600, color: '#888', fontSize: 16 }}>({visible.length})</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => setAddOpen(true)}>+ Add</Btn>
          <Btn onClick={() => setImportOpen(true)} tone="ghost">Import CSV</Btn>
          <Btn onClick={exportCsv} tone="ghost">Export CSV</Btn>
        </div>
      </div>

      {flash && (
        <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: 13,
                      background: flash.kind === 'ok' ? '#DCFCE7' : '#FEE2E2',
                      border: `1px solid ${flash.kind === 'ok' ? '#86EFAC' : '#FCA5A5'}`,
                      color:   flash.kind === 'ok' ? '#166534' : '#991B1B' }}>
          {flash.msg}
        </div>
      )}

      {loadError && (
        <div style={{ padding: '10px 14px', borderRadius: 9, marginBottom: 14, fontSize: 13, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B' }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip active={filter === 'active'}       onClick={() => setFilter('active')}>Active</Chip>
        <Chip active={filter === 'unsubscribed'} onClick={() => setFilter('unsubscribed')}>Unsubscribed</Chip>
        <Chip active={filter === 'all'}          onClick={() => setFilter('all')}>All</Chip>
        <div style={{ width: 1, height: 22, background: '#E8D5C8', margin: '0 4px' }} />
        <input
          placeholder="Search email or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: '7px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9999, background: '#fff' }}
        />
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9999, background: '#fff' }}>
          <option value="">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FDF4EE', borderBottom: '1px solid #E8D5C8' }}>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Source</Th>
              <Th>Subscribed</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '28px 16px', textAlign: 'center', color: '#888' }}>
                {rows.length === 0 ? 'No subscribers yet.' : 'No matches for these filters.'}
              </td></tr>
            )}
            {visible.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F4E8DD' }}>
                <Td><a href={`mailto:${r.email}`} style={{ color: '#0D0D0D', textDecoration: 'none' }}>{r.email}</a></Td>
                <Td>{[r.first_name, r.last_name].filter(Boolean).join(' ') || <span style={{ color: '#bbb' }}>—</span>}</Td>
                <Td>{r.source || <span style={{ color: '#bbb' }}>—</span>}</Td>
                <Td>{new Date(r.subscribed_at).toLocaleDateString()}</Td>
                <Td>{r.unsubscribed_at ? <Pill tone="muted">Unsubscribed</Pill> : <Pill tone="ok">Active</Pill>}</Td>
                <Td align="right">
                  {confirmingId === r.id ? (
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                      <button
                        onClick={async () => {
                          setBusy(true)
                          const res = await fetch(`/api/admin/subscribers/${r.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: r.unsubscribed_at ? 'resubscribe' : 'unsubscribe' }),
                          })
                          setBusy(false)
                          setConfirmingId(null)
                          if (res.ok) { await refresh(); setFlash({ kind: 'ok', msg: 'Updated.' }) }
                          else        { setFlash({ kind: 'err', msg: 'Update failed.' }) }
                        }}
                        disabled={busy}
                        style={{ background: '#F37A4A', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 9px', borderRadius: 6 }}>
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        style={{ background: 'transparent', border: '1px solid #E8D5C8', color: '#888', fontSize: 11, cursor: 'pointer', padding: '3px 9px', borderRadius: 6 }}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmingId(r.id)
                        // Auto-reset the confirm state after 4s so a
                        // user who clicked off without confirming
                        // doesn't see a stale "Confirm" prompt.
                        setTimeout(() => setConfirmingId(curr => (curr === r.id ? null : curr)), 4000)
                      }}
                      disabled={busy}
                      style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>
                      {r.unsubscribed_at ? 'Resub' : 'Unsub'}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <AddModal onClose={() => setAddOpen(false)} onAdded={async () => { setAddOpen(false); await refresh(); setFlash({ kind: 'ok', msg: 'Subscriber added.' }) }} />
      )}
      {importOpen && (
        <ImportModal onClose={() => setImportOpen(false)} onImported={async (n) => { setImportOpen(false); await refresh(); setFlash({ kind: 'ok', msg: `Imported ${n} subscriber${n === 1 ? '' : 's'}.` }) }} />
      )}
    </div>
  )
}

// ── modals ─────────────────────────────────────────────────────────

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [source, setSource] = useState('manual')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: first, last_name: last, source }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error || 'Could not add.')
        return
      }
      onAdded()
    } finally { setBusy(false) }
  }

  return (
    <ModalShell title="Add subscriber" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input label="Email" type="email" required value={email} onChange={setEmail} />
        <div style={{ display: 'flex', gap: 10 }}>
          <Input label="First name" value={first} onChange={setFirst} style={{ flex: 1 }} />
          <Input label="Last name"  value={last}  onChange={setLast}  style={{ flex: 1 }} />
        </div>
        <Input label="Source"  value={source} onChange={setSource} hint='Where they came from — "manual", "homepage", etc.' />
        {err && <div style={{ color: '#991B1B', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn onClick={onClose} tone="ghost" type="button">Cancel</Btn>
          <Btn type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add'}</Btn>
        </div>
      </form>
    </ModalShell>
  )
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: (n: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState('wix-migration')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ rows: number; sample: string[] } | null>(null)

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setPreview(null); return }
    const text = await file.text()
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    setPreview({ rows: lines.length - 1, sample: lines.slice(0, 3) })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setErr('Pick a CSV file first.'); return }
    setBusy(true); setErr(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('source', source)
      const res = await fetch('/api/admin/subscribers/import', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error || 'Import failed.'); return }
      onImported(j.imported || 0)
    } finally { setBusy(false) }
  }

  return (
    <ModalShell title="Import CSV" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
          CSV must have an <b>email</b> column. Optional: <b>first_name</b>, <b>last_name</b>. Existing emails are skipped (no overwrite).
        </p>
        <input type="file" ref={fileRef} accept=".csv,text/csv" onChange={onFileChange}
          style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9, background: '#fff' }} />
        {preview && (
          <div style={{ fontSize: 12, color: '#666', background: '#FDF4EE', padding: '8px 12px', borderRadius: 8 }}>
            ~{preview.rows} rows. First lines:<br />
            <code style={{ fontSize: 11 }}>{preview.sample.join('\n')}</code>
          </div>
        )}
        <Input label="Source tag" value={source} onChange={setSource} hint="How these contacts will be tagged in the source column." />
        {err && <div style={{ color: '#991B1B', fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn onClick={onClose} tone="ghost" type="button">Cancel</Btn>
          <Btn type="submit" disabled={busy}>{busy ? 'Importing…' : 'Import'}</Btn>
        </div>
      </form>
    </ModalShell>
  )
}

// ── tiny presentation primitives ───────────────────────────────────

function csvCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888' }}>{children}</th>
}
function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '10px 14px', textAlign: align, color: '#444' }}>{children}</td>
}
function Pill({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'muted' }) {
  const bg = tone === 'ok' ? '#DCFCE7' : '#F4E8DD'
  const fg = tone === 'ok' ? '#166534' : '#888'
  return <span style={{ display: 'inline-block', padding: '2px 9px', borderRadius: 9999, background: bg, color: fg, fontSize: 11, fontWeight: 700 }}>{children}</span>
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 9999, border: '1px solid', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      borderColor: active ? '#F37A4A' : '#E8D5C8',
      background:  active ? 'rgba(243,122,74,0.12)' : '#fff',
      color:       active ? '#F37A4A' : '#444',
    }}>{children}</button>
  )
}
function Btn({ children, onClick, disabled, type = 'button', tone = 'primary' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; tone?: 'primary' | 'ghost' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
      background: tone === 'primary' ? '#F37A4A' : 'transparent',
      color:      tone === 'primary' ? '#fff' : '#444',
      border:     tone === 'primary' ? 'none' : '1px solid #E8D5C8',
    }}>{children}</button>
  )
}
function Input({ label, value, onChange, type = 'text', required, hint, style }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; hint?: string; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 4 }}>{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 8, background: '#fff', boxSizing: 'border-box' }} />
      {hint && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}
function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 480, width: '100%' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px 0', color: '#0D0D0D' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
