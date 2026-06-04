import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../lib/auth-guard'
import { selectRows, insertRow, selectOne } from '../../../../lib/supabase'

// GET  /api/admin/subscribers — list (admin only)
// POST /api/admin/subscribers — manual add

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  try {
    const rows = await selectRows('subscribers', {
      select: 'id,email,first_name,last_name,source,tags,subscribed_at,unsubscribed_at',
      order: 'subscribed_at.desc',
      limit: 1000,
    })
    return NextResponse.json({ rows })
  } catch (e) {
    console.error('[admin/subscribers GET]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not load subscribers.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { email?: string; first_name?: string; last_name?: string; source?: string; tags?: string[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }
  const first_name = body.first_name?.trim() || null
  const last_name  = body.last_name?.trim()  || null
  const source     = body.source?.trim()     || 'manual'
  const tags       = Array.isArray(body.tags) ? body.tags.filter(t => typeof t === 'string').slice(0, 20) : []

  try {
    // Dedupe by email — UNIQUE constraint will reject inserts. Check
    // first so we can return a friendlier error than a 409.
    const existing = await selectOne<{ id: string }>('subscribers', {
      select: 'id',
      filters: { email: `eq.${email}` },
    })
    if (existing) {
      return NextResponse.json({ error: 'That email is already on the list.' }, { status: 409 })
    }
    await insertRow('subscribers', { email, first_name, last_name, source, tags }, 'return=minimal')
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/subscribers POST]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not add subscriber.' }, { status: 500 })
  }
}
