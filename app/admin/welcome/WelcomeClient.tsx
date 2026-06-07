'use client'

import { useMemo, useState } from 'react'
import { markdownToEmailHtml } from '../../../lib/markdown'

type Initial = { subject: string; body_md: string; enabled: boolean }
type Flash = { kind: 'ok' | 'err'; msg: string } | null

export default function WelcomeClient({ initial, adminEmail }: { initial: Initial; adminEmail: string }) {
  const [subject, setSubject] = useState(initial.subject)
  const [body, setBody] = useState(initial.body_md)
  const [enabled, setEnabled] = useState(initial.enabled)
  const [busy, setBusy] = useState<null | 'save' | 'test'>(null)
  const [flash, setFlash] = useState<Flash>(null)

  const bodyHtml = useMemo(() => markdownToEmailHtml(body), [body])
  const previewHtml = useMemo(() => buildPreviewHtml(subject || '(Subject preview)', bodyHtml), [subject, bodyHtml])

  async function save() {
    setBusy('save'); setFlash(null)
    try {
      const res = await fetch('/api/admin/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body_md: body, enabled }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setFlash({ kind: 'err', msg: json.error || `Error ${res.status}` }); return }
      setFlash({ kind: 'ok', msg: enabled ? 'Saved — new subscribers will get this email.' : 'Saved as draft (disabled — not sending yet).' })
    } catch {
      setFlash({ kind: 'err', msg: 'Network error — try again.' })
    } finally { setBusy(null) }
  }

  async function sendTest() {
    if (!subject.trim()) { setFlash({ kind: 'err', msg: 'Add a subject first.' }); return }
    setBusy('test'); setFlash(null)
    try {
      const res = await fetch('/api/admin/compose/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body_md: body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setFlash({ kind: 'err', msg: json.error || `Error ${res.status}` }); return }
      setFlash({ kind: 'ok', msg: `Test sent to ${adminEmail}.` })
    } catch {
      setFlash({ kind: 'err', msg: 'Network error — try again.' })
    } finally { setBusy(null) }
  }

  return (
    <div>
      {/* Enable toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', border: '1px solid #E8D5C8', borderRadius: 12, marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#F37A4A' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0D0D0D' }}>
          Auto-send to new subscribers
          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginTop: 2 }}>
            {enabled ? 'On — every new signup receives this email.' : 'Off — this is just a saved draft; nobody receives it.'}
          </span>
        </span>
      </label>

      {/* Subject */}
      <label style={labelStyle}>Subject</label>
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Welcome to Exton Sports" style={inputStyle} />

      {/* Editor + live preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 14, marginTop: 16 }}>
        <div>
          <label style={labelStyle}>Body <span style={{ color: '#aaa', fontWeight: 500 }}>(Markdown)</span></label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={16}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, lineHeight: 1.6, resize: 'vertical' }} />
        </div>
        <div>
          <label style={labelStyle}>Preview</label>
          <iframe srcDoc={previewHtml} title="Welcome email preview"
            style={{ width: '100%', height: 360, border: '1px solid #E8D5C8', borderRadius: 12, background: '#fff' }} />
        </div>
      </div>

      {flash && (
        <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: flash.kind === 'ok' ? '#E9F7EF' : '#FDECEC',
          color: flash.kind === 'ok' ? '#1B7A43' : '#C0392B',
          border: `1px solid ${flash.kind === 'ok' ? '#A9DFBF' : '#F5B7B1'}` }}>
          {flash.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={busy !== null}
          style={{ ...btnStyle, background: '#F37A4A', color: '#fff', border: '1px solid #F37A4A', opacity: busy ? 0.6 : 1 }}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        <button onClick={sendTest} disabled={busy !== null}
          style={{ ...btnStyle, background: '#fff', color: '#0D0D0D', border: '1px solid #E8D5C8', opacity: busy ? 0.6 : 1 }}>
          {busy === 'test' ? 'Sending…' : `Send test to me`}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', background: '#fff', border: '1px solid #E8D5C8', borderRadius: 10, fontSize: 14, color: '#0D0D0D', outline: 'none', boxSizing: 'border-box' }
const btnStyle: React.CSSProperties = { padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }

// Mirror of the email shell for an accurate preview (same approach the
// composer uses). Keep visually in sync with lib/email-template.ts.
function buildPreviewHtml(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#FDF4EE;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDF4EE;">
    <tr><td align="center" style="padding:24px 12px;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #E8D5C8;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 32px;border-bottom:1px solid #F0E2D8;font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F37A4A;">Exton Sports</td></tr>
        <tr><td style="padding:24px 32px 8px 32px;color:#222;">${bodyHtml}</td></tr>
        <tr><td style="padding:16px 32px 28px 32px;color:#999;font-size:12px;line-height:1.6;border-top:1px solid #F0E2D8;">
          You&rsquo;re receiving this because you signed up at extonsports.com.<br />
          <a href="#" style="color:#999;text-decoration:underline;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
