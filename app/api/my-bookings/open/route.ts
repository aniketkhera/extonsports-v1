import { readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { redeem } from '@/lib/my-bookings/platform'
import { deviceCookie, LINK_COOKIE } from '@/lib/my-bookings/session'
import { readLinkToken } from '@/lib/my-bookings/session-server'

// POST /api/my-bookings/open — spend the parked email link, 2026-10-20.
//
// WHY A BUTTON AND NOT THE LINK ITSELF: mail scanners (Outlook Safe Links, Gmail's) GET
// every link in a message before the person does. If the GET spent the single-use token,
// the guest's own tap would land on "expired". So GET /my-bookings/link only parks the
// token in a first-party cookie, and the spend happens here, on a same-origin POST that a
// scanner never makes.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused
  if (!(await readJsonBody(req))) return json({ error: 'bad_request' }, 400)

  const link = await readLinkToken()
  if (!link) return json({ error: 'invalid' }, 400)

  const r = await redeem({ link })
  if (!r.ok) {
    // try_again KEEPS the parked link, so pressing the button again works once the
    // platform is back; 'invalid' spends nothing more by clearing it.
    return r.error === 'invalid'
      ? clearCookie(json({ error: 'invalid' }, 400), LINK_COOKIE)
      : json({ error: 'try_again' }, 503)
  }

  let cookie
  try {
    cookie = deviceCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  return clearCookie(setCookie(json({ ok: true }), cookie), LINK_COOKIE)
}
