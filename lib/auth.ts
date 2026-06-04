// Magic-link auth for the ExtonSports admin. No passwords.
//
// Two token types, both signed JWTs (HS256 via Node's built-in
// crypto — avoids pulling in jose):
//
//   - MAGIC LINK token (lifetime: 15 min). Emailed as part of the
//     sign-in URL. On click, exchanged for a session cookie.
//
//   - SESSION token (lifetime: 30 days). Stored as a signed,
//     httpOnly, secure cookie. Re-checked on every /admin/* request.
//
// Allowlist: the EXTONSPORTS_ADMIN_EMAILS env var holds a
// comma-separated list of admin emails. To add or remove an admin,
// edit env in Vercel + redeploy. v1 holds only info@extonsports.com.
//
// Server-only.

import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.AUTH_SECRET
const ALLOWLIST_RAW = process.env.EXTONSPORTS_ADMIN_EMAILS || ''

export const SESSION_COOKIE = 'es_session'
export const MAGIC_LINK_TTL = 15 * 60          // 15 min
export const SESSION_TTL    = 30 * 24 * 3600   // 30 days

export class AuthConfigError extends Error {}

function assertSecret(): string {
  if (!SECRET || SECRET.length < 32) {
    throw new AuthConfigError('AUTH_SECRET env var is missing or too short (need ≥32 chars).')
  }
  return SECRET
}

export function isAdmin(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  const list = ALLOWLIST_RAW.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return list.includes(normalized)
}

// ── token sign / verify ────────────────────────────────────────────
// Compact format: <base64url-payload>.<base64url-sig>
// We skip the JWT header since we only ever use HS256.

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4 || 4)
  const padded = s + '='.repeat(pad === 4 ? 0 : pad)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

type TokenPayload = {
  email: string
  kind: 'magic' | 'session'
  iat: number  // unix seconds
  exp: number  // unix seconds
}

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, ttlSec: number): string {
  const secret = assertSecret()
  const now = Math.floor(Date.now() / 1000)
  const full: TokenPayload = { ...payload, iat: now, exp: now + ttlSec }
  const body = b64urlEncode(Buffer.from(JSON.stringify(full)))
  const sig = b64urlEncode(createHmac('sha256', secret).update(body).digest())
  return `${body}.${sig}`
}

export type VerifyResult =
  | { valid: true; payload: TokenPayload }
  | { valid: false; reason: 'malformed' | 'bad-signature' | 'expired' }

export function verifyToken(token: string | null | undefined): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'malformed' }
  }
  const secret = assertSecret()
  const [body, sig] = token.split('.', 2)
  let expected: Buffer
  try {
    expected = createHmac('sha256', secret).update(body).digest()
  } catch {
    return { valid: false, reason: 'malformed' }
  }
  let actual: Buffer
  try {
    actual = b64urlDecode(sig)
  } catch {
    return { valid: false, reason: 'malformed' }
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { valid: false, reason: 'bad-signature' }
  }
  let payload: TokenPayload
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'))
  } catch {
    return { valid: false, reason: 'malformed' }
  }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired' }
  }
  return { valid: true, payload }
}

// ── session cookie helpers ─────────────────────────────────────────

// Build the Set-Cookie header for the session token. httpOnly so the
// browser JS can't read it; Secure so it only goes over HTTPS;
// SameSite=Lax so it survives the verify-redirect from an email click.
export function buildSessionCookie(token: string): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${SESSION_TTL}`,
  ]
  return parts.join('; ')
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
}
