'use client'

import { useState } from 'react'

export default function ResubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      const res = await fetch('/api/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) { setState('error'); return }
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '10px 14px', borderRadius: 9, fontSize: 14 }}>
        You&rsquo;re back on the list. Welcome back.
      </div>
    )
  }

  return (
    <form onSubmit={submit}>
      <button
        type="submit"
        disabled={state === 'sending'}
        style={{ padding: '10px 16px', fontSize: 14, fontWeight: 700, background: 'transparent', color: '#F37A4A', border: '1px solid #F37A4A', borderRadius: 9, cursor: state === 'sending' ? 'not-allowed' : 'pointer', opacity: state === 'sending' ? 0.6 : 1 }}
      >
        {state === 'sending' ? 'Resubscribing…' : 'Resubscribe'}
      </button>
      {state === 'error' && <div style={{ color: '#991B1B', fontSize: 13, marginTop: 10 }}>Couldn&rsquo;t resubscribe. Try again or email info@extonsports.com.</div>}
    </form>
  )
}
