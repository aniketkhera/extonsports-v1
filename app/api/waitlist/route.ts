import { NextRequest, NextResponse } from 'next/server'
import { insertRow, selectOne, updateRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { sendOne } from '../../../lib/send-mailer'

// POST /api/waitlist  { name, email }
//
// Public signup form on the homepage. Two side effects, both
// best-effort (an exception in either does NOT fail the request):
//
//   1. Add to the new ExtonSports Supabase `subscribers` table with
//      source='homepage'. If the email is already on the list,
//      we either no-op (already active) or resubscribe (unsubscribed
//      previously and signing up again is intent to re-opt-in).
//
//   2. Email info@extonsports.com letting them know who just signed
//      up, so they can follow up personally if they want.
//
// The route is named /api/waitlist for backward compat with the
// existing WaitlistSection.tsx component on the homepage — that
// component's mental model is "waitlist", and we don't want to
// touch it. Underneath, the list IS our mailing list, just with
// different copy on the way in.

type SubscriberLookup = {
  id: string
  unsubscribed_at: string | null
}

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = (body.name ?? '').toString().trim()
  const email = (body.email ?? '').toString().trim().toLowerCase()
  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  // Split the single name field into first/last on first whitespace.
  // Mirrors the convention Orangish uses for `profiles.name`.
  const tokens = name.split(/\s+/)
  const first_name = tokens[0]
  const last_name  = tokens.slice(1).join(' ') || null

  // ── 1. Persist to subscribers ─────────────────────────────────
  if (supabaseConfigured()) {
    try {
      const existing = await selectOne<SubscriberLookup>('subscribers', {
        select: 'id,unsubscribed_at',
        filters: { property: `eq.${PROPERTY}`, email: `eq.${email}` },
      })
      if (existing) {
        // Resubscribe if they previously opted out — explicit
        // intent to re-engage. We don't overwrite first_name /
        // last_name to avoid clobbering an admin-curated value.
        if (existing.unsubscribed_at) {
          await updateRows('subscribers',
            { id: `eq.${existing.id}` },
            { unsubscribed_at: null })
        }
        // Otherwise: already-active no-op.
      } else {
        await insertRow('subscribers', {
          property: PROPERTY,
          email,
          first_name,
          last_name,
          source: 'homepage',
          tags: [],
        }, 'return=minimal')
      }
    } catch (e) {
      console.error('[waitlist] subscribers write failed:', e instanceof Error ? e.message : e)
    }
  } else {
    console.warn('[waitlist] Supabase env not configured — skipping DB write')
  }

  // ── 2. Notify info@extonsports.com ────────────────────────────
  try {
    await sendOne({
      to: 'info@extonsports.com',
      subject: `New ExtonSports signup — ${name}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#F37A4A;margin-bottom:24px;font-size:18px;">New mailing-list signup</h2>
          <table cellpadding="6" style="font-size:14px;">
            <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
            <tr><td><b>Email</b></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td><b>Source</b></td><td>extonsports.com homepage</td></tr>
            <tr><td><b>When</b></td><td>${new Date().toISOString()}</td></tr>
          </table>
          <p style="margin-top:24px;color:#888;font-size:12px;">
            They&rsquo;ve been added to the mailing list automatically.
          </p>
        </div>
      `,
    })
  } catch (e) {
    console.error('[waitlist] notification email failed:', e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ success: true })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
