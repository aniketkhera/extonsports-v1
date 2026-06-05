'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { markdownToEmailHtml } from '../../../lib/markdown'
import { sportsFromTags, sportLabel } from '../../../lib/sports'

export type RecipientRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  source: string | null
  tags: string[]
}

const STARTER_BODY = `# Hello from Exton Sports!

A quick update for the month:

- Cricket nets are now open Mon–Wed evenings
- Squash courts available 7 days/week
- Indoor turf bookings now live for weekend slots

[Book a court →](https://extonsports.com)

Questions? Just reply to this email.

— The ExtonSports team
`

export default function ComposeClient({
  recipients, loadError, adminEmail,
}: { recipients: RecipientRow[]; loadError: string | null; adminEmail: string }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState(STARTER_BODY)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(recipients.map(r => r.id)))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [sportFilter, setSportFilter] = useState<string>('')
  const [busy, setBusy] = useState<null | 'test' | 'send'>(null)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sources = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipients) if (r.source) set.add(r.source)
    return Array.from(set).sort()
  }, [recipients])

  // Sports present among recipients — drives the sport filter so you can
  // send to e.g. everyone tagged Cricket.
  const sportsInList = useMemo(() => {
    const set = new Set<string>()
    for (const r of recipients) for (const s of sportsFromTags(r.tags)) set.add(s)
    return Array.from(set).sort()
  }, [recipients])

  const filteredRecipients = useMemo(() => recipients.filter(r => {
    if (sourceFilter && r.source !== sourceFilter) return false
    if (sportFilter && !sportsFromTags(r.tags).includes(sportFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${r.first_name || ''} ${r.last_name || ''}`.toLowerCase()
      if (!r.email.toLowerCase().includes(q) && !name.includes(q)) return false
    }
    return true
  }), [recipients, search, sourceFilter, sportFilter])

  const bodyHtml = useMemo(() => markdownToEmailHtml(body), [body])
  const previewHtml = useMemo(() => buildPreviewHtml(subject || '(Subject preview)', bodyHtml), [subject, bodyHtml])

  function insertAtCursor(snippet: string) {
    const ta = textareaRef.current
    if (!ta) { setBody(b => b + '\n' + snippet); return }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const next = body.slice(0, start) + snippet + body.slice(end)
    setBody(next)
    // Restore focus + cursor after React rerenders.
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + snippet.length
      ta.setSelectionRange(pos, pos)
    })
  }

  async function uploadImage(file: File) {
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok || !j.url) {
        setFlash({ kind: 'err', msg: j.error || 'Image upload failed.' })
        return
      }
      const alt = file.name.replace(/\.[^.]+$/, '')
      insertAtCursor(`\n\n![${alt}](${j.url})\n\n`)
    } catch {
      setFlash({ kind: 'err', msg: 'Image upload failed.' })
    } finally {
      setImageUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function insertYouTube() {
    const url = youtubeUrl.trim()
    if (!url) return
    const ytRe = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    const vmRe = /vimeo\.com\/(\d+)/i
    if (!ytRe.test(url) && !vmRe.test(url)) {
      setFlash({ kind: 'err', msg: 'Paste a full YouTube or Vimeo URL.' })
      return
    }
    insertAtCursor(`\n\n${url}\n\n`)
    setYoutubeUrl('')
  }

  async function testSend() {
    if (!subject.trim()) { setFlash({ kind: 'err', msg: 'Add a subject first.' }); return }
    setBusy('test')
    try {
      const res = await fetch('/api/admin/compose/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body_md: body }),
      })
      const j = await res.json()
      setFlash(res.ok ? { kind: 'ok', msg: `Test sent to ${adminEmail}.` } : { kind: 'err', msg: j.error || 'Test failed.' })
    } finally { setBusy(null) }
  }

  async function send() {
    setBusy('send')
    try {
      const res = await fetch('/api/admin/compose/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body_md: body,
          recipient_ids: Array.from(selected),
          filter_summary: {
            search: search || undefined,
            source: sourceFilter || undefined,
            sport: sportFilter || undefined,
            count: selected.size,
          },
        }),
      })
      const j = await res.json()
      if (res.ok) {
        setFlash({ kind: 'ok', msg: `Sent to ${j.sent} recipient${j.sent === 1 ? '' : 's'}.${j.failed ? ` ${j.failed} failed.` : ''}` })
        setConfirmSend(false)
      } else {
        setFlash({ kind: 'err', msg: j.error || 'Send failed.' })
      }
    } finally { setBusy(null) }
  }

  const sendDisabled = !subject.trim() || !body.trim() || selected.size === 0 || busy !== null

  return (
    <div>
      {/* ── top bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <input
          placeholder="Subject line…"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{ flex: 1, padding: '11px 14px', fontSize: 15, border: '1px solid #E8D5C8', borderRadius: 10, background: '#fff', fontWeight: 600 }}
        />
        <button
          onClick={testSend}
          disabled={busy !== null}
          style={btnStyle('ghost')}
        >
          {busy === 'test' ? 'Sending…' : 'Test send'}
        </button>
        <button
          onClick={() => setConfirmSend(true)}
          disabled={sendDisabled}
          style={btnStyle('primary', sendDisabled)}
        >
          Send to {selected.size} →
        </button>
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

      {/* ── recipient summary + picker toggle ───────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', border: '1px solid #E8D5C8', borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#666' }}>
          <strong style={{ color: '#0D0D0D' }}>{selected.size}</strong> of {recipients.length} active subscribers selected
          {sourceFilter && <span> · source: {sourceFilter}</span>}
          {sportFilter && <span> · sport: {sportLabel(sportFilter)}</span>}
          {search && <span> · search: &ldquo;{search}&rdquo;</span>}
        </div>
        <button onClick={() => setPickerOpen(o => !o)} style={btnStyle('ghost')}>
          {pickerOpen ? 'Hide picker' : 'Pick recipients'}
        </button>
      </div>

      {pickerOpen && (
        <RecipientPicker
          recipients={filteredRecipients}
          allCount={recipients.length}
          selected={selected}
          setSelected={setSelected}
          search={search} setSearch={setSearch}
          sourceFilter={sourceFilter} setSourceFilter={setSourceFilter}
          sources={sources}
          sportFilter={sportFilter} setSportFilter={setSportFilter}
          sportsInList={sportsInList}
        />
      )}

      {/* ── two-column editor + preview (stacks on mobile) ──────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14, marginTop: 4 }}>
        {/* Editor pane */}
        <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid #F4E8DD', background: '#FDF4EE' }}>
            <Toolbarbtn label="B" onClick={() => insertAtCursor('**bold**')} />
            <Toolbarbtn label="I" onClick={() => insertAtCursor('*italic*')} />
            <Toolbarbtn label="H2" onClick={() => insertAtCursor('\n## Heading\n')} />
            <Toolbarbtn label="•" onClick={() => insertAtCursor('\n- item\n- item\n')} />
            <Toolbarbtn label="↩" onClick={() => insertAtCursor('[link text](https://)')} />
            <div style={{ width: 1, height: 16, background: '#E8D5C8', margin: '0 4px' }} />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
            />
            <Toolbarbtn label={imageUploading ? 'Uploading…' : '📷 Image'} onClick={() => fileRef.current?.click()} disabled={imageUploading} />
            <div style={{ width: 1, height: 16, background: '#E8D5C8', margin: '0 4px' }} />
            <input
              placeholder="Paste YouTube/Vimeo URL…"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertYouTube() } }}
              style={{ flex: 1, padding: '5px 10px', fontSize: 12, border: '1px solid #E8D5C8', borderRadius: 6, background: '#fff' }}
            />
            <Toolbarbtn label="Insert" onClick={insertYouTube} />
          </div>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ flex: 1, minHeight: 480, padding: '16px 18px', fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13, lineHeight: 1.6, border: 'none', resize: 'vertical', outline: 'none', background: '#fff' }}
          />
        </div>

        {/* Preview pane */}
        <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4E8DD', background: '#FDF4EE', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888' }}>
            Preview
          </div>
          <iframe
            srcDoc={previewHtml}
            sandbox="allow-popups"
            style={{ flex: 1, minHeight: 480, width: '100%', border: 'none', background: '#FDF4EE' }}
            title="Email preview"
          />
        </div>
      </div>

      {confirmSend && (
        <ConfirmSendModal
          subject={subject}
          recipientCount={selected.size}
          onCancel={() => setConfirmSend(false)}
          onConfirm={send}
          busy={busy === 'send'}
        />
      )}
    </div>
  )
}

// ── Recipient picker (inline) ──────────────────────────────────────

function RecipientPicker({
  recipients, allCount, selected, setSelected, search, setSearch, sourceFilter, setSourceFilter, sources,
  sportFilter, setSportFilter, sportsInList,
}: {
  recipients: RecipientRow[]
  allCount: number
  selected: Set<string>
  setSelected: (s: Set<string>) => void
  search: string; setSearch: (s: string) => void
  sourceFilter: string; setSourceFilter: (s: string) => void
  sources: string[]
  sportFilter: string; setSportFilter: (s: string) => void
  sportsInList: string[]
}) {
  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }
  function selectAll()    { setSelected(new Set(recipients.map(r => r.id))) }
  function selectNone()   { setSelected(new Set()) }
  function selectVisible(){ setSelected(new Set([...selected, ...recipients.map(r => r.id)])) }
  return (
    <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 10, marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderBottom: '1px solid #F4E8DD', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: '7px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9999, background: '#FDF4EE' }}
        />
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          style={{ padding: '7px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9999, background: '#FDF4EE' }}>
          <option value="">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {sportsInList.length > 0 && (
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
            style={{ padding: '7px 12px', fontSize: 13, border: '1px solid #E8D5C8', borderRadius: 9999, background: '#FDF4EE' }}>
            <option value="">All sports</option>
            {sportsInList.map(s => <option key={s} value={s}>{sportLabel(s)}</option>)}
          </select>
        )}
        <button onClick={selectAll}     style={btnStyle('ghost', false, 'tiny')}>All ({allCount})</button>
        <button onClick={selectVisible} style={btnStyle('ghost', false, 'tiny')}>+ Visible ({recipients.length})</button>
        <button onClick={selectNone}    style={btnStyle('ghost', false, 'tiny')}>None</button>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {recipients.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 13 }}>No matches.</div>}
        {recipients.map(r => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #F4E8DD', fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#0D0D0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.email}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                {r.source && <> · <span>{r.source}</span></>}
                {sportsFromTags(r.tags).map(s => <span key={s}> · <span style={{ color: '#9A5B3B', fontWeight: 700 }}>{sportLabel(s)}</span></span>)}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Confirm send modal ─────────────────────────────────────────────

function ConfirmSendModal({ subject, recipientCount, onCancel, onConfirm, busy }: { subject: string; recipientCount: number; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 440, width: '100%' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px 0', color: '#0D0D0D' }}>Send this mailer?</h2>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 16px 0' }}>
          About to send <strong>&ldquo;{subject}&rdquo;</strong> to <strong>{recipientCount}</strong> subscriber{recipientCount === 1 ? '' : 's'}. This can&rsquo;t be undone.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnStyle('ghost')} disabled={busy}>Cancel</button>
          <button onClick={onConfirm} style={btnStyle('primary', busy)} disabled={busy}>
            {busy ? 'Sending…' : `Send to ${recipientCount}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── helpers ────────────────────────────────────────────────────────

function btnStyle(tone: 'primary' | 'ghost', disabled = false, size: 'normal' | 'tiny' = 'normal'): React.CSSProperties {
  const padding = size === 'tiny' ? '5px 10px' : '9px 14px'
  const fontSize = size === 'tiny' ? 11 : 13
  return {
    padding, fontSize, fontWeight: 700, borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    background: tone === 'primary' ? '#F37A4A' : 'transparent',
    color:      tone === 'primary' ? '#fff' : '#444',
    border:     tone === 'primary' ? 'none' : '1px solid #E8D5C8',
    whiteSpace: 'nowrap',
  }
}

function Toolbarbtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, background: '#fff', color: '#444', border: '1px solid #E8D5C8', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {label}
    </button>
  )
}

// Builds the same wrapped HTML the send pipeline does (so the
// preview is faithful). Duplicates the email-template.ts shell here
// rather than importing it because the server lib uses Node features
// in other places — pull it apart in a follow-up if it ever diverges.
function buildPreviewHtml(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#FDF4EE;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDF4EE;">
<tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #E8D5C8;border-radius:14px;overflow:hidden;">
<tr><td style="padding:24px 32px 12px 32px;border-bottom:1px solid #F4E8DD;">
<div style="font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F37A4A;">Exton Sports Center</div>
</td></tr>
<tr><td style="padding:24px 32px 8px 32px;color:#222;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 32px 24px 32px;border-top:1px solid #F4E8DD;background:#FDF4EE;">
<div style="font-size:12px;line-height:1.65;color:#777;">
<p style="margin:0 0 8px 0;"><strong style="color:#444;">Exton Sports Center</strong><br />4 Tabas Lane, Building 2, Exton, PA 19341</p>
<p style="margin:8px 0 0 0;">You&rsquo;re receiving this because you signed up at extonsports.com.<br /><a href="#" style="color:#777;text-decoration:underline;">Unsubscribe</a> &middot; <a href="mailto:info@extonsports.com" style="color:#777;text-decoration:underline;">Contact us</a></p>
</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
