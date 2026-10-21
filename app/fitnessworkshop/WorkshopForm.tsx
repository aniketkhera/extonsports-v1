"use client";

import { useState } from "react";
import { WORKSHOP } from "@/lib/fitness-workshop";

/* The sign-up form for the POWER x SeRa Fitness workshop (2026-10-21).
   ──────────────────────────────────────────────────────────────────────────
   The organiser's own Google Form's questions, which this replaces, less the
   Zelle number: the workshop is free since 2026-10-21.
   Posts same-origin to /api/fitnessworkshop, which relays to the
   platform; that files the sign-up and emails the organiser.

   Nothing is emailed to the address typed here (see the platform route for
   why), so the confirmation the person gets is THIS screen: it says what was
   filed, plainly enough to screenshot. */

const INPUT_CLASS =
  "w-full bg-[var(--color-ink-2)] border border-[var(--color-line-2)] focus:border-[var(--color-ember)] text-white placeholder:text-white/30 px-3.5 py-2.5 text-[0.95rem] outline-none transition-colors";
const LABEL_CLASS = "block text-mono text-[0.6rem] text-white/50 mb-1.5";

type Done = { participants: number; name: string; notified: boolean };

export default function WorkshopForm() {
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      participants: Number(fd.get("participants") || 0),
      website: String(fd.get("website") || ""),
    };
    // Client-side guardrail only; the platform re-checks every field.
    if (!payload.name || !payload.email || !payload.phone || !payload.participants) {
      setError("Please fill in every field.");
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/fitnessworkshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send that.");
      setDone({
        participants: Number(data?.participants) || payload.participants,
        name: payload.name,
        notified: data?.notified !== false,
      });
    } catch (err) {
      // fetch itself failing (offline, blocked) throws a TypeError in the browser's own
      // words ("Failed to fetch"); say something a person can act on instead.
      setError(
        err instanceof TypeError
          ? "Could not reach us. Check your connection and try again, or call (484) 252-2523."
          : err instanceof Error
            ? err.message
            : "Something went wrong.",
      );
    } finally {
      setState("idle");
    }
  }

  if (done) {
    const people = done.participants === 1 ? "1 person" : `${done.participants} people`;
    return (
      <div
        role="status"
        className="border border-[var(--color-ember)]/50 bg-[var(--color-ember)]/[0.06] p-6 sm:p-8"
      >
        <div className="text-cond text-[1.7rem] text-white mb-2">You&rsquo;re signed up!</div>
        <p className="text-white/80 text-[0.95rem] leading-[1.6]">
          {done.notified ? (
            <>
              Thank you, {done.name}. We&rsquo;ve passed your sign-up for{" "}
              <strong className="text-white">{people}</strong> to the organiser, {WORKSHOP.organiser}.
            </>
          ) : (
            <>
              Thank you, {done.name}. Your sign-up for <strong className="text-white">{people}</strong> is
              saved, but our note to the organiser didn&rsquo;t go through just now. We&rsquo;ll make sure she
              gets it; you don&rsquo;t need to sign up again.
            </>
          )}
        </p>
        <p className="mt-3 text-white/65 text-[0.9rem] leading-[1.6]">
          See you {WORKSHOP.day}, {WORKSHOP.time}, at {WORKSHOP.where}. We don&rsquo;t send a
          confirmation email, so keep a screenshot of this page if you&rsquo;d like one.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      method="post"
      action="/api/fitnessworkshop"
      noValidate
      className="border border-[var(--color-line)] bg-[var(--color-ink)] p-6 sm:p-8"
    >
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="fw-name" className={LABEL_CLASS}>Name</label>
          <input id="fw-name" name="name" required autoComplete="name" maxLength={100} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="fw-email" className={LABEL_CLASS}>Email</label>
          <input id="fw-email" name="email" type="email" required autoComplete="email" maxLength={254} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="fw-phone" className={LABEL_CLASS}>Phone</label>
          <input id="fw-phone" name="phone" type="tel" required autoComplete="tel" maxLength={32} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="fw-participants" className={LABEL_CLASS}>Number of participants</label>
          <select id="fw-participants" name="participants" defaultValue="1" className={INPUT_CLASS}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </div>
      </div>


      {error && (
        <p role="alert" className="mt-5 border border-red-500/40 bg-red-500/10 text-red-200 text-[0.85rem] px-3.5 py-2.5">{error}</p>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-6 inline-flex items-center gap-2.5 bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] disabled:opacity-60 text-black text-cond text-[1rem] px-8 py-3.5 transition-colors"
      >
        {state === "sending" ? "Signing you up…" : "Sign me up"}
      </button>

      <p className="mt-5 text-white/45 text-[0.78rem] leading-[1.55]">
        We pass your details to the organiser, {WORKSHOP.organiser} of SeRa Fitness, so she can confirm
        your place. We won&rsquo;t text you or add you to a mailing list.{" "}
        <a href="/privacy" className="underline hover:text-[var(--color-ember)]">Privacy</a>
      </p>
    </form>
  );
}
