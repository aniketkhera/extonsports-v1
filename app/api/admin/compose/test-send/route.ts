import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../../lib/auth-guard'
import { markdownToEmailHtml } from '../../../../../lib/markdown'
import { renderEmailHtml } from '../../../../../lib/email-template'
import { sendOne, unsubscribeUrl } from '../../../../../lib/send-mailer'

// POST /api/admin/compose/test-send  { subject, body_md }
// Sends the rendered mailer to the signed-in admin's own address.
// Uses a fake unsubscribe URL (the admin obviously isn't a real
// subscriber) — clicking it won't break anything, just lands on
// the public /unsubscribe page with an unknown-token message.

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let body: { subject?: string; body_md?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const subject = (body.subject || '').trim()
  const body_md = (body.body_md || '').trim()
  if (!subject) return NextResponse.json({ error: 'Subject required.' }, { status: 400 })
  if (!body_md) return NextResponse.json({ error: 'Body required.' }, { status: 400 })

  const bodyHtml = markdownToEmailHtml(body_md)
  const html = renderEmailHtml({
    subject: `[TEST] ${subject}`,
    bodyHtml,
    unsubscribeUrl: unsubscribeUrl('test-token-not-real'),
  })
  try {
    await sendOne({ to: session.email, subject: `[TEST] ${subject}`, html })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[compose/test-send]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Test send failed.' }, { status: 502 })
  }
}
