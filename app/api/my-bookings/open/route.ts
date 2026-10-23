import { clientIp, hit, readJsonBody } from '@/lib/my-bookings/guard'
import { clearCookie, json, refuseCrossSite, setCookie } from '@/lib/my-bookings/http'
import { redeem, signOut } from '@/lib/my-bookings/platform'
import { deviceCookie, LINK_COOKIE, replacedToken } from '@/lib/my-bookings/session'
import { readDeviceToken, readLinkToken } from '@/lib/my-bookings/session-server'
import { redeemRefusal } from '@/lib/my-bookings/view'

// POST /api/my-bookings/open — spend the parked email link, 2026-10-20.
//
// WHY A BUTTON AND NOT THE LINK ITSELF: mail scanners (Outlook Safe Links, Gmail's) GET
// every link in a message before the person does. If the GET spent the single-use token,
// the guest's own tap would land on "expired". So GET /my-bookings/link only parks the
// token in a first-party cookie, and the spend happens here, on a same-origin POST that a
// scanner never makes.
//
// PER-IP LIMIT (security review, 2026-10-20): the first pass had none here, the only
// sign-in route without one. The Origin check binds browsers, not scripts, so a script
// could fake the Origin and the link cookie and hammer the platform's redeem. It now gets
// the same limit as verify and cancel, and the platform keys its own limits on the IP
// forwarded with the relay secret (lib/my-bookings/platform.ts). A refusal for a limit or
// an outage KEEPS the parked link; only the platform's own "invalid" spends it
// (lib/my-bookings/view.ts redeemRefusal).
//
// THE TOKEN IT REPLACES IS REVOKED (second review, 2026-10-20): a successful sign-in
// overwrites this browser's device cookie, so the session behind the old one is signed
// out upstream too (lib/my-bookings/session.ts replacedToken says why). Best effort:
// signOut never throws, and the new sign-in stands either way.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const refused = refuseCrossSite(req)
  if (refused) return refused
  if (!(await readJsonBody(req))) return json({ error: 'bad_request' }, 400)

  const link = await readLinkToken()
  if (!link) return json({ error: 'invalid' }, 400)

  const ip = clientIp(req)
  if (hit(`open:${ip}`, 10, 10 * 60_000)) return json({ error: 'slow_down' }, 429)

  const previous = await readDeviceToken()
  const r = await redeem({ link }, ip)
  if (!r.ok) {
    const no = redeemRefusal(r.error)
    const res = json(no.body, no.status)
    return no.clearLink ? clearCookie(res, LINK_COOKIE) : res
  }

  let cookie
  try {
    cookie = deviceCookie(r.deviceToken, r.expiresAt)
  } catch {
    return json({ error: 'try_again' }, 503)
  }
  const stale = replacedToken(previous, r.deviceToken)
  if (stale) await signOut(stale, ip)
  return clearCookie(setCookie(json({ ok: true }), cookie), LINK_COOKIE)
}
