"use client";

import { useState } from "react";
import { ACADEMY_COPY, platformDown } from "@/lib/academies/copy";
import { ACADEMY_PATH } from "@/lib/academies/session";
import { FALLBACK_PHONE } from "@/lib/my-bookings/copy";
import PhoneText from "../../my-bookings/_components/PhoneText";
import { BTN_PRIMARY, ERROR, INPUT, LABEL, postJson } from "../../my-bookings/_components/ui";

/* The 6-digit code, for a partner who asked on one phone and opened the email on another,
   2026-11-16 (app/my-bookings/_components/CodeForm.tsx, academy scope). With `email` (just
   sent from RequestPanel) only the code is asked for; without it ("I have a code") both.

   Every refusal reads the same — wrong, expired, used up, or an address that was never sent a
   code — because the platform answers them all with one 400. A success goes to /academies
   and nowhere else: there is no `next` on this path (lib/academies/session.ts ACADEMY_PATH). */
export default function CodeForm({ email }: { email?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const addr = (email ?? String(fd.get("email") || "")).trim();
    const code = String(fd.get("code") || "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code) || !addr) {
      setError(ACADEMY_COPY.codeError);
      return;
    }
    setBusy(true);
    const r = await postJson("/api/academies/verify", { email: addr, code });
    if (r.status === 200) {
      // A full load, not a client transition: the page must re-render on the server with the
      // cookie the response just set.
      window.location.assign(ACADEMY_PATH);
      return;
    }
    setBusy(false);
    if (r.status === 400) setError(ACADEMY_COPY.codeError);
    else if (r.status === 404) setError(ACADEMY_COPY.off);
    else if (r.status === 429) setError(ACADEMY_COPY.tooMany);
    else setError(platformDown(FALLBACK_PHONE));
  }

  return (
    <form onSubmit={submit} noValidate>
      {!email && (
        <div className="mb-4">
          <label htmlFor="ac-code-email" className={LABEL}>
            {ACADEMY_COPY.emailLabel}
          </label>
          <input
            id="ac-code-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="you@example.com"
            className={INPUT}
          />
        </div>
      )}
      <label htmlFor="ac-code" className={LABEL}>
        {ACADEMY_COPY.codeLabel}
      </label>
      <input
        id="ac-code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        required
        className={`${INPUT} max-w-[200px] tracking-[0.3em] font-semibold`}
      />
      {error && (
        <p className={ERROR} role="alert">
          <PhoneText text={error} phone={FALLBACK_PHONE} />
        </p>
      )}
      <div className="mt-5">
        <button type="submit" className={BTN_PRIMARY} disabled={busy}>
          {busy ? ACADEMY_COPY.checking : ACADEMY_COPY.codeButton}
        </button>
      </div>
    </form>
  );
}
