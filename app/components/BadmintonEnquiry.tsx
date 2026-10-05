"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* The badminton academy's "Learn more" form.
   ──────────────────────────────────────────────────────────────────────────
   Posts same-origin to /api/enquiry, which forwards server-side to the
   platform. That files it into the admin Switchboard and texts the Exton
   handset — see app/api/enquiry/route.ts.

   ⚠️ IT MUST PORTAL TO document.body. The academies panel it is opened from is
   a framer-motion element animating `y`, which establishes a containing block,
   so a `position: fixed` overlay rendered inside it resolves against that box
   and lands halfway down the page. Same reason BookingsCalendar portals; the
   note there is the long version. */

const INPUT_CLASS =
  "w-full bg-[var(--color-ink-2)] border border-[var(--color-line-2)] focus:border-[var(--color-ember)] text-white placeholder:text-white/30 px-3.5 py-2.5 text-[0.9rem] outline-none transition-colors";
const LABEL_CLASS = "block text-mono text-[0.6rem] text-white/50 mb-1.5";

export default function BadmintonEnquiry() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  /* No `mounted` flag: createPortal is only reached inside the `open` branch
     below, and `open` starts false and can only be set by a click, so the
     portal never runs during SSR. A mounted-state effect would be a
     set-state-in-effect lint error for no benefit. */

  const close = useCallback(() => {
    setOpen(false);
    setError("");
    setState("idle");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      message: String(fd.get("message") || "").trim(),
      company: String(fd.get("company") || ""),
      sport: "badminton",
    };

    /* Client-side guardrails only — the route re-validates all four, and the
       phone rule in particular is enforced there because the Switchboard
       cannot file a number it can't key on. */
    if (!payload.name || !payload.email || !payload.phone || !payload.message) {
      setError("Please fill in every field.");
      return;
    }

    setState("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send that.");
      setState("ok");
      formEl.reset();
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-block text-[var(--color-ember)] hover:text-white text-mono text-[0.7rem] transition-colors"
    >
      <span className="inline-block border border-[var(--color-ember)]/50 px-5 py-2.5">
        Learn more
      </span>
    </button>
  );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      {createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Badminton academy enquiry"
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto"
          style={{ background: "rgba(10,16,25,0.88)", backdropFilter: "blur(2px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className="w-full outline-none"
            style={{
              maxWidth: 560,
              margin: "40px 0",
              background: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              padding: "22px 24px 26px",
            }}
          >
            <div className="flex items-start justify-between gap-4 mb-1">
              <h2
                className="text-cond text-white"
                style={{ fontSize: "clamp(1.25rem, 2.6vw, 1.8rem)" }}
              >
                Badminton academy
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-mono text-[0.7rem] text-white/50 hover:text-white transition-colors shrink-0 px-2 py-1"
              >
                CLOSE
              </button>
            </div>

            {state === "ok" ? (
              <div className="pt-3">
                <p className="text-white/80 text-[0.95rem] leading-relaxed">
                  Thanks — that&rsquo;s with us. Philadelphia Badminton will be in
                  touch about coaching, levels and fees.
                </p>
                <p className="text-white/45 text-[0.85rem] mt-3">
                  In a hurry? Call{" "}
                  <a href="tel:+14842522523" className="text-[var(--color-ember)]">
                    (484) 252-2523
                  </a>
                  .
                </p>
              </div>
            ) : (
              <>
                <p className="text-white/50 text-[0.85rem] leading-relaxed mb-5">
                  Tell us what you&rsquo;re after — age, level, and whether you want
                  private or small-group coaching — and we&rsquo;ll come back to you.
                </p>

                <form onSubmit={submit} noValidate>
                  {/* Honeypot — hidden from humans, catches bots */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="be-name" className={LABEL_CLASS}>
                        NAME
                      </label>
                      <input
                        id="be-name"
                        name="name"
                        required
                        autoComplete="name"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="be-phone" className={LABEL_CLASS}>
                        PHONE
                      </label>
                      <input
                        id="be-phone"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder="(484) 252-2523"
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="be-email" className={LABEL_CLASS}>
                      EMAIL
                    </label>
                    <input
                      id="be-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="mt-4">
                    <label htmlFor="be-message" className={LABEL_CLASS}>
                      WHAT ARE YOU LOOKING FOR?
                    </label>
                    <textarea
                      id="be-message"
                      name="message"
                      required
                      rows={4}
                      className={INPUT_CLASS}
                    />
                  </div>

                  {/* The enquiry is texted and called back, so the consent is
                      asked for here rather than assumed from the fact they
                      typed a number. Mirrors the wording the hero already uses
                      beside the phone number. */}
                  <p className="text-white/35 text-[0.72rem] leading-relaxed mt-4">
                    By submitting this you agree that SQUASH TIGERS EXTON LLC and
                    Philadelphia Badminton may contact you by phone, text or email
                    about this enquiry. Msg &amp; data rates may apply. See our{" "}
                    <a href="/sms" className="underline hover:text-white/60">
                      SMS Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="underline hover:text-white/60">
                      Privacy Policy
                    </a>
                    .
                  </p>

                  {error && (
                    <p className="text-[var(--color-ember)] text-[0.82rem] mt-4">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={state === "sending"}
                    className="mt-5 inline-block bg-[var(--color-ember)] text-black hover:bg-[var(--color-ember-hi)] disabled:opacity-50 text-mono text-[0.7rem] transition-colors"
                  >
                    <span className="inline-block px-5 py-2.5">
                      {state === "sending" ? "SENDING…" : "SEND ENQUIRY"}
                    </span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
