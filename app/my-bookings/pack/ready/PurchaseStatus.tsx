"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PACK_BUY_COPY, purchasePendingLate } from "@/lib/my-bookings/copy";
import PhoneText from "../../_components/PhoneText";

/* "Payment received — setting up your pack…", 2026-10-21 (orangish-app
   docs/court-packs.md §8.2). Stripe sends the guest back the moment they pay, which can
   be a second or two before its webhook settles the pack, so the platform answers
   'pending' for a moment.

   It polls by REFRESHING THE SERVER PAGE (router.refresh): the page asks the platform
   again, server to server, and once the pack is active it renders the ready screen in
   place of this. No route of its own and no platform call from the browser. Every 3 s
   for 30 s — ten asks, well inside the platform's 60 per 10 minutes per IP — then it
   stops and says where the receipt is going, with the phone. The clock lives in a ref
   that survives the refreshes, so it cannot restart and poll for ever. */

export const POLL_EVERY_MS = 3000;
export const POLL_FOR_MS = 30_000;

export default function PurchaseStatus({ maskedEmail, phone }: { maskedEmail: string | null; phone: string }) {
  const router = useRouter();
  const [late, setLate] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
    const id = setInterval(() => {
      if (Date.now() - (startedAt.current ?? 0) >= POLL_FOR_MS) {
        clearInterval(id);
        setLate(true);
        return;
      }
      router.refresh();
    }, POLL_EVERY_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div role="status" aria-live="polite">
      <h1 className="text-cond text-white mb-4" style={{ fontSize: "clamp(2rem,7vw,2.8rem)", lineHeight: 1.05 }}>
        {PACK_BUY_COPY.pendingTitle}
      </h1>
      {late && (
        <p className="text-white/70 text-[1rem] leading-relaxed">
          <PhoneText text={purchasePendingLate(maskedEmail, phone)} phone={phone} />
        </p>
      )}
    </div>
  );
}
