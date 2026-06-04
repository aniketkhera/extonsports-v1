import { NextRequest, NextResponse } from 'next/server'
import { selectOne, updateRows } from '../../../lib/supabase'

// POST /api/resubscribe  { token }
//
// Flips unsubscribed_at back to NULL for the subscriber matching
// this token. Token is the bearer credential — high-entropy UUID
// indexed unique. Idempotent: re-running on an already-active row
// is a no-op.

export async function POST(req: NextRequest) {
  let body: { token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const token = body.token
  if (!token || typeof token !== 'string' || token.length < 8) {
    return NextResponse.json({ error: 'Token required.' }, { status: 400 })
  }

  try {
    const sub = await selectOne<{ id: string }>('subscribers', {
      select: 'id',
      filters: { unsubscribe_token: `eq.${token}` },
    })
    if (!sub) return NextResponse.json({ error: 'Unknown token.' }, { status: 404 })
    await updateRows('subscribers', { id: `eq.${sub.id}` }, { unsubscribed_at: null })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[/api/resubscribe] failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Resubscribe failed.' }, { status: 500 })
  }
}
