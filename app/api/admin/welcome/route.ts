import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../lib/auth-guard'
import { selectOne, insertRow, updateRows, supabaseConfigured, PROPERTY } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

type WelcomeRow = { property: string; subject: string; body_md: string; enabled: boolean; updated_at: string }

// GET /api/admin/welcome — load this property's welcome email settings
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!supabaseConfigured()) return NextResponse.json({ welcome: null })
  try {
    const row = await selectOne<WelcomeRow>('welcome_emails', {
      select: 'property,subject,body_md,enabled,updated_at',
      filters: { property: `eq.${PROPERTY}` },
    })
    return NextResponse.json({ welcome: row })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Load failed' }, { status: 500 })
  }
}

// POST /api/admin/welcome — save (upsert) the welcome email settings
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const subject = (body.subject || '').trim()
  const body_md = typeof body.body_md === 'string' ? body.body_md : ''
  const enabled = !!body.enabled

  // Can't enable an empty welcome email — it'd send blank mail.
  if (enabled && (!subject || !body_md.trim())) {
    return NextResponse.json({ error: 'Add a subject and body before enabling.' }, { status: 400 })
  }
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Mailer storage not configured.' }, { status: 503 })

  try {
    const existing = await selectOne<{ property: string }>('welcome_emails', {
      select: 'property', filters: { property: `eq.${PROPERTY}` },
    })
    if (existing) {
      await updateRows('welcome_emails', { property: `eq.${PROPERTY}` }, {
        subject, body_md, enabled, updated_at: new Date().toISOString(),
      })
    } else {
      await insertRow('welcome_emails', { property: PROPERTY, subject, body_md, enabled }, 'return=minimal')
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 500 })
  }
}
