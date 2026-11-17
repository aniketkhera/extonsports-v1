"use client";

import { useState } from "react";
import Link from "next/link";
import { ACADEMY_COPY, pageUnavailable } from "@/lib/academies/copy";
import { ACADEMY_PATH } from "@/lib/academies/session";
import { FALLBACK_PHONE } from "@/lib/my-bookings/copy";
import PhoneText from "../../my-bookings/_components/PhoneText";
import { BTN_PRIMARY, ERROR, postJson } from "../../my-bookings/_components/ui";

/* "Open my academy page" — the one press that spends the emailed link, 2026-11-16
   (app/my-bookings/_components/OpenButton.tsx, academy scope). A press because a mail
   scanner's GET must not spend it (app/academies/link/route.ts).

   Only a 400 means the link is dead. A 429 leaves the button in place with "too many tries";
   a 404 says the page is not available; anything else says the platform could not be reached
   — the parked link is kept for all three (lib/academies/view.ts academyRedeemRefusal). */
export default function OpenButton() {
  const [state, setState] = useState<"idle" | "busy" | "expired" | "slow" | "off" | "down">("idle");

  if (state === "expired") {
    return (
      <div>
        <p className="text-white/80 text-[1rem] leading-relaxed" role="alert">
          {ACADEMY_COPY.expired}
        </p>
        <Link href={ACADEMY_PATH} className={`${BTN_PRIMARY} inline-block mt-6`}>
          {ACADEMY_COPY.sendNew}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/70 text-[1rem] leading-relaxed mb-6">{ACADEMY_COPY.openLead}</p>
      <button
        type="button"
        className={BTN_PRIMARY}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await postJson("/api/academies/open", {});
          if (r.status === 200) {
            window.location.assign(ACADEMY_PATH);
            return;
          }
          setState(r.status === 400 ? "expired" : r.status === 429 ? "slow" : r.status === 404 ? "off" : "down");
        }}
      >
        {state === "busy" ? ACADEMY_COPY.opening : ACADEMY_COPY.openButton}
      </button>
      {state === "slow" && (
        <p className={ERROR} role="alert">
          {ACADEMY_COPY.tooMany}
        </p>
      )}
      {state === "off" && (
        <p className={ERROR} role="alert">
          {ACADEMY_COPY.off}
        </p>
      )}
      {state === "down" && (
        <p className={ERROR} role="alert">
          <PhoneText text={pageUnavailable(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
        </p>
      )}
    </div>
  );
}
