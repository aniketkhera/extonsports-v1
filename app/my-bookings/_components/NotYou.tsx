"use client";

import { useState } from "react";
import { COPY, PACK_COPY } from "@/lib/my-bookings/copy";
import { nextPathOf, type NextPath } from "@/lib/my-bookings/session";
import { BTN_TEXT, postJson } from "./ui";

/* "Not you? Sign out of this device", 2026-10-20 — for the shared family iPad. The
   cookie is httpOnly, so only the server can clear it; the route also revokes the
   session upstream. Whatever it answers, the page reloads into the email form.

   `next` and `variant`, 2026-10-21 (court 5-pack, orangish-app docs/court-packs.md §8.1):
   on /my-bookings/pack it is the short "Not you?" after "Booking as a•••@… on this phone",
   and it reloads the PACK page, which then asks for an email with the slot still parked
   (forget clears the device and link cookies, never the slot). `next` is re-checked
   against the allow-list here, where it is used. */
export default function NotYou({ next, variant = "list" }: { next?: NextPath; variant?: "list" | "pack" }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={BTN_TEXT}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJson("/api/my-bookings/forget", {});
        window.location.assign(nextPathOf(next));
      }}
    >
      {busy ? COPY.signingOut : variant === "pack" ? PACK_COPY.notYou : COPY.notYou}
    </button>
  );
}
