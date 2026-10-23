import { headers } from "next/headers";
import { readDeviceToken } from "@/lib/my-bookings/session-server";
import { listBookings } from "@/lib/my-bookings/platform";
import { UUID_RE, clientIpOf } from "@/lib/my-bookings/guard";
import { cancelNextPath } from "@/lib/my-bookings/session";
import { COPY, FALLBACK_PHONE, listUnavailable } from "@/lib/my-bookings/copy";
import RequestPanel from "./_components/RequestPanel";
import BookingList from "./_components/BookingList";
import NotYou from "./_components/NotYou";
import PhoneText from "./_components/PhoneText";

// extonsports.com/my-bookings — ONE URL FOR EVERY STATE, 2026-10-20, so every email can
// link here with no token in it (the booking confirmation is CC'd to the club, and a
// sign-in token must never sit in a CC'd copy — owner's spec item 8, 2026-10-18).
//
//   no device cookie       -> ask for an email
//   platform says 401      -> "this device is signed out" + ask again. The stale cookie
//                             cannot be cleared while rendering (Next 16: cookies().set
//                             and .delete work only in route handlers and server
//                             functions); the next sign-in overwrites it.
//   platform unreachable   -> say so, with the phone. NEVER "no bookings" — an empty list
//                             would tell a guest with a booking tomorrow that they have none.
//   ok                     -> the list, and "Not you?".
//
// The device token is read here, on the server, and goes no further than the platform
// call; the client components below receive only the allow-listed view. The visitor's IP
// goes with it (security review, 2026-10-20: the platform's per-IP limits, trusted only
// alongside the relay secret — lib/my-bookings/platform.ts). With no relay secret set,
// listBookings answers 'unavailable' without calling anyone: the same friendly state as
// the platform being down.
//
// ?cancel=<seriesId>, 2026-10-21 (orangish-app docs/court-packs.md §8.3): the court
// pack confirmation email's "Cancel this booking" link. It opens that row's cancel sheet
// — nothing more; the guest still presses Yes. Tokenless, so the email may carry it: the
// series is only ever looked up in THIS device's own list, and a stranger with the link
// sees the email form. Taken only as one UUID; anything else opens nothing. A signed-out
// guest keeps it through a CODE sign-in (integration, 2026-10-21): the email form's `next`
// is /my-bookings?cancel=<id>, the one shape lib/my-bookings/session.ts nextPathOf allows
// beyond its two bare paths. (Through the emailed LINK instead, /my-bookings/open sends
// them to the bare list, where they press Cancel on the row.)

export const dynamic = "force-dynamic";

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="text-cond text-white mb-4"
      style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", lineHeight: 1 }}
    >
      {children}
    </h1>
  );
}

/** ?cancel= as a series id, or null. A repeated key is not one id. */
function cancelParam(v: string | string[] | undefined): string | null {
  return typeof v === "string" && UUID_RE.test(v) ? v : null;
}

export default async function MyBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cancel = cancelParam((await searchParams).cancel);
  // Where a sign-in on this page comes back to: the same sheet, when there was one.
  const next = cancelNextPath(cancel) ?? undefined;
  const token = await readDeviceToken();
  if (!token) {
    return (
      <>
        <Heading>{COPY.title}</Heading>
        <RequestPanel next={next} />
      </>
    );
  }

  const r = await listBookings(token, clientIpOf(await headers()));
  if (r.kind === "signed_out") {
    return (
      <>
        <Heading>{COPY.title}</Heading>
        <RequestPanel note={COPY.signedOut} next={next} />
      </>
    );
  }
  if (r.kind === "unavailable") {
    return (
      <>
        <Heading>{COPY.title}</Heading>
        <p className="text-white/70 text-[0.98rem] leading-relaxed" role="alert">
          <PhoneText text={listUnavailable(FALLBACK_PHONE)} phone={FALLBACK_PHONE} />
        </p>
        <div className="mt-8">
          <NotYou />
        </div>
      </>
    );
  }

  return (
    <>
      <Heading>{COPY.title}</Heading>
      <BookingList view={r.view} openCancelFor={cancel} />
      <div className="mt-10">
        <NotYou />
      </div>
    </>
  );
}
