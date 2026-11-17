"use client";

import { useRef, useState } from "react";
import type { AddBody } from "@/lib/academies/pick";
import { fromSiteAdd, keepRequestId, type AddView } from "@/lib/academies/view";
import { postJson } from "../../my-bookings/_components/ui";

/* The one write, as the page presses it, 2026-11-16 (orangish-app docs/academy-page.md §3.3
   POST /add: "Idempotent on requestId").

   THE REQUEST ID. Minted with crypto.randomUUID() on the first press of a pick, and KEPT for
   the next press only when the answer was in doubt — a timeout, a 503, a 429
   (lib/academies/view.ts keepRequestId). So "press again" after "We couldn't confirm that"
   replays the first answer instead of adding the time twice, and the email goes once. Any
   change to the pick (`reset`) or any definite answer drops it: a different pick under an old
   id would get the old pick's answer back.

   The id lives in a ref, read and written only in the press handler, never during render.

   The OUTCOME is held here, by AcademyView, not by the card that pressed: an extend card can
   vanish on the refresh that follows a write (its session is no longer extendable), and the
   per-court lines saying what was added must not vanish with it. `labels` maps each court id
   in the press to the name the partner saw ("Court 2"), for those lines. */
export type Outcome = { view: AddView; labels: Record<string, string> }

export function useAdd(onAnswer: (v: AddView) => void) {
  const id = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  /** Call on every change to a pick: a new pick is a new request. */
  function reset() {
    id.current = null;
    setOutcome(null);
  }

  async function submit(build: (requestId: string) => AddBody | null, labels: Record<string, string>): Promise<AddView> {
    if (busy) return { status: "unknown" };
    const requestId = id.current ?? crypto.randomUUID();
    id.current = requestId;
    const body = build(requestId);
    if (!body) {
      id.current = null;
      const v: AddView = { status: "bad_request" };
      setOutcome({ view: v, labels });
      return v;
    }
    setBusy(true);
    const r = await postJson("/api/academies/add", body);
    const v = fromSiteAdd(r.status, r.json);
    if (!keepRequestId(v)) id.current = null;
    setBusy(false);
    setOutcome({ view: v, labels });
    onAnswer(v);
    return v;
  }

  return { busy, outcome, submit, reset };
}

export type AddApi = ReturnType<typeof useAdd>;
