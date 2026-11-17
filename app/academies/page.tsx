import { headers } from "next/headers";
import { readAcademyToken } from "@/lib/academies/session-server";
import { academyOverview } from "@/lib/academies/platform";
import { clientIpOf } from "@/lib/my-bookings/guard";
import { ACADEMY_COPY, pageUnavailable } from "@/lib/academies/copy";
import { FALLBACK_PHONE } from "@/lib/my-bookings/copy";
import PhoneText from "../my-bookings/_components/PhoneText";
import RequestPanel from "./_components/RequestPanel";
import AcademyView from "./_components/AcademyView";
import SignOut from "./_components/SignOut";

// extonsports.com/academies — ONE URL FOR EVERY STATE, 2026-11-16 (orangish-app
// docs/academy-page.md §4), as /my-bookings: every email can link here with no token in it
// (the booking confirmation is CC'd to info@ and Aniket, D10).
//
//   no academy cookie      -> "Academy page" + the email form (D1)
//   platform says 401      -> "this phone is signed out" + the form again. The stale cookie
//                             cannot be cleared while rendering (Next 16: cookies().set and
//                             .delete work only in route handlers and server functions); the
//                             next sign-in overwrites it, and /day and /add clear it.
//   platform says 404      -> "not available right now" — the page switched off at the club
//                             (D3), or the platform not deployed yet (§5 step 3).
//   platform unreachable   -> say so, with the phone. NEVER an empty page: an empty Upcoming
//                             would tell PBA it has nothing booked on a night it has three
//                             courts.
//   ok                     -> the partner's page.
//
// The token is read here, on the server, and goes no further than the platform call; the
// client components receive only the allow-listed view (lib/academies/view.ts toOverview).
// With no relay secret, academyOverview answers 'unavailable' without calling anyone.

export const dynamic = "force-dynamic";

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-cond text-white mb-4" style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}>
      {children}
    </h1>
  );
}

export default async function AcademiesPage() {
  const token = await readAcademyToken();
  if (!token) {
    return (
      <>
        <Heading>{ACADEMY_COPY.title}</Heading>
        <RequestPanel />
      </>
    );
  }

  const r = await academyOverview(token, clientIpOf(await headers()));
  if (r.kind === "signed_out") {
    return (
      <>
        <Heading>{ACADEMY_COPY.title}</Heading>
        <RequestPanel note={ACADEMY_COPY.signedOut} />
      </>
    );
  }
  if (r.kind === "off" || r.kind === "unavailable") {
    return (
      <>
        <Heading>{ACADEMY_COPY.title}</Heading>
        <p className="text-white/70 text-[0.98rem] leading-relaxed" role="alert">
          {r.kind === "off" ? ACADEMY_COPY.off : <PhoneText text={pageUnavailable(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />}
        </p>
        <div className="mt-8">
          <SignOut />
        </div>
      </>
    );
  }

  return <AcademyView view={r.view} />;
}
