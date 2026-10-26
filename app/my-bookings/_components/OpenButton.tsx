"use client";

import { useState } from "react";
import Link from "next/link";
import { COPY, FALLBACK_PHONE, PACK_COPY, PACK_SIGNIN, listUnavailable } from "@/lib/my-bookings/copy";
import { nextPathOf, type NextPath } from "@/lib/my-bookings/session";
import { BTN_PRIMARY, ERROR, postJson } from "./ui";
import PhoneText from "./PhoneText";

/* "Show my bookings" — the one press that spends the emailed link, 2026-10-20. A press
   because a mail scanner's GET must not spend it (app/my-bookings/link/route.ts). It
   owns its lead line too, so a refused link replaces "Tap to see…" instead of sitting
   under it.

   Only a 400 means the link is dead. A 429 (this site's per-IP limit, or the
   platform's) leaves the button in place with "too many tries": the parked link was kept
   (security review, 2026-10-20 — the first pass showed "expired" for a limit someone
   else could run up).

   `next` and `variant`, 2026-10-21 (court pack, orangish-app docs/court-packs.md §8.1):
   a guest who was booking with a pack and tapped the emailed link instead of typing the
   code comes back to /my-bookings/pack, where the slot is parked. /my-bookings/open
   decides that on the server (only while the slot cookie is live); `next` is re-checked
   against the allow-list here, where it is used. The pack variant says "Continue" rather
   than "Show my bookings", and a platform outage says the pack page's own "couldn't reach
   the booking system", not "can't show your bookings" — the guest was not asking for a
   list. */
export default function OpenButton({ next, variant = "list" }: { next?: NextPath; variant?: "list" | "pack" }) {
  const [state, setState] = useState<"idle" | "busy" | "expired" | "slow" | "down">("idle");
  const pack = variant === "pack";

  if (state === "expired") {
    return (
      <div>
        <p className="text-white/80 text-[1rem] leading-relaxed" role="alert">
          {COPY.expired}
        </p>
        <Link href={nextPathOf(next)} className={`${BTN_PRIMARY} inline-block mt-6`}>
          {COPY.sendNew}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/70 text-[1rem] leading-relaxed mb-6">{pack ? PACK_SIGNIN.openLead : COPY.openLead}</p>
      <button
        type="button"
        className={BTN_PRIMARY}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await postJson("/api/my-bookings/open", {});
          if (r.status === 200) {
            window.location.assign(nextPathOf(next));
            return;
          }
          setState(r.status === 400 ? "expired" : r.status === 429 ? "slow" : "down");
        }}
      >
        {state === "busy" ? COPY.opening : pack ? COPY.codeButton : COPY.openButton}
      </button>
      {state === "slow" && (
        <p className={ERROR} role="alert">
          {COPY.tooMany}
        </p>
      )}
      {state === "down" && (
        <p className={ERROR} role="alert">
          <PhoneText text={pack ? PACK_COPY.unreachable : listUnavailable(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
        </p>
      )}
    </div>
  );
}
