import { NextRequest, NextResponse } from 'next/server'
import { insertRow, selectOne, updateRows, supabaseConfigured, PROPERTY } from '../../../lib/supabase'
import { sendOne } from '../../../lib/send-mailer'

// POST /api/waitlist  { name, email, referrer?, utm_source?, utm_medium?, utm_campaign? }
//
// Public signup form on the homepage. Two side effects, both
// best-effort (an exception in either does NOT fail the request):
//
//   1. Add to the ExtonSports Supabase `subscribers` table with
//      source='homepage' + acquisition context (referrer, UTM, geo).
//
//   2. Email info@extonsports.com with the signup details.
//
// Geo (country/city) is read from Vercel's edge headers — available
// automatically on all Vercel deployments, no extra config needed.

type SubscriberLookup = {
  id: string
  unsubscribed_at: string | null
}

export async function POST(req: NextRequest) {
  let body: Record<string, string | null>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name  = ((body.name  ?? '') as string).trim()
  const email = ((body.email ?? '') as string).trim().toLowerCase()
  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  // Acquisition context — all optional, client captures at submit time
  const referrer     = clean(body.referrer)
  const utm_source   = clean(body.utm_source)
  const utm_medium   = clean(body.utm_medium)
  const utm_campaign = clean(body.utm_campaign)

  // Geo — Vercel sets these headers automatically at the edge.
  // Falls back to null in local dev (no edge runtime there).
  // region (ISO 3166-2 subdivision, e.g. "PA") resolves far more
  // reliably than city for IP-based geolocation.
  const country = req.headers.get('x-vercel-ip-country') || null
  const region  = req.headers.get('x-vercel-ip-country-region')
    ? decodeURIComponent(req.headers.get('x-vercel-ip-country-region')!)
    : null
  const city    = req.headers.get('x-vercel-ip-city')
    ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!)
    : null

  const tokens     = name.split(/\s+/)
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
        if (existing.unsubscribed_at) {
          await updateRows('subscribers',
            { id: `eq.${existing.id}` },
            { unsubscribed_at: null })
        }
        // Already active — no-op (don't overwrite acquisition data)
      } else {
        await insertRow('subscribers', {
          property: PROPERTY,
          email,
          first_name,
          last_name,
          source: 'homepage',
          tags: [],
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          country,
          region,
          city,
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
            <tr><td><b>Source</b></td><td>${escapeHtml(referrer || 'Direct / unknown')}</td></tr>
            ${utm_source ? `<tr><td><b>UTM source</b></td><td>${escapeHtml(utm_source)}</td></tr>` : ''}
            ${utm_campaign ? `<tr><td><b>UTM campaign</b></td><td>${escapeHtml(utm_campaign)}</td></tr>` : ''}
            ${city || region || country ? `<tr><td><b>Location</b></td><td>${[city, region, country].filter((x): x is string => !!x).map(escapeHtml).join(', ')}</td></tr>` : ''}
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

function clean(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s || null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
