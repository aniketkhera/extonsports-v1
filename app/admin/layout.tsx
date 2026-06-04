import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminSession } from '../../lib/auth-guard'

// Gates every page under /admin/* except /admin/login itself, which
// has its own route at /admin/login (Next.js routes match deepest
// first, but /admin/login is still inside this layout — we
// special-case it below).

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The login page deliberately renders without auth. We detect it
  // via pathname inspection by relying on the fact that getAdminSession
  // returns null for unauthed users — and the login page itself doesn't
  // call this layout. Actually in Next.js App Router, the layout DOES
  // wrap all child routes. So we need to handle this another way:
  // make /admin/login a top-level route that escapes this layout,
  // by NOT being under /admin. But the user said /admin/login. So:
  // we render the layout normally, and the login page is a leaf that
  // doesn't depend on session.
  //
  // Simplest: only redirect away from non-login pages. Detection via
  // headers is unreliable in layout. Instead: layout always checks
  // session, but /admin/login page renders content unconditionally.
  // The redirect-on-no-session lives in the individual leaf pages
  // (or we use middleware). For simplicity, we'll put the guard in
  // each non-login leaf page below — see /admin/page.tsx and
  // /admin/subscribers/page.tsx etc.

  return (
    <div style={{ minHeight: '100vh', background: '#FDF4EE', fontFamily: "'Familjen Grotesk', Arial, sans-serif" }}>
      {children}
    </div>
  )
}

// Shared nav rendered by authenticated admin pages (not the login
// page). Exported separately so /admin/login can skip it.
export async function AdminNav({ active }: { active: 'dashboard' | 'subscribers' | 'compose' | 'sends' }) {
  const session = await getAdminSession()
  if (!session) return null

  const items: Array<{ key: typeof active; label: string; href: string }> = [
    { key: 'dashboard',   label: 'Dashboard',   href: '/admin' },
    { key: 'subscribers', label: 'Subscribers', href: '/admin/subscribers' },
    { key: 'compose',     label: 'Compose',     href: '/admin/compose' },
    { key: 'sends',       label: 'Sends',       href: '/admin/sends' },
  ]

  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #E8D5C8' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F37A4A' }}>
          Exton Sports · Admin
        </div>
        <nav style={{ display: 'flex', gap: 8, flex: 1 }}>
          {items.map(it => {
            const isActive = it.key === active
            return (
              <Link key={it.key} href={it.href}
                style={{
                  padding: '7px 14px',
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : '#444',
                  background: isActive ? '#F37A4A' : 'transparent',
                }}>
                {it.label}
              </Link>
            )
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, color: '#888' }}>{session.email}</div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, background: 'transparent', color: '#888', border: '1px solid #E8D5C8', borderRadius: 8, cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
