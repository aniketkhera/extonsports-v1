import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../../lib/auth-guard'
import { updateRows } from '../../../../../lib/supabase'

// PATCH /api/admin/subscribers/[id]  { action: 'unsubscribe' | 'resubscribe' }
//
// Admin-initiated soft-flip of unsubscribed_at. Subscriber-initiated
// unsubscribes go through /unsubscribe?token=... — this endpoint is
// for the admin UI's "Unsub" / "Resub" inline action on the table.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { id } = await params
  let body: { action?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action
  let patch: Record<string, unknown> = {}
  if (action === 'unsubscribe')      patch = { unsubscribed_at: new Date().toISOString() }
  else if (action === 'resubscribe') patch = { unsubscribed_at: null }
  else return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

  try {
    await updateRows('subscribers', { id: `eq.${id}` }, patch)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/subscribers PATCH]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 })
  }
}
