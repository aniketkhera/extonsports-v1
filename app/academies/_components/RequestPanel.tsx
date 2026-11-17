"use client";

import { useState } from "react";
import { ACADEMY_COPY, platformDown } from "@/lib/academies/copy";
import { FALLBACK_PHONE } from "@/lib/my-bookings/copy";
import PhoneText from "../../my-bookings/_components/PhoneText";
import { BTN_PRIMARY, BTN_TEXT, ERROR, INPUT, LABEL, postJson } from "../../my-bookings/_components/ui";
import CodeForm from "./CodeForm";
import s from "./academies.module.css";

/* "Email me a link" on /academies, 2026-11-16 (orangish-app docs/academy-page.md D1; the
   mockup's screen 1). app/my-bookings/_components/RequestPanel.tsx, without its members line
   and court-pack variant.

   ⛔ ONE SENTENCE FOR EVERY ADDRESS. On a 200 the panel shows ACADEMY_COPY.sent whether the
   platform emailed a link (an allow-listed partner address) or sent nothing (anyone else) —
   D1: the page never reveals who is an academy. The code field opens under it either way, so
   the next screen does not differ either.

   The email stays in component state only — not in the URL, not in storage — and is handed to
   CodeForm so the partner types the code alone. */
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
      setError(ACADEMY_COPY.badEmail);
      return;
    }
    setState("sending");
    const r = await postJson("/api/academies/request", { email: typed, company: String(fd.get("company") || "") });
    if (r.status === 200) {
      setEmail(typed);
      setState("sent");
      return;
    }
    setState("idle");
    const err = (r.json as { error?: string } | null)?.error;
    if (r.status === 400 && err === "bad_email") setError(ACADEMY_COPY.badEmail);
    else if (r.status === 404) setError(ACADEMY_COPY.off);
    else if (r.status === 429) setError(ACADEMY_COPY.tooMany);
    else setError(platformDown(FALLBACK_PHONE));
  }

  if (state === "sent") {
    return (
      <div>
        <div className={s.okBox} role="status">
          <h2 className="text-cond text-white text-[1.3rem] mb-1.5">{ACADEMY_COPY.sentHeading}</h2>
          <p className="text-white/80 text-[0.95rem] leading-relaxed">{ACADEMY_COPY.sent}</p>
        </div>
        <div className="mt-6">
          <CodeForm email={email} />
        </div>
        <button type="button" className={`${BTN_TEXT} mt-6`} onClick={() => { setState("idle"); setError(""); }}>
          {ACADEMY_COPY.sendNew}
        </button>
      </div>
    );
  }

  if (state === "code") {
    return (
      <div>
        <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{ACADEMY_COPY.codeLead}</p>
        <CodeForm />
        <button type="button" className={`${BTN_TEXT} mt-6`} onClick={() => setState("idle")}>
          {ACADEMY_COPY.sendNew}
        </button>
      </div>
    );
  }

  return (
    <div>
      {note ? (
        <p className="text-white/80 text-[0.98rem] leading-relaxed mb-6" role="status">{note}</p>
      ) : (
        <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{ACADEMY_COPY.lead}</p>
      )}
      <form onSubmit={submit} noValidate>
        {/* Honeypot — hidden from people, filled by bots (the BadmintonEnquiry pattern). */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label htmlFor="ac-email" className={LABEL}>
          {ACADEMY_COPY.emailLabel}
        </label>
        <input
          id="ac-email"
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
            {state === "sending" ? ACADEMY_COPY.sending : ACADEMY_COPY.sendButton}
          </button>
          <button type="button" className={BTN_TEXT} onClick={() => { setError(""); setState("code"); }}>
            {ACADEMY_COPY.haveCode}
          </button>
        </div>
      </form>
    </div>
  );
}
