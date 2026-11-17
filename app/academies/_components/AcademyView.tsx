"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ACADEMY_COPY, billingLine, cancelLine, kicker } from "@/lib/academies/copy";
import type { AddView, OverviewView } from "@/lib/academies/view";
import AddOutcome from "./AddOutcome";
import BookMore from "./BookMore";
import ExtendCard from "./ExtendCard";
import SignOut from "./SignOut";
import Upcoming from "./Upcoming";
import { useAdd } from "./useAdd";
import s from "./academies.module.css";

/* The partner's page, signed in, 2026-11-16 (orangish-app docs/academy-page.md §4; the
   mockup's screens 2 and 3 — PBA in courts, CCCA in lanes, one component).

   Top to bottom, as the mockup: the header ("Exton Sports Center · Academy page", the
   partner's name, "Signed in on this phone as … · Sign out"); the On-now extend card ONLY
   when the platform listed something extendable; Book more; Upcoming; the cancel line (D6),
   and the billing line (D7). Everything here is the allow-listed overview
   (lib/academies/view.ts toOverview) — no token, no other partner, nobody else's booking.

   BOTH CARDS PRESS THE ONE WRITE (D4): two useAdd instances, one per card, so each card's
   answer shows where it was pressed — the extend answer under the extend cards even if the
   refresh removes the card it came from. After a 'done' or a 422 the page refreshes:
   router.refresh() re-renders the server page (a new overview: Upcoming, the extend
   options) without losing this component's state (Next 16 useRouter docs), and refreshKey
   makes Book more fetch its grid again. Nothing refreshes on a doubt — the pick stays, so
   "press again" replays the same request. */
export default function AcademyView({ view }: { view: OverviewView }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const { partner, club } = view;

  function onAnswer(v: AddView) {
    if (v.status === "done" || v.status === "refused") {
      router.refresh();
      setRefreshKey((k) => k + 1);
    }
  }
  /** Book more asked for a date the platform no longer books (2026-11-16 review: a page left
   *  open past midnight). A new overview moves today, the chips and the extend cards on. */
  function onStale() {
    router.refresh();
  }
  const extendAdd = useAdd(onAnswer);
  const bookAdd = useAdd(onAnswer);
  const cancel = cancelLine(partner.key);

  return (
    <div className={s.page}>
      <div className={`text-mono ${s.kicker}`}>{kicker(club.name)}</div>
      <h1 className="text-cond text-white mt-2.5 mb-1.5" style={{ fontSize: "clamp(2rem,7vw,2.8rem)", lineHeight: 1 }}>
        {partner.name}
      </h1>
      <p className={s.who}>
        {ACADEMY_COPY.signedInAs}
        {partner.email} · <SignOut inline />
      </p>

      {view.extend.map((g) => (
        <ExtendCard key={`${g.parentEnd}|${g.courts.map((c) => c.courtId).join(",")}`} group={g} view={view} add={extendAdd} />
      ))}
      <AddOutcome outcome={extendAdd.outcome} unit={partner.unit} tz={club.timezone} />

      {/* Keyed on the club-local date: a page open past midnight gets a new overview
          (BookMore's 'stale'), and only a remount moves Book more's chosen day onto it. */}
      <BookMore key={view.today} view={view} refreshKey={refreshKey} add={bookAdd} onStale={onStale} />

      <Upcoming view={view} />

      <div className={s.cancel}>
        {cancel.before}
        <a href={`mailto:${cancel.email}`}>{cancel.email}</a>
        {cancel.after}
      </div>
      <p className={s.fine}>{billingLine(partner.unit, view.rates, partner.billing)}</p>
    </div>
  );
}
