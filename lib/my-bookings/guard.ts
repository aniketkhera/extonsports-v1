// Request guards for app/api/my-bookings/*, 2026-10-20. Pure — node:test loads it as is.
//
// CSRF HERE IS FOUR LAYERS, and this file is the second:
//   1. the device cookie is SameSite=Lax (./session.ts), so a cross-site POST, iframe or
//      fetch arrives WITHOUT it;
//   2. sameOriginProblem below: a POST must carry an Origin equal to this site's own;
//   3. JSON-only bodies, which forces a CORS preflight cross-origin — and this site
//      serves no CORS headers, so the preflight fails;
//   4. the platform re-checks that the series belongs to the session's profile and club.
// One layer would probably do. A cancel moves money, so it gets all four.

export type OriginProblem = 'no_origin' | 'cross_origin' | 'cross_site' | 'not_json'

/**
 * Stricter than Next's own Server Action check on purpose: a MISSING Origin is refused,
 * not waved through. Every browser this site supports sends Origin on a same-origin POST
 * fetch; something that does not is not our page.
 */
export function sameOriginProblem(req: Request): OriginProblem | null {
  const origin = req.headers.get('origin')
  if (!origin) return 'no_origin'
  let own: string
  try {
    own = new URL(req.url).origin
  } catch {
    return 'cross_origin'
  }
  if (origin !== own) return 'cross_origin'
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return 'cross_site'
  const type = (req.headers.get('content-type') || '').toLowerCase()
  if (!type.startsWith('application/json')) return 'not_json'
  return null
}

/**
 * The visitor's IP, for THIS site's own best-effort limiter only — it is never sent to the
 * platform (the platform limits on email hash and session instead). Mirrors orangish-app
 * getClientIp: Vercel's own header first (the client cannot forge it there), then
 * x-real-ip, then the RIGHTMOST X-Forwarded-For hop, which is the one the edge appended.
 */
export function clientIp(req: Request): string {
  const h = req.headers
  const vercel = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
  if (vercel) return vercel
  const real = h.get('x-real-ip')?.trim()
  if (real) return real
  const xff = h.get('x-forwarded-for')
  if (xff) {
    const hops = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return 'unknown'
}

/* An in-memory fixed-window limiter. BEST EFFORT, and knowingly so: serverless instances
   do not share memory, so a determined caller spread across instances gets more. The
   durable limits are the platform's (per email hash, per club, per session, 5 attempts
   per code); this one only keeps a single noisy client from spending them. Bounded so a
   flood of distinct keys cannot grow it without limit. */
const MAX_KEYS = 5000
const windows = new Map<string, { start: number; count: number }>()

/** True when this call is OVER the limit (refuse it). */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const w = windows.get(key)
  if (!w || now - w.start >= windowMs) {
    if (!w && windows.size >= MAX_KEYS) {
      // Drop expired windows first; if none have expired, drop the oldest insertion.
      for (const [k, v] of windows) if (now - v.start >= windowMs) windows.delete(k)
      if (windows.size >= MAX_KEYS) {
        const oldest = windows.keys().next().value
        if (oldest !== undefined) windows.delete(oldest)
      }
    }
    windows.set(key, { start: now, count: 1 })
    return limit < 1
  }
  w.count += 1
  return w.count > limit
}

/** Test seam: forget every window. */
export function resetLimits(): void {
  windows.clear()
}

/** A plausibility check only. The platform normalises and decides; this just stops junk. */
export function isEmailShape(s: unknown): s is string {
  return typeof s === 'string' && s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export const CODE_RE = /^\d{6}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const BODY_MAX_BYTES = 4096

/**
 * The JSON body as a plain object, or null (=> 400). Read as text so the size is checked
 * on what actually arrived, not on a Content-Length the client chose.
 */
export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > BODY_MAX_BYTES) return null
  let text: string
  try {
    text = await req.text()
  } catch {
    return null
  }
  if (new TextEncoder().encode(text).length > BODY_MAX_BYTES) return null
  try {
    const v: unknown = JSON.parse(text || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}
