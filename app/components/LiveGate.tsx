'use client'

/* The form on extonsports.com/live. 2026-11-09.
   ──────────────────────────────────────────────────────────────────────────────
   One field, a ticked-by-default mailing-list box, Send. Not a popup: this page exists
   only to do this, so there is nothing to overlay and nothing to trap focus against.

   The box sits BEFORE Send in the page and in Tab order, for the same reason it does in
   the October popup: nobody should press Send without having passed it. */

import { useId, useState } from 'react'
import { LIVE_COPY, sendLiveLink, type Outcome } from './live-pure'
import { isEmailShaped } from './my-bookings-pure'
import s from './live-gate.module.css'

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
      <div className={s.done} role="status">
        <p className={s.doneLine}>{LIVE_COPY.sent}</p>
        <p className={s.doneSmall}>{LIVE_COPY.keepIt}</p>
      </div>
    )
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.label} htmlFor={emailId}>
        {LIVE_COPY.field}
      </label>
      <input
        id={emailId}
        className={s.input}
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        aria-describedby={outcome ? noteId : undefined}
        aria-invalid={outcome === 'invalid' || undefined}
        required
      />

      {/* Honeypot. Off-screen rather than display:none, which some bots skip. */}
      <input
        className={s.trap}
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
      />

      <div className={s.optinRow}>
        <input
          id={optinId}
          className={s.check}
          type="checkbox"
          checked={optin}
          onChange={e => setOptin(e.target.checked)}
        />
        <label className={s.optinLabel} htmlFor={optinId}>
          {LIVE_COPY.optin}
        </label>
      </div>

      <button className={s.send} type="submit" disabled={busy}>
        {busy ? LIVE_COPY.sending : LIVE_COPY.send}
      </button>

      {outcome ? (
        <p id={noteId} className={s.problem} role="alert">
          {outcome === 'invalid' ? LIVE_COPY.invalid : LIVE_COPY.failed}
        </p>
      ) : null}
    </form>
  )
}
