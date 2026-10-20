"use client";

import { useState } from "react";
import { COPY, FALLBACK_PHONE, platformDown } from "@/lib/my-bookings/copy";
import { BTN_PRIMARY, ERROR, INPUT, LABEL, postJson } from "./ui";

/* The 6-digit code, for a guest who asked on one device and opened the email on another,
   2026-10-20. With `email` (just sent from RequestPanel) only the code is asked for;
   without it ("I have a code") both fields show together.

   Every refusal reads the same — wrong, expired, used up, or an address that was never
   sent a code — because the platform answers them all with one 400. */
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
      setError(COPY.codeError);
      return;
    }
    setBusy(true);
    const r = await postJson("/api/my-bookings/verify", { email: addr, code });
    if (r.status === 200) {
      // A full load, not a client transition: the page must re-render on the server
      // with the cookie the response just set.
      window.location.assign("/my-bookings");
      return;
    }
    setBusy(false);
    if (r.status === 400) setError(COPY.codeError);
    else if (r.status === 429) setError(COPY.tooMany);
    else setError(platformDown(FALLBACK_PHONE));
  }

  return (
    <form onSubmit={submit} noValidate>
      {!email && (
        <div className="mb-4">
          <label htmlFor="mb-code-email" className={LABEL}>
            {COPY.emailLabel}
          </label>
          <input
            id="mb-code-email"
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
      <label htmlFor="mb-code" className={LABEL}>
        {COPY.codeLabel}
      </label>
      <input
        id="mb-code"
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
          {error}
        </p>
      )}
      <div className="mt-5">
        <button type="submit" className={BTN_PRIMARY} disabled={busy}>
          {busy ? COPY.checking : COPY.codeButton}
        </button>
      </div>
    </form>
  );
}
