import Link from "next/link";
import { readAcademyLink } from "@/lib/academies/session-server";
import { ACADEMY_COPY } from "@/lib/academies/copy";
import { ACADEMY_PATH } from "@/lib/academies/session";
import OpenButton from "../_components/OpenButton";
import { BTN_PRIMARY } from "../../my-bookings/_components/ui";

// /academies/open — the landing after GET /academies/link parked the emailed token,
// 2026-11-16 (app/my-bookings/open/page.tsx, academy scope). It asks for one press; the press
// spends the link (app/api/academies/open). Without a parked link (expired after 30 minutes,
// already spent, or opened in a different browser from the one that followed the email) it
// says so and offers a new one. Whether the link is still VALID is not known until the press —
// this page never calls the platform.

export const dynamic = "force-dynamic";

export default async function AcademyOpenPage() {
  const parked = await readAcademyLink();
  return (
    <>
      <h1 className="text-cond text-white mb-5" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
        {ACADEMY_COPY.title}
      </h1>
      {parked ? (
        <OpenButton />
      ) : (
        <>
          <p className="text-white/80 text-[1rem] leading-relaxed">{ACADEMY_COPY.expired}</p>
          <Link href={ACADEMY_PATH} className={`${BTN_PRIMARY} inline-block mt-6`}>
            {ACADEMY_COPY.sendNew}
          </Link>
        </>
      )}
    </>
  );
}
