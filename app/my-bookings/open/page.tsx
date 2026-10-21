import Link from "next/link";
import { readLinkToken, readPackSelection } from "@/lib/my-bookings/session-server";
import type { NextPath } from "@/lib/my-bookings/session";
import { COPY, PACK_COPY } from "@/lib/my-bookings/copy";
import OpenButton from "../_components/OpenButton";
import { BTN_PRIMARY } from "../_components/ui";

// /my-bookings/open — the landing after GET /my-bookings/link parked the emailed token,
// 2026-10-20. It only asks for one press; the press spends the link
// (app/api/my-bookings/open). Without a parked link (expired after 30 minutes, already
// spent, or opened in a different browser from the one that followed the email) it says
// so and offers a new one. Whether the link is still VALID is not known until the press
// — this page never calls the platform.
//
// THE COURT 5-PACK, 2026-10-21 (orangish-app docs/court-packs.md §8.1, "Link path"): a guest
// booking with a pack who taps the emailed button instead of typing the code lands here
// too. While a slot is parked in this browser (__Host-exton_pack_sel, 30 minutes) the press
// goes on to /my-bookings/pack, where that slot waits, and "Send a new link" goes back
// there too; otherwise both go to /my-bookings, as before. The slot is read from THIS
// browser's cookie, never from the link: no selection is ever put in an email.

export const dynamic = "force-dynamic";

export default async function OpenPage() {
  const parked = await readLinkToken();
  const sel = await readPackSelection();
  const next: NextPath = sel ? "/my-bookings/pack" : "/my-bookings";
  return (
    <>
      <h1 className="text-cond text-white mb-5" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
        {sel ? PACK_COPY.title : COPY.title}
      </h1>
      {parked ? (
        <OpenButton next={next} variant={sel ? "pack" : "list"} />
      ) : (
        <>
          <p className="text-white/80 text-[1rem] leading-relaxed">{COPY.expired}</p>
          <Link href={next} className={`${BTN_PRIMARY} inline-block mt-6`}>
            {COPY.sendNew}
          </Link>
        </>
      )}
    </>
  );
}
