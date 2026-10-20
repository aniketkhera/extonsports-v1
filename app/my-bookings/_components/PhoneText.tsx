import { Fragment } from "react";
import { phoneParts } from "@/lib/my-bookings/copy";

/* A sentence with the club's number in it, the number a tel: link, 2026-10-20 (second
   review). Most guests read "call 484-252-2523" on the phone they would call from.

   No "use client" and no hooks, so the server page and the client components can both
   render it. The link inherits the sentence's colour — only the underline marks it — so
   the light theme needs no text-white remap for it (see the test on those steps). */
export default function PhoneText({ text, phone }: { text: string; phone: string }) {
  return (
    <>
      {phoneParts(text, phone).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} className="underline underline-offset-2 whitespace-nowrap">
            {p.text}
          </a>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
