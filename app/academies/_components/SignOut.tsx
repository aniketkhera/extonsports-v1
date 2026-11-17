"use client";

import { useState } from "react";
import { ACADEMY_COPY } from "@/lib/academies/copy";
import { ACADEMY_PATH } from "@/lib/academies/session";
import { BTN_TEXT, postJson } from "../../my-bookings/_components/ui";

/* "Sign out" — 2026-11-16 (app/my-bookings/_components/NotYou.tsx, academy scope). The cookie
   is httpOnly, so only the server can clear it; the route also revokes the session upstream.
   Whatever it answers, the page reloads into the email form. `inline` is the header's
   "Signed in on this phone as … · Sign out" (mockup): a plain underlined word in the line's own
   size, not the mono button. */
export default function SignOut({ inline = false }: { inline?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={inline ? "underline underline-offset-[3px] disabled:opacity-60" : BTN_TEXT}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postJson("/api/academies/forget", {});
        window.location.assign(ACADEMY_PATH);
      }}
    >
      {busy ? ACADEMY_COPY.signingOut : ACADEMY_COPY.signOut}
    </button>
  );
}
