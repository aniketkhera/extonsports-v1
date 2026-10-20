import Link from "next/link";
import { readLinkToken } from "@/lib/my-bookings/session-server";
import { COPY } from "@/lib/my-bookings/copy";
import OpenButton from "../_components/OpenButton";
import { BTN_PRIMARY } from "../_components/ui";

// /my-bookings/open — the landing after GET /my-bookings/link parked the emailed token,
// 2026-10-20. It only asks for one press; the press spends the link
// (app/api/my-bookings/open). Without a parked link (expired after 30 minutes, already
// spent, or opened in a different browser from the one that followed the email) it says
// so and offers a new one. Whether the link is still VALID is not known until the press
// — this page never calls the platform.

export const dynamic = "force-dynamic";

export default async function OpenPage() {
  const parked = await readLinkToken();
  return (
    <>
      <h1 className="text-cond text-white mb-5" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
        {COPY.title}
      </h1>
      {parked ? (
        <OpenButton />
      ) : (
        <>
          <p className="text-white/80 text-[1rem] leading-relaxed">{COPY.expired}</p>
          <Link href="/my-bookings" className={`${BTN_PRIMARY} inline-block mt-6`}>
            {COPY.sendNew}
          </Link>
        </>
      )}
    </>
  );
}
