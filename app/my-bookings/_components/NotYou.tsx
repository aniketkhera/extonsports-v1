"use client";

import { useState } from "react";
import { COPY } from "@/lib/my-bookings/copy";
import { BTN_TEXT, postJson } from "./ui";

/* "Not you? Sign out of this device", 2026-10-20 — for the shared family iPad. The
   cookie is httpOnly, so only the server can clear it; the route also revokes the
   session upstream. Whatever it answers, the page reloads into the email form. */
export default function NotYou() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={BTN_TEXT}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJson("/api/my-bookings/forget", {});
        window.location.assign("/my-bookings");
      }}
    >
      {busy ? COPY.signingOut : COPY.notYou}
    </button>
  );
}
