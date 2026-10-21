"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY, FALLBACK_PHONE, PACK_SIGNIN, platformDown } from "@/lib/my-bookings/copy";
import { PACKS_LIVE } from "@/lib/booking";
import type { NextPath } from "@/lib/my-bookings/session";
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

   The pack variant, 2026-10-21 (court 5-pack, orangish-app docs/court-packs.md §8.1): on
   /my-bookings/pack the same panel asks for the email with PACK_SIGNIN's words ("Send me
   a code"), and after Send says PACK_SIGNIN.sent — still ONE sentence for every address,
   on the same /api/my-bookings/request and the same 202 behind it — then "Nothing
   arriving? Check the address, or buy a 5-pack." The buy link comes in as `buyHref`, which
   the page sets only while PACKS_LIVE is on (the buy page deploys unlinked); without it the
   sentence stops at "Check the address." `next` is handed on to CodeForm, which checks it
   against the allow-list where it navigates.

   The list's sentence names a 5-pack (COPY.sentWithPack) only while PACKS_LIVE is on
   (review R10, 2026-10-21): the site deploys with no pack on sale, and the platform's own
   sign-in email names packs only once court_packs_public is on. */

export default function RequestPanel({
  note,
  next,
  variant = "list",
  buyHref = null,
}: {
  note?: string;
  next?: NextPath;
  variant?: "list" | "pack";
  buyHref?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "code">("idle");
  const [error, setError] = useState("");
  const pack = variant === "pack";
  const sendNew = pack ? PACK_SIGNIN.sendNewCode : COPY.sendNew;

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
          {pack ? PACK_SIGNIN.sent : PACKS_LIVE ? COPY.sentWithPack : COPY.sent}
        </p>
        {pack && (
          <p className="text-white/65 text-[0.95rem] leading-relaxed mt-2">
            {buyHref ? (
              <>
                {PACK_SIGNIN.nothingArriving}{" "}
                <Link href={buyHref} className="underline underline-offset-4 text-[var(--ember-ink)]">
                  {PACK_SIGNIN.buyLink}
                </Link>
                .
              </>
            ) : (
              PACK_SIGNIN.nothingArrivingNoBuy
            )}
          </p>
        )}
        <div className="mt-6">
          {pack && <p className="text-white/65 text-[0.98rem] leading-relaxed mb-4">{PACK_SIGNIN.codeLead}</p>}
          <CodeForm email={email} next={next} variant={variant} />
        </div>
        <button
          type="button"
          className={`${BTN_TEXT} mt-6`}
          onClick={() => {
            setState("idle");
            setError("");
          }}
        >
          {sendNew}
        </button>
      </div>
    );
  }

  if (state === "code") {
    return (
      <div>
        <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{pack ? PACK_SIGNIN.codeLead : COPY.codeLead}</p>
        <CodeForm next={next} variant={variant} />
        <button type="button" className={`${BTN_TEXT} mt-6`} onClick={() => setState("idle")}>
          {sendNew}
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
      {!note && (
        <p className="text-white/65 text-[0.98rem] leading-relaxed mb-6">{pack ? PACK_SIGNIN.emailLead : COPY.lead}</p>
      )}

      <form onSubmit={submit} noValidate className={note ? "mt-6" : undefined}>
        {/* Honeypot — hidden from people, filled by bots (the BadmintonEnquiry pattern). */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        <label htmlFor="mb-email" className={LABEL}>
          {pack ? PACK_SIGNIN.emailLabel : COPY.emailLabel}
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
            {state === "sending"
              ? pack
                ? PACK_SIGNIN.sending
                : COPY.sending
              : pack
                ? PACK_SIGNIN.sendCode
                : COPY.sendButton}
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
    </div>
  );
}
