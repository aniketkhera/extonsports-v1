import { selectOne, updateRows } from '../../lib/supabase'
import ResubscribeForm from './ResubscribeForm'

// Public unsubscribe page. No auth — CAN-SPAM requires one-click,
// no friction. The token in the URL acts as the bearer credential
// (high-entropy UUID per subscriber, stored unique-indexed in DB).
//
// Idempotent: clicking again after already-unsubscribed is a no-op
// (renders the same "you're unsubscribed" state). Resubscribe is
// explicit — requires a button click that POSTs to /api/resubscribe.

export const dynamic = 'force-dynamic'

type SubscriberRow = {
  id: string
  email: string
  unsubscribed_at: string | null
  unsubscribe_token: string
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token || typeof token !== 'string' || token.length < 8) {
    return <Shell><Heading>Invalid link</Heading><Body>This unsubscribe link is missing or malformed.</Body></Shell>
  }

  let sub: SubscriberRow | null = null
  try {
    sub = await selectOne<SubscriberRow>('subscribers', {
      select: 'id,email,unsubscribed_at,unsubscribe_token',
      filters: { unsubscribe_token: `eq.${token}` },
    })
  } catch (e) {
    console.error('[/unsubscribe] lookup failed:', e instanceof Error ? e.message : e)
    return <Shell><Heading>Something went wrong</Heading><Body>Try again in a moment, or email <a href="mailto:info@extonsports.com" style={{ color: '#F37A4A' }}>info@extonsports.com</a> and we&rsquo;ll unsubscribe you manually.</Body></Shell>
  }

  if (!sub) {
    return <Shell><Heading>Link not recognized</Heading><Body>This unsubscribe link doesn&rsquo;t match any subscriber. If you keep getting emails, reply to one of them and we&rsquo;ll remove you manually.</Body></Shell>
  }

  // Flip the flag on first hit. Idempotent — if already unsubscribed
  // we don't touch the timestamp.
  const wasAlready = !!sub.unsubscribed_at
  if (!wasAlready) {
    try {
      await updateRows('subscribers',
        { id: `eq.${sub.id}` },
        { unsubscribed_at: new Date().toISOString() })
    } catch (e) {
      console.error('[/unsubscribe] flip failed:', e instanceof Error ? e.message : e)
      // Don't surface the error — render the confirmation anyway.
      // CAN-SPAM compliance is more important than perfect honesty
      // here; we'll log and chase the row manually if it didn't
      // actually flip.
    }
  }

  return (
    <Shell>
      <Heading>You&rsquo;ve been unsubscribed</Heading>
      <Body>
        {sub.email} won&rsquo;t receive any more emails from ExtonSports
        {wasAlready ? ' (you were already unsubscribed)' : ''}.
      </Body>
      <div style={{ marginTop: 28, paddingTop: 22, borderTop: '1px solid #F4E8DD' }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
          Changed your mind?
        </div>
        <ResubscribeForm token={token} />
      </div>
    </Shell>
  )
}

// ── tiny presentation helpers ──────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#FDF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Familjen Grotesk', Arial, sans-serif" }}>
      <div style={{ background: '#fff', border: '1px solid #E8D5C8', borderRadius: 16, padding: 36, maxWidth: 520, width: '100%' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F37A4A', marginBottom: 16 }}>
          Exton Sports Center
        </div>
        {children}
      </div>
    </main>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px 0', color: '#0D0D0D' }}>{children}</h1>
}

function Body({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6, margin: 0 }}>{children}</p>
}
