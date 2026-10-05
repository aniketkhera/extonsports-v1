import { NextResponse } from 'next/server'

// POST /api/enquiry
// ---------------------------------------------------------------------------
// The badminton academy's "Learn more" form. A thin SERVER-SIDE proxy to the
// platform's /api/public/enquiry, which files the enquiry into the Switchboard
// and texts the Exton handset.
//
// WHY A PROXY RATHER THAN POSTING STRAIGHT FROM THE BROWSER. Same rule as the
// three GET proxies beside this one (see ./court-slots/route.ts): platform calls
// are server-side only. Three consequences, all of them the point:
//
//   • extonsports.com needs no entry in the platform's PUBLIC_ALLOWED_ORIGINS,
//     and a JSON POST never gets preflighted.
//   • The platform's rate limiter sees one known caller instead of the open
//     internet — which matters for an endpoint whose side effect is a text to a
//     personal mobile.
//   • The visitor's IP does not reach the platform, so nothing of theirs is
//     forwarded that this form did not ask for.
//
// Added 2026-10-05.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const API_BASE = (process.env.ORANGISH_API_BASE || 'https://app.orangish.io').replace(/\/$/, '')

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Could not read that. Please try again.' }, { status: 400 })
  }

  try {
    const res = await fetch(`${API_BASE}/api/public/enquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Longer than the 5s the GET proxies use: this one SENDS a text, and a
      // timeout here is ambiguous in a way a missed calendar never is — the
      // enquiry may well have been filed. Better to wait than to tell the
      // visitor it failed and have them submit a second time.
      signal: AbortSignal.timeout(10_000),
    })

    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      // The platform's own message is the useful one — "A valid US phone number
      // is required" tells the visitor what to change; a generic 502 does not.
      return NextResponse.json(
        { error: data.error || 'Could not send that. Please try again.' },
        { status: res.status },
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    // ⚠️ DELIBERATELY NOT the empty-payload fallback the GET proxies use. A
    // marketing page must not show a broken calendar; it also must not tell
    // someone their enquiry was sent when it was not. This one fails loudly and
    // offers the phone number instead.
    return NextResponse.json(
      { error: "Could not send that. Please call (484) 252-2523 or email info@extonsports.com." },
      { status: 503 },
    )
  }
}
