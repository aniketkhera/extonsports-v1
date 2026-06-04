// Server-side helper for gating /admin/* server components and route
// handlers. Reads the session cookie, verifies the signed token,
// returns either the admin email (success) or null (caller should
// redirect to /admin/login).

import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifyToken, isAdmin } from './auth'

export type AdminSession = { email: string }

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const v = verifyToken(token)
  if (!v.valid || v.payload.kind !== 'session') return null
  if (!isAdmin(v.payload.email)) return null
  return { email: v.payload.email }
}
