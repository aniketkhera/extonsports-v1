"use client";

import { useState } from "react";
import { COPY, FALLBACK_PHONE, PACK_SIGNIN, platformDown } from "@/lib/my-bookings/copy";
import { nextPathOf, type NextPath } from "@/lib/my-bookings/session";
import { BTN_PRIMARY, ERROR, INPUT, LABEL, postJson } from "./ui";
import PhoneText from "./PhoneText";

/* The 6-digit code, for a guest who asked on one device and opened the email on another,
   2026-10-20. With `email` (just sent from RequestPanel) only the code is asked for;
   without it ("I have a code") both fields show together.

   Every refusal reads the same — wrong, expired, used up, or an address that was never
   sent a code — because the platform answers them all with one 400.

   `next` and `variant`, 2026-10-21 (court 5-pack, orangish-app docs/court-packs.md §8.1):
   on /my-bookings/pack a code signs the guest in and goes BACK to the pack page, where the
   parked slot is waiting. `next` is re-checked against the allow-list right where it is
   used (nextPathOf), so no prop — however a parent built it — can send a freshly
   signed-in guest anywhere but /my-bookings or /my-bookings/pack. */
export default function CodeForm({
  email,
  next,
  variant = "list",
}: {
  email?: string;
  next?: NextPath;
  variant?: "list" | "pack";
}) {
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
      window.location.assign(nextPathOf(next));
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
            {variant === "pack" ? PACK_SIGNIN.emailLabel : COPY.emailLabel}
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
          <PhoneText text={error} phone={FALLBACK_PHONE} />
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
