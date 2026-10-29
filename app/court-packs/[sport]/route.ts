import { clientIp, hit } from '@/lib/my-bookings/guard'
import { packOffers } from '@/lib/my-bookings/platform'
import { PACK_LINK_SLUG_RE, packLinkCredits, packLinkTarget, withPackLinkCode } from '@/lib/my-bookings/pack-links'
import { couponFromQuery } from '@/lib/my-bookings/coupon'
import { PACK_PATH } from '@/lib/booking'

// GET /court-packs/<sport> — the short links for flyers and QR codes, 2026-10-25 (Aniket
// asked for it): /court-packs/badminton and /court-packs/cricket 307 to
// /court-packs?sport=<that sport's id>, so the buy page opens with the tile picked. The
// slug → id lookup is lib/my-bookings/pack-links.ts, against the LIVE offers — no sport id
// is written down on this site, so nothing here goes stale when the platform's rows change.
//
// DOES NOT SHADOW /court-packs/terms. A static segment beats a dynamic one: Next's route
// matcher tries every static route before any dynamic one
// (node_modules/next/dist/server/route-matcher-managers/default-route-matcher-manager.js,
// and shared/lib/router/utils/sorted-routes.js orders terms before [sport]). The docs
// shipped with this Next state it for the Pages Router ("Predefined API routes take
// precedence over dynamic API routes"); the App Router docs say nothing either way, so the
// test suite checks the ordering too (lib/my-bookings/court-pack.test.mjs).
//
// FAILS TO THE PLAIN PAGE: a slug that is not [a-z-]{1,30} (no call is made for it), the
// per-IP limit, the platform's 404 (court_packs_public off), an outage, a bad answer, no
// relay secret, no offers, or a slug that names no sport on sale — every one lands on
// /court-packs, which renders the offers or PACK_BUY_COPY.notOnSale. Never a 404:
// a printed code must always land somewhere that works.
//
// NOT GATED ON PACKS_LIVE, like the page it points at: that flag governs the site's own
// links (Hero, Footer, sitemap), and this is an address, not a link — nothing on the site
// points here. Until the platform's flag is on, a scan lands on PACK_BUY_COPY.notOnSale.
//
// One platform call (packOffers: the relay secret, the visitor's IP, 5 s), then the page
// makes its own. So a per-IP limit FIRST, as on every route here that calls the platform
// (lib/my-bookings/guard.ts): 30 a minute, generous for a club's shared Wi-Fi at an event,
// and over it the visitor still lands on /court-packs — only without the tile picked.
//
// 307, not 308, and no-store: the target depends on the platform's rows and on whether it
// answered, so neither a browser nor a CDN may remember it (the /pay rule in next.config.ts).
//
// ?code= IS CARRIED, 2026-10-29 (Aniket: "Fix short links first", for the DIWALI2026 coupon):
// read with couponFromQuery, as /court-packs reads its own, and put on EVERY redirect below —
// the fallbacks too, so /court-packs/Badminton?code=DIWALI2026 still lands with the code.
// Nothing else on the link is carried (an email, a stray sport).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function go(req: Request, path: string): Response {
  const code = couponFromQuery(new URL(req.url).searchParams.get('code'))
  return new Response(null, {
    status: 307,
    headers: { Location: new URL(withPackLinkCode(path, code), req.url).href, 'Cache-Control': 'no-store' },
  })
}

export async function GET(req: Request, { params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  if (typeof sport !== 'string' || !PACK_LINK_SLUG_RE.test(sport)) return go(req, PACK_PATH)

  const ip = clientIp(req)
  if (hit(`packlink:${ip}`, 30, 60_000)) return go(req, PACK_PATH)

  const r = await packOffers(ip)
  if (r.kind !== 'ok') return go(req, PACK_PATH)
  const credits = packLinkCredits(new URL(req.url).searchParams.get('credits'))
  return go(req, packLinkTarget(sport, r.view.offers, credits))
}
