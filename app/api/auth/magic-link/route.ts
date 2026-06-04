import { NextRequest, NextResponse } from 'next/server'
import { signToken, isAdmin, MAGIC_LINK_TTL, AuthConfigError } from '../../../../lib/auth'
import { sendOne } from '../../../../lib/send-mailer'

// POST /api/auth/magic-link  { email }
//
// Always returns success — we never leak which emails are admins.
// An unknown email gets a no-op success; an admin email gets a
// signed magic link emailed to them.

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  // Generic success when the email isn't allowlisted. Don't reveal
  // who is or isn't an admin.
  if (!isAdmin(email)) {
    return NextResponse.json({ success: true })
  }

  let token: string
  try {
    token = signToken({ email, kind: 'magic' }, MAGIC_LINK_TTL)
  } catch (e) {
    if (e instanceof AuthConfigError) {
      console.error('[auth/magic-link] config error:', e.message)
      return NextResponse.json({ error: 'Server auth config error.' }, { status: 500 })
    }
    throw e
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://extonsports.com').replace(/\/$/, '')
  const link = `${appUrl}/api/auth/verify?token=${encodeURIComponent(token)}`

  try {
    await sendOne({
      to: email,
      subject: 'Your ExtonSports admin sign-in link',
      html: signInEmailHtml(link),
    })
  } catch (e) {
    console.error('[auth/magic-link] send failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Could not send sign-in email.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}

function signInEmailHtml(link: string): string {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#FDF4EE;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDF4EE;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;background:#fff;border:1px solid #E8D5C8;border-radius:14px;">
        <tr><td style="padding:32px;">
          <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F37A4A;margin-bottom:18px;">Exton Sports Center</div>
          <h1 style="margin:0 0 14px 0;font-size:22px;color:#0D0D0D;">Sign in to the admin</h1>
          <p style="margin:0 0 22px 0;font-size:15px;color:#444;line-height:1.6;">
            Click the button below to sign in. This link is good for 15 minutes.
          </p>
          <p style="margin:0 0 24px 0;">
            <a href="${link}" style="display:inline-block;padding:12px 22px;background:#F37A4A;color:#fff;text-decoration:none;font-weight:700;border-radius:8px;font-size:15px;">Sign in</a>
          </p>
          <p style="margin:24px 0 0 0;font-size:12px;color:#888;line-height:1.55;">
            If you didn't request this, you can ignore the email — no account changes happen until the link is clicked.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
