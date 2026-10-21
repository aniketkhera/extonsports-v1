"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { COPY, TOAST_MS, TOAST_PHONE, TOAST_TEL, createToastClock, isEmailShaped, nextTrapIndex, sendWithOptin, type Outcome } from "./my-bookings-pure";

/* "Email my bookings": the popup behind the hero's "My bookings" button, and its toast.
   ──────────────────────────────────────────────────────────────────────────────────────
   Aniket, 2026-10-21: "this can be a popup or something? easy to do - one email id, press
   send and the popup disappears", "ignore texting for now. just email is fine." One field,
   Send, a close ×; Esc and the backdrop close it too; on a phone it is a bottom sheet. On a
   202 it closes and the toast says the SAME sentence whatever the address turns out to have
   (see the NEVER REVEAL note in my-bookings-pure.ts). Only a malformed address is refused,
   inline. A platform that is down or switched off keeps the popup open with the `failed`
   line, which is about the request, never about the address.

   ⚠️ IT PORTALS TO document.body, like BookingsCalendar and BadmintonEnquiry: the hero
   panel it is opened from is a framer-motion element animating `y`, and a transformed
   ancestor would make `position: fixed` resolve against that box instead of the viewport.

   One component owns BOTH the popup and the toast so the toast outlives the popup: the
   popup unmounts on Send and the toast is still there for eight seconds (four until the
   second line, 2026-10-21). Review, 2026-10-21: a pointer over the toast or focus inside it
   stops that clock, so its tel: link can be reached and used (createToastClock).

   The mailing-list box, Aniket 2026-10-21: "also adda a checkbox, checked by default - add
   to our mailing list?" It sits under the field and BEFORE Send, on the page and in Tab
   order, so nobody presses Send without having passed it. Ticked, Send also posts the
   address to /api/mailing-list-optin, which only ever adds an address the list has never
   had (never re-subscribes anyone); unticked, that request is not made. The toast does not
   know the box exists.

   Colours are the site's tokens, so light and dark both follow the theme; the scrim is a
   literal, as BookingsCalendar's is, because it darkens whatever is behind in both. */

const noop = () => () => {};
/* True on the client, false while server-rendering, with no effect and no state: the live
   region below must exist BEFORE the toast text arrives or screen readers may not announce
   it, and a mounted-flag effect would trip this repo's set-state-in-effect lint rule. */
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export default function MyBookingsEmail({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  /** The "My bookings" button: focus goes back to it when the popup closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const isClient = useIsClient();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Exclude<Outcome, "sent"> | null>(null);
  const [toast, setToast] = useState(false);
  const [optin, setOptin] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const optinRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toastClockRef = useRef<ReturnType<typeof createToastClock> | null>(null);
  /* Made on first use, from event handlers only (never during render). */
  function toastClock() {
    if (!toastClockRef.current) {
      toastClockRef.current = createToastClock({ ms: TOAST_MS, onExpire: () => setToast(false) });
    }
    return toastClockRef.current;
  }
  /* Bumped on every close, so a reply that lands after the popup was dismissed cannot
     paint a stale error onto the next opening. */
  const generation = useRef(0);
  const titleId = useId();
  const lineId = useId();
  const msgId = useId();

  const close = useCallback(() => {
    generation.current += 1;
    setError(null);
    setSending(false);
    onClose();
    returnFocusRef?.current?.focus();
  }, [onClose, returnFocusRef]);

  useEffect(() => () => { toastClockRef.current?.dispose(); }, []);

  /* The latest `close`, read by the effect below. The parent passes a fresh onClose arrow
     on every render, and Hero re-renders on its own (data landing, hover); if the effect
     depended on `close` it would re-run each time and yank focus back to the email field
     while somebody was on Send or ×. So the effect runs on open/close only. */
  const latestClose = useRef(close);
  useEffect(() => { latestClose.current = close; });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") latestClose.current(); };
    document.addEventListener("keydown", onKey);
    /* The page behind must not scroll under the sheet; restored exactly, as
       BookingsCalendar does, so a value set elsewhere survives. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* A small trap: input → box → Send → × → input, and back the other way with Shift. It only
     hears keys while focus is inside the panel, which is why the panel itself takes focus
     on a click (tabIndex -1, below); from there, i is -1 and nextTrapIndex brings Tab back
     in at the field and Shift+Tab at ×. */
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const order = [inputRef.current, optinRef.current, sendRef.current, closeRef.current].filter(
      (el): el is HTMLInputElement | HTMLButtonElement => !!el && !el.disabled,
    );
    if (!order.length) return;
    const i = order.indexOf(document.activeElement as HTMLInputElement | HTMLButtonElement);
    e.preventDefault();
    order[nextTrapIndex(i, order.length, e.shiftKey)].focus();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    if (!isEmailShaped(email)) {
      setError("invalid");
      inputRef.current?.focus();
      return;
    }
    const gen = generation.current;
    setError(null);
    setSending(true);
    const outcome = await sendWithOptin(email, { optin, website: honeypot });
    if (gen !== generation.current) {
      // Closed while in flight. A 202 still earns the toast: the request did go.
      if (outcome === "sent") showToast();
      return;
    }
    setSending(false);
    if (outcome === "sent") {
      setEmail("");
      setOptin(true);
      close();
      showToast();
    } else {
      setError(outcome);
      inputRef.current?.focus();
    }
  }

  function showToast() {
    setToast(true);
    toastClock().start();
  }

  if (!isClient) return null;

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: "rgba(10,16,25,0.55)" }}
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={lineId}
            /* Focusable by a click or by script, never by Tab (review, 2026-10-21). Without
               it a click on the title, the line or the padding sent focus to <body>, this
               panel's onKeyDown stopped hearing Tab, and Shift+Tab reached the page behind
               the scrim. outline-none: that click must not ring the whole panel. */
            tabIndex={-1}
            onKeyDown={onPanelKeyDown}
            className={
              /* Phones (< 640px): a bottom sheet, full width, top corners rounded, with a
                 grab handle. Wider: centred, 440px, the ember rule along the top. The 1px
                 hairline is for the dark theme, where the panel and the page are the same
                 navy and the shadow cannot show an edge; on light it all but disappears. */
              "outline-none absolute left-0 right-0 bottom-0 rounded-t-2xl px-5 pt-[14px] border border-[var(--color-line)] " +
              "sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 " +
              "sm:w-[440px] sm:rounded-none sm:px-8 sm:pt-8 sm:border-t-4 sm:border-t-[var(--color-ember)]"
            }
            style={{
              background: "var(--color-void)",
              color: "var(--color-bone)",
              boxShadow: "0 24px 60px rgba(10,16,25,0.35)",
              paddingBottom: "max(28px, calc(env(safe-area-inset-bottom) + 20px))",
            }}
          >
            <div
              aria-hidden="true"
              className="sm:hidden mx-auto mb-[14px] rounded-full"
              style={{ width: 44, height: 5, background: "var(--color-line-2)" }}
            />
            <h2
              id={titleId}
              className="text-[26px] sm:text-[30px] pr-10"
              style={{
                fontFamily: "var(--font-cond)", fontWeight: 600, letterSpacing: "0.5px",
                textTransform: "uppercase", lineHeight: 1.1, margin: "0 0 8px", color: "var(--color-bone)",
              }}
            >
              {COPY.title}
            </h2>
            <p id={lineId} style={{ margin: "0 0 20px", fontSize: 16, lineHeight: "23px", color: "var(--color-fog)" }}>
              {COPY.line}
            </p>

            <form onSubmit={submit} noValidate>
              <label
                htmlFor={`${titleId}-email`}
                className="block text-mono mb-1.5"
                style={{ fontSize: 11, letterSpacing: "1.6px", color: "var(--color-fog)" }}
              >
                {COPY.label}
              </label>
              {/* Phones: the field, the box, Send, one under another. Wider: the field and
                  Send side by side as before, the box under the field (2026-10-21). One DOM
                  order for both, field → box → Send, so Tab and the page agree on phones and
                  the box always comes before Send. */}
              <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-2.5 sm:gap-y-3">
                <input
                  ref={inputRef}
                  id={`${titleId}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  maxLength={254}
                  placeholder={COPY.placeholder}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error === "invalid") setError(null); }}
                  aria-invalid={error === "invalid" ? true : undefined}
                  aria-describedby={error ? msgId : undefined}
                  className={
                    "min-w-0 flex-1 sm:col-start-1 sm:row-start-1 bg-[var(--color-ink-2)] border border-[var(--color-line-2)] " +
                    "focus:bg-[var(--color-void)] focus:border-[var(--color-ember)] focus:shadow-[0_0_0_3px_rgba(248,155,114,0.35)] " +
                    "placeholder:text-[var(--color-muted)] outline-none transition-colors"
                  }
                  style={{ font: "500 17px var(--font-body), system-ui, sans-serif", color: "var(--color-bone)", padding: "13px 14px" }}
                />
                {/* A real checkbox inside its label: the words are its accessible name, a
                    click or tap anywhere on them toggles it, Space toggles it from the
                    keyboard. 44px tall on a phone, so it is a fair thumb target. Its focus
                    ring is --ember-ink, not --color-ember (review, 2026-10-21): salmon on the
                    light theme's white panel is 2.12:1, under the 3:1 a focus ring needs;
                    ink is 4.2:1 there and is the same ember on dark. */}
                <label
                  className="flex items-center gap-2.5 cursor-pointer select-none min-h-[44px] sm:min-h-0 sm:col-start-1 sm:col-span-2 sm:row-start-2"
                  style={{ fontSize: 15, lineHeight: "21px", color: "var(--color-fog)" }}
                >
                  <input
                    ref={optinRef}
                    type="checkbox"
                    name="mailing_list"
                    checked={optin}
                    onChange={(e) => setOptin(e.target.checked)}
                    className="shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember-ink)]"
                    style={{ width: 18, height: 18, margin: 0, accentColor: "var(--color-ember)" }}
                  />
                  <span>{COPY.optin}</span>
                </label>
                <button
                  ref={sendRef}
                  type="submit"
                  disabled={sending}
                  className="sm:col-start-2 sm:row-start-1 text-mono bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black transition-colors disabled:opacity-70 disabled:cursor-wait"
                  style={{ fontSize: 13, letterSpacing: "2px", height: 50, padding: "0 26px" }}
                >
                  {sending ? COPY.sending : COPY.send}
                </button>
              </div>
              {/* The honeypot. No person can see or reach it; a bot that fills every field
                  fills this one, and the platform drops the request without saying so. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: "absolute", left: -10000, top: "auto", width: 1, height: 1, opacity: 0 }}
              />
              <p
                id={msgId}
                aria-live="polite"
                className={error ? "text-red-200" : undefined}
                style={{ margin: error ? "12px 0 0" : 0, fontSize: 14, lineHeight: "20px" }}
              >
                {error === "invalid" ? COPY.invalid : error === "failed" ? COPY.failed : ""}
              </p>
            </form>

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label={COPY.close}
              className="absolute top-[18px] right-3 sm:top-[14px] sm:right-4 hover:opacity-70 transition-opacity"
              style={{ width: 32, height: 32, fontSize: 26, lineHeight: "32px", color: "var(--color-muted)" }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
      )}

      {/* Always present on the client, so the two lines are announced when they arrive.
          A pointer over it or focus inside it holds it (review, 2026-10-21); onBlur only
          lets go when focus leaves the toast altogether.
          Desktop width, review 2026-10-21: up to 640px (was 520px, which put "(484)
          252-2523." on a third line of its own). w-max sizes it to the text, since left:50%
          alone would cap it at half the viewport; the cap keeps 1rem clear either side on
          a narrow window. Phones are unchanged: the full width less 16px each side. */}
      <div
        role="status"
        aria-live="polite"
        onPointerEnter={() => toastClock().hold("pointer", true)}
        onPointerLeave={() => toastClock().hold("pointer", false)}
        onFocus={() => toastClock().hold("focus", true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) toastClock().hold("focus", false);
        }}
        className={
          toast
            ? "fixed z-[95] left-4 right-4 bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-24 sm:w-max sm:max-w-[min(640px,calc(100%_-_2rem))] flex gap-3 items-start"
            : "sr-only"
        }
        style={
          toast
            ? {
                /* Inverted surface: a dark slip on the light theme (as approved), a light one
                   on the dark theme, so it stands off the page either way. */
                background: "var(--color-paper)", color: "var(--color-void)",
                padding: "14px 20px", fontSize: 15, lineHeight: "21px",
                boxShadow: "0 12px 32px rgba(10,16,25,0.35)",
              }
            : undefined
        }
      >
        {toast && (
          <>
            <span aria-hidden="true" style={{ color: "var(--color-ember)", fontWeight: 700, fontSize: 18, lineHeight: "21px" }}>
              &#10003;
            </span>
            <span>
              <span className="block">{COPY.toast}</span>
              {/* Second line, 2026-10-21: the same words in every case. */}
              <span className="block" style={{ marginTop: 4, fontSize: 14, lineHeight: "20px", opacity: 0.8 }}>
                {COPY.toastHelp}
                <a href={TOAST_TEL} className="underline underline-offset-2 font-semibold whitespace-nowrap" style={{ color: "inherit" }}>
                  {TOAST_PHONE}
                </a>
                .
              </span>
            </span>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
