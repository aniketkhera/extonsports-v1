"use client";

import { useState } from "react";
import type { BookingView, CancelView } from "@/lib/my-bookings/view";
import { fromSiteCancel, isCancelSuccess } from "@/lib/my-bookings/view";
import {
  COPY, callClub, cancelMessage, confirmText, rowCancelBy, rowCancelled, rowCourts, rowPaid, rowTitle, tooLate,
} from "@/lib/my-bookings/copy";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT, postJson } from "./ui";

/* One booking, and its Cancel, 2026-10-20.

   The rules live upstream (owner, 2026-10-18): until 24 hours before the start, the whole
   series, a FULL refund to the original card, then the courts are released. Inside the
   cutoff there is no button at all, only the club's phone. The row never decides whether
   a cancel worked — it prints what the platform said, and only 'cancelled' /
   'already_cancelled' are shown as done. A timeout says "reload in a minute to check",
   never "try again", because the refund may already have gone through.

   The series id travels in the POST body, never the URL; who is asking is the httpOnly
   cookie, which this component cannot see. */
type Phase = "idle" | "confirm" | "pending" | "result";

export default function BookingRow({
  booking: b,
  phone,
  cutoffHours,
}: {
  booking: BookingView;
  phone: string;
  cutoffHours: number;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CancelView | null>(null);

  async function cancel() {
    if (phase === "pending") return;
    setPhase("pending");
    const r = await postJson("/api/my-bookings/cancel", { seriesId: b.seriesId });
    setResult(fromSiteCancel(r.status, r.json));
    setPhase("result");
  }

  const done = result ? isCancelSuccess(result) : false;
  const muted = b.status === "cancelled" || b.status === "cancelling" || done;
  // After a refused-before-anything answer the guest may press Cancel again.
  const canRetry = result?.status === "try_again";
  const needsReload = result?.status === "unknown" || result?.status === "signed_out" || result?.status === "not_found";

  let standing: string | null = null;
  if (b.status === "cancelled") standing = rowCancelled(b.refundedCents);
  else if (b.status === "cancelling") standing = COPY.processing;
  else if (b.status === "needs_staff" || b.blockedReason === "call_club") standing = callClub(phone);
  else if (b.blockedReason === "within_cutoff") standing = tooLate(phone, cutoffHours);
  else if (!b.cancellable) standing = callClub(phone);

  const showCancel = b.status === "active" && b.cancellable && (phase === "idle" || canRetry);

  return (
    <li
      className="border border-[var(--legal-line)] bg-[var(--legal-surface)]"
      style={{ padding: "18px clamp(14px,4vw,22px)" }}
    >
      {/* Muted = the booking itself, not what was just said about it: a fresh
          "Cancelled. $90.00 is on its way back" must read at full strength. */}
      <div className={`transition-opacity ${muted ? "opacity-55" : ""}`}>
        <p className="text-white text-[1.02rem] font-semibold leading-snug">{rowTitle(b.sport, b.whenText)}</p>
        <p className="text-white/70 text-[0.92rem] mt-1.5">{rowCourts(b.courts)}</p>
        <p className="text-white/70 text-[0.92rem]">{rowPaid(b.amountPaidCents)}</p>

        {phase !== "result" && standing && (
          <p className="text-white/70 text-[0.9rem] leading-relaxed mt-3">{standing}</p>
        )}

        {phase !== "result" && !standing && (
          <p className="text-white/60 text-[0.88rem] leading-relaxed mt-3">{rowCancelBy(b.cancelByText)}</p>
        )}
      </div>

      {result && (
        <p
          className={`text-[0.95rem] leading-relaxed mt-3 ${done ? "text-white/80" : "text-[var(--color-ember)]"}`}
          role="status"
          aria-live="polite"
        >
          {cancelMessage(result, phone, cutoffHours)}
        </p>
      )}

      {needsReload && (
        <button type="button" className={`${BTN_TEXT} mt-3`} onClick={() => window.location.assign("/my-bookings")}>
          {COPY.reload}
        </button>
      )}

      {showCancel && (
        <div className="mt-4">
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => {
              setResult(null);
              setPhase("confirm");
            }}
          >
            {COPY.cancelButton}
          </button>
        </div>
      )}

      {(phase === "confirm" || phase === "pending") && (
        <div className="mt-4 border-t border-[var(--legal-line)] pt-4">
          <p className="text-white/80 text-[0.95rem] leading-relaxed">{confirmText(b.amountPaidCents)}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={BTN_PRIMARY} disabled={phase === "pending"} onClick={cancel}>
              {phase === "pending" ? COPY.pending : COPY.confirmYes}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={phase === "pending"}
              onClick={() => setPhase("idle")}
            >
              {COPY.confirmNo}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
