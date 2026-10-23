"use client";

import { useState } from "react";
import { COPY, FALLBACK_PHONE, otherBookings, platformDown } from "@/lib/my-bookings/copy";
import { BOOKING_LIST_EMAIL_LIVE } from "@/lib/booking";
import CodeForm from "./CodeForm";
import PhoneText from "./PhoneText";
import { BTN_PRIMARY, BTN_TEXT, ERROR, INPUT, LABEL, postJson } from "./ui";

/* "Email me a link", 2026-10-20.

   ⛔ ONE SENTENCE FOR EVERY ADDRESS. On a 200 the panel shows COPY.sent whether the
   platform emailed a link, found nothing, or never heard of the address — the owner's
   rule (2026-10-18) that this page must never reveal whether an email has bookings. The
   code field opens under it either way, so the next screen does not differ either.

   The email stays in component state only — not in the URL, not in storage — and is
   handed to CodeForm so the guest types the code alone.

   Under the form, 2026-10-22: one static line for members and on-account bookers, who never
   get a sign-in link, pointing them to the home page's "Email my bookings" and the phone
   (otherBookings in lib/my-bookings/copy.ts). The same for every visitor: it belongs to the
   form, not to any answer, so no reply can change or remove it. "Email my bookings" goes to the home page's rates and booking panel,
   where the popup's button is, in the same tab, like the empty list's "Book a court or
   lane": a plain link. The popup is never mounted here, so this path still makes no
   browser call to the platform. */
const HOME_PANEL = "/#top";

export default function RequestPanel({ note }: { note?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "code">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const typed = String(fd.get("email") || "").trim();
    if (!typed) {
      setError(COPY.badEmail);
      return;
    }
    setState("sending");
    const r = await postJson("/api/my-bookings/request", {
      email: typed,
      company: String(fd.get("company") || ""),
    });
    if (r.status === 200) {
      setEmail(typed);
      setState("sent");
      return;
    }
    setState("idle");
    if (r.status === 400 && (r.json as { error?: string } | null)?.error === "bad_email") setError(COPY.badEmail);
    else if (r.status === 429) setError(COPY.tooMany);
    else setError(platformDown(FALLBACK_PHONE));
  }

  if (state === "sent") {
    return (
      <div>
        <p className="text-white/80 text-[1rem] leading-relaxed" role="status">
          {COPY.sent}
        </p>
        <div className="mt-6">
          <CodeForm email={email} />
        </div>
        <button
          type="button"
          className={`${BTN_TEXT} mt-6`}
          onClick={() => {
            setState("idle");
            setError("");
          }}
        >
          {COPY.sendNew}
        </button>
      </div>
    );
  }

  if (state === "code") {
    return (
      <div>
        <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{COPY.codeLead}</p>
        <CodeForm />
        <button type="button" className={`${BTN_TEXT} mt-6`} onClick={() => setState("idle")}>
          {COPY.sendNew}
        </button>
      </div>
    );
  }

  return (
    <div>
      {note && (
        <p className="text-white/80 text-[0.98rem] leading-relaxed mb-3" role="status">
          {note}
        </p>
      )}
      {!note && <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{COPY.lead}</p>}

      <form onSubmit={submit} noValidate className={note ? "mt-6" : undefined}>
        {/* Honeypot — hidden from people, filled by bots (the BadmintonEnquiry pattern). */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        <label htmlFor="mb-email" className={LABEL}>
          {COPY.emailLabel}
        </label>
        <input
          id="mb-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={email}
          placeholder="you@example.com"
          className={INPUT}
        />

        {error && (
          <p className={ERROR} role="alert">
            <PhoneText text={error} phone={FALLBACK_PHONE} />
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
          <button type="submit" className={BTN_PRIMARY} disabled={state === "sending"}>
            {state === "sending" ? COPY.sending : COPY.sendButton}
          </button>
          <button
            type="button"
            className={BTN_TEXT}
            onClick={() => {
              setError("");
              setState("code");
            }}
          >
            {COPY.haveCode}
          </button>
        </div>
      </form>

      <OtherBookings />
    </div>
  );
}

function OtherBookings() {
  const line = otherBookings(FALLBACK_PHONE, BOOKING_LIST_EMAIL_LIVE);
  return (
    <p className="text-white/55 text-[0.88rem] leading-relaxed mt-8">
      {line.before}
      {line.link && (
        <a href={HOME_PANEL} className="underline underline-offset-2">
          {line.link}
        </a>
      )}
      <PhoneText text={line.after} phone={FALLBACK_PHONE} />
    </p>
  );
}
