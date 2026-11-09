'use client'

/* The form on extonsports.com/live. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   One field, a ticked-by-default mailing-list box, Send. Not a popup: this page exists
   only to do this, so there is nothing to overlay and nothing to trap focus against.

   STYLED AS THE SITE IS, not as a stranger would. The first cut used rounded corners,
   a cream ground and hardcoded light colours, which looked like a different product on a
   site whose default theme is dark (app/globals.css: `:root { color-scheme: dark }`, with
   `:root[data-theme="light"]` as the override). The classes below are lifted from
   BadmintonEnquiry.tsx, which is the repo's other public form: squared corners, mono
   micro-labels, ember on black for the one action. `text-white/NN` is deliberate rather
   than a token — globals.css remaps those classes under the light theme.

   The box sits BEFORE Send in the page and in Tab order, for the same reason it does in
   the October popup: nobody should press Send without having passed it. */

import { useId, useState } from 'react'
import { LIVE_COPY, sendLiveLink, type Outcome } from './live-pure'
import { isEmailShaped } from './my-bookings-pure'

const INPUT_CLASS =
  'w-full border focus:border-[var(--color-ember)] text-white placeholder:text-white/30 px-3.5 py-3 text-[0.95rem] outline-none transition-colors'
const LABEL_CLASS = 'block text-mono text-[0.6rem] text-white/50 mb-1.5'

/* ⚠️ THE SURFACE COLOURS ARE INLINE, NOT `bg-[var(--color-ink-2)]`.
   --color-* are Tailwind v4 @theme tokens (app/globals.css line 3), and the arbitrary-value
   utility did not follow the `:root[data-theme="light"]` override: measured 2026-11-09 with
   the page in dark, --color-ink-2 resolved to #13202F while the field still painted #EEF2F6,
   the LIGHT value. An inline style reading the same var is live in both themes, and it is
   what globals.css itself says the hero surfaces do. Checked in both themes after changing. */
const SURFACE = { background: 'var(--color-ink-2)', borderColor: 'var(--color-line-2)' }

export default function LiveGate() {
  const emailId = useId()
  const optinId = useId()
  const noteId = useId()
  const [email, setEmail] = useState('')
  const [optin, setOptin] = useState(true)
  const [honeypot, setHoneypot] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const value = email.trim()
    if (!isEmailShaped(value)) {
      setOutcome('invalid')
      return
    }
    setBusy(true)
    setOutcome(null)
    const r = await sendLiveLink(value, { optin, website: honeypot })
    setBusy(false)
    setOutcome(r)
    if (r === 'sent') setEmail('')
  }

  if (outcome === 'sent') {
    return (
      <div
        role="status"
        className="max-w-[26rem] border-l-2 px-5 py-4"
        style={{ background: 'var(--color-ink)', borderColor: 'var(--color-ember)' }}
      >
        <p className="text-mono text-[0.6rem] text-[var(--color-ember)] mb-2">CHECK YOUR EMAIL</p>
        <p className="text-white text-[0.98rem] leading-relaxed">{LIVE_COPY.sent}</p>
        <p className="text-white/40 text-[0.78rem] leading-relaxed mt-3">{LIVE_COPY.keepIt}</p>
      </div>
    )
  }

  return (
    <form className="max-w-[26rem]" onSubmit={submit} noValidate>
      <label className={LABEL_CLASS} htmlFor={emailId}>
        {LIVE_COPY.field.toUpperCase()}
      </label>
      <input
        id={emailId}
        className={INPUT_CLASS}
        style={SURFACE}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        aria-describedby={outcome ? noteId : undefined}
        aria-invalid={outcome === 'invalid' || undefined}
        required
      />

      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <input
        className="absolute -left-[9999px] h-px w-px opacity-0"
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
      />

      <div className="flex items-start gap-2.5 mt-3.5">
        <input
          id={optinId}
          type="checkbox"
          checked={optin}
          onChange={e => setOptin(e.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--color-ember)]"
        />
        <label htmlFor={optinId} className="text-white/60 text-[0.85rem] leading-snug cursor-pointer">
          {LIVE_COPY.optin}
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 inline-block bg-[var(--color-ember)] text-black hover:bg-[var(--color-ember-hi)] disabled:opacity-50 text-mono text-[0.7rem] transition-colors"
      >
        <span className="inline-block px-6 py-3">
          {(busy ? LIVE_COPY.sending : LIVE_COPY.send).toUpperCase()}
        </span>
      </button>

      {outcome ? (
        <p id={noteId} role="alert" className="text-[var(--color-ember)] text-[0.82rem] mt-4">
          {outcome === 'invalid' ? LIVE_COPY.invalid : LIVE_COPY.failed}
        </p>
      ) : null}
    </form>
  )
}
