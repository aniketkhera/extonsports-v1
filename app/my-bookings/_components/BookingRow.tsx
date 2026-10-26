"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingView, CancelView } from "@/lib/my-bookings/view";
import { fromSiteCancel, isCancelSuccess } from "@/lib/my-bookings/view";
import {
  COPY, PACK_COPY, callClub, cancelMessage, confirmText, packConfirmText, packConfirmYes, rowCancelBy, rowCancelled,
  rowCourts, rowPackCancelBy, rowPackCancelled, rowPackTooLate, rowPaid, rowPaidWithPack, rowTitle, tooLate,
  unitForSport,
} from "@/lib/my-bookings/copy";
import { BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT, postJson } from "./ui";
import PhoneText from "./PhoneText";
import { PackMeter } from "./PackCard";

/* One booking, and its Cancel, 2026-10-20.

   The rules live upstream (owner, 2026-10-18): until 24 hours before the start, the whole
   series, a FULL refund to the original card, then the courts are released. Inside the
   cutoff there is no button at all, only the club's phone. The row never decides whether
   a cancel worked — it prints what the platform said, and only 'cancelled' /
   'already_cancelled' are shown as done. A timeout says "reload in a minute to check",
   never "try again", because the refund may already have gone through.

   The series id travels in the POST body, never the URL; who is asking is the httpOnly
   cookie, which this component cannot see.

   A ROW PAID WITH A COURT PACK (2026-10-21, orangish-app docs/court-packs.md §8.3; the look is
   cancel.html) uses the same button and the same POST — the platform forks to the pack
   path (cp_return_series) — and says everything in CREDITS: "Paid with Badminton 5-pack ·
   1 credit", "Cancel by … to get the credit back", "Under 24 hours — call …", "Cancelled
   by the club — credit returned". No money moves on a pack cancel, so no sentence on a
   pack row says "$" or "refund". The result's bar is drawn from the platform's answer
   (result.pack), never from a sum made here.

   startOpen — /my-bookings?cancel=<seriesId>, the link in the pack confirmation email
   (design §8.3) — opens this row's sheet on arrival, and only if the row could show a
   Cancel button at all. It never presses anything: the guest still confirms.

   keptValidUntil — "Your credit keeps your pack's date: valid until Nov 29" — is passed
   only when BookingList knows for certain which pack this is and its 60 days have
   started; otherwise the sentence stops before it (copy.ts packConfirmText).

   AFTER A CANCEL THAT WORKED, router.refresh() (review UI-1, 2026-10-21). The pack cards
   above were drawn when the page loaded, so they kept "1 of 5 left" and the cancelled game
   under "Upcoming" while this row said "3 of 5 left". A refresh re-renders the server page,
   which asks the platform again (cp_holder_packs) — nothing is worked out here. The list
   keys this row by its series, so its state, and the result message below, stay put. */
type Phase = "idle" | "confirm" | "pending" | "result";

export default function BookingRow({
  booking: b,
  phone,
  cutoffHours,
  startOpen = false,
  keptValidUntil = null,
}: {
  booking: BookingView;
  phone: string;
  cutoffHours: number;
  startOpen?: boolean;
  keptValidUntil?: string | null;
}) {
  const canCancel = b.status === "active" && b.cancellable;
  const opened = startOpen && canCancel;
  const [phase, setPhase] = useState<Phase>(opened ? "confirm" : "idle");
  const [result, setResult] = useState<CancelView | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // view.ts guarantees credits and packName on every pack row; checked again so a card
  // row can never fall into the pack wording.
  const isPack = b.paidWith === "pack" && b.packName !== null && b.credits !== null;

  // Arriving from the email's Cancel link: bring the open sheet into view and give it
  // focus — not the Yes button, so a stray Enter cannot cancel.
  useEffect(() => {
    if (!opened) return;
    sheet.current?.scrollIntoView({ block: "center" });
    sheet.current?.focus({ preventScroll: true });
  }, [opened]);

  async function cancel() {
    if (phase === "pending") return;
    setPhase("pending");
    const r = await postJson("/api/my-bookings/cancel", { seriesId: b.seriesId });
    const v = fromSiteCancel(r.status, r.json);
    setResult(v);
    setPhase("result");
    if (isCancelSuccess(v)) router.refresh();
  }

  const done = result ? isCancelSuccess(result) : false;
  const muted = b.status === "cancelled" || b.status === "cancelling" || done;
  // After a refused-before-anything answer the guest may press Cancel again.
  const canRetry = result?.status === "try_again";
  const needsReload = result?.status === "unknown" || result?.status === "signed_out" || result?.status === "not_found";

  let standing: string | null = null;
  if (b.status === "cancelled") {
    if (!isPack) standing = rowCancelled(b.refundedCents);
    else standing = rowPackCancelled(b.cancelledBy, b.creditsReturned);
  } else if (b.status === "cancelling") standing = COPY.processing;
  else if (b.status === "needs_staff" || b.blockedReason === "call_club") standing = callClub(phone);
  else if (b.blockedReason === "within_cutoff") {
    standing = isPack ? rowPackTooLate(phone, cutoffHours) : tooLate(phone, cutoffHours);
  } else if (!b.cancellable) standing = callClub(phone);

  const showCancel = canCancel && (phase === "idle" || canRetry);

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
        <p className="text-white/70 text-[0.92rem]">
          {isPack ? rowPaidWithPack(b.packName!, b.credits!) : rowPaid(b.amountPaidCents)}
        </p>

        {phase !== "result" && standing && (
          <p className="text-white/70 text-[0.9rem] leading-relaxed mt-3">
            <PhoneText text={standing} phone={phone} />
          </p>
        )}

        {phase !== "result" && !standing && (
          <p className="text-white/60 text-[0.88rem] leading-relaxed mt-3">
            {isPack ? rowPackCancelBy(b.cancelByText, b.credits!) : rowCancelBy(b.cancelByText)}
          </p>
        )}
      </div>

      {result && (
        <p
          className={`text-[0.95rem] leading-relaxed mt-3 ${done ? "text-white/80" : "text-[var(--color-ember)]"}`}
          role="status"
          aria-live="polite"
        >
          {/* cancelMessage prints the answer's own phone when it carries one. */}
          <PhoneText text={cancelMessage(result, phone, cutoffHours)} phone={result.phone ?? phone} />
        </p>
      )}

      {/* A pack cancel that worked: the pack as the PLATFORM now counts it (cancel.html
          step 3), from the cancel's own answer; the sentence above says it in words. The
          cards above catch up when router.refresh() lands (review UI-1). Not for a CLOSED
          pack (2026-10-21, the platform's pack.closed): a full bar would say the credits
          can be used, and the sentence above says they cannot. */}
      {result && done && result.pack && !result.pack.closed && (
        <PackMeter left={result.pack.creditsLeft} total={result.pack.creditsTotal} />
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
        <div ref={sheet} tabIndex={-1} className="mt-4 border-t border-[var(--legal-line)] pt-4 outline-none">
          <p className="text-white/80 text-[0.95rem] leading-relaxed">
            {isPack
              ? packConfirmText(b.credits!, keptValidUntil, b.courts.length, unitForSport(b.sport))
              : confirmText(b.amountPaidCents)}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={BTN_PRIMARY} disabled={phase === "pending"} onClick={cancel}>
              {phase === "pending" ? COPY.pending : isPack ? packConfirmYes(b.credits!) : COPY.confirmYes}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={phase === "pending"}
              onClick={() => setPhase("idle")}
            >
              {isPack ? PACK_COPY.confirmNo : COPY.confirmNo}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
