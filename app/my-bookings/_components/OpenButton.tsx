"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY, FALLBACK_PHONE, listUnavailable } from "@/lib/my-bookings/copy";
import { BTN_PRIMARY, ERROR, postJson } from "./ui";

/* "Show my bookings" — the one press that spends the emailed link, 2026-10-20. A press
   because a mail scanner's GET must not spend it (app/my-bookings/link/route.ts). It
   owns its lead line too, so a refused link replaces "Tap to see…" instead of sitting
   under it. */
export default function OpenButton() {
  const [state, setState] = useState<"idle" | "busy" | "expired" | "down">("idle");

  if (state === "expired") {
    return (
      <div>
        <p className="text-white/80 text-[1rem] leading-relaxed" role="alert">
          {COPY.expired}
        </p>
        <Link href="/my-bookings" className={`${BTN_PRIMARY} inline-block mt-6`}>
          {COPY.sendNew}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/70 text-[1rem] leading-relaxed mb-6">{COPY.openLead}</p>
      <button
        type="button"
        className={BTN_PRIMARY}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await postJson("/api/my-bookings/open", {});
          if (r.status === 200) {
            window.location.assign("/my-bookings");
            return;
          }
          setState(r.status === 400 ? "expired" : "down");
        }}
      >
        {state === "busy" ? COPY.opening : COPY.openButton}
      </button>
      {state === "down" && (
        <p className={ERROR} role="alert">
          {listUnavailable(FALLBACK_PHONE)}
        </p>
      )}
    </div>
  );
}
