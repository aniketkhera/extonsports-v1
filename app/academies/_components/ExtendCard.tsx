"use client";

import { useState } from "react";
import {
  ACADEMY_COPY, confirmLine, droppedNote, extendButton, extendChip, extendHeadline, extendNote, extendSummary, sessionSub,
} from "@/lib/academies/copy";
import { amountCents, droppedCourts, extendBody, rateFor, tapExtend, usesOf, type ExtendPick } from "@/lib/academies/pick";
import { courtName, type ExtendGroup, type OverviewView, type Use } from "@/lib/academies/view";
import { BTN_PRIMARY } from "../../my-bookings/_components/ui";
import type { AddApi } from "./useAdd";
import UseSwitch from "./UseSwitch";
import s from "./academies.module.css";

/* "On now" — extend a session that is running or ends within the hour, 2026-11-16
   (orangish-app docs/academy-page.md D4; the mockup's top card). Rendered ONLY for a group
   the platform listed in overview.extend: the platform decides what is extendable, and an
   empty list means no card at all (AcademyView).

   Per court, +30 min or +1 hour from EXACTLY that court's end; a chip the platform refused is
   greyed, and the line under it says why ("Booked from 9:30 PM — can't extend"). One length per
   press, because POST /add takes one (lib/academies/pick.ts tapExtend says how a change of
   length moves the other courts, and droppedNote says so on screen before the press).

   PBA's use (D8) starts at the session's own and can be switched; CCCA has none. The amount is
   a preview from the platform's rates — the platform computes the charge (D7). */
export default function ExtendCard({ group, view, add }: { group: ExtendGroup; view: OverviewView; add: AddApi }) {
  const { partner, rates, club } = view;
  const tz = club.timezone;
  const pba = partner.key === "pba";
  const [pick, setPick] = useState<ExtendPick | null>(null);
  const [use, setUse] = useState<Use | null>(pba ? (group.use ?? usesOf(rates)[0] ?? null) : null);
  const [dropped, setDropped] = useState<string | null>(null);

  const head = extendHeadline(group, partner.unit, view.now, tz);
  const rate = rateFor(rates, pba ? use : null);
  // "Court 1", never the platform's bare "1" (view.ts courtName) — for the row, the summary,
  // the dropped note and the result lines alike.
  const labelOf = (id: string) => courtName(partner.unit, group.courts.find((c) => c.courtId === id)?.label ?? id);

  function tap(courtId: string, minutes: 30 | 60) {
    const next = tapExtend(group, pick, courtId, minutes);
    const gone = droppedCourts(pick, next).filter((c) => c !== courtId);
    setDropped(gone.length && next ? droppedNote(partner.unit, gone.map(labelOf), next.minutes) : null);
    setPick(next);
    add.reset();
  }

  async function press() {
    if (!pick) return;
    const labels = Object.fromEntries(pick.courtIds.map((c) => [c, labelOf(c)]));
    const v = await add.submit((requestId) => extendBody(group, pick, tz, requestId, partner.key, pba ? use : null), labels);
    if (v.status === "done") {
      setPick(null);
      setDropped(null);
    }
  }

  let summary: React.ReactNode = null;
  if (pick && rate) {
    const labels = pick.courtIds.map(labelOf);
    const cents = amountCents(rate.centsPerHour, pick.minutes, labels.length);
    const newEnd = new Date(Date.parse(group.parentEnd) + pick.minutes * 60_000).toISOString();
    const sum = extendSummary(partner.unit, labels, newEnd, pick.minutes, cents, partner.billing, rate, tz);
    summary = (
      <>
        <div className={s.sum}>
          <b>{sum.head}</b> · {sum.hours}
          <br />
          {sum.money}
        </div>
        <p className={s.confirm}>{confirmLine(cents)}</p>
        <button type="button" className={`${BTN_PRIMARY} ${s.submit}`} disabled={add.busy} onClick={press}>
          {add.busy ? ACADEMY_COPY.adding : extendButton(partner.unit, labels)}
        </button>
      </>
    );
  }

  return (
    <div className={s.card}>
      <span className={`${s.nowTag} text-mono`}>{head.tag}</span>
      <p className={s.big}>{head.text}</p>
      <p className={s.sub}>{sessionSub(partner.key, partner.unit, pba ? use : null)}</p>
      {pba && (
        <UseSwitch
          rates={rates}
          value={use}
          disabled={add.busy}
          onChange={(u) => {
            setUse(u);
            add.reset();
          }}
        />
      )}
      <div className={`text-mono ${s.kicker}`} style={{ marginBottom: 2 }}>
        {ACADEMY_COPY.extendKicker}
      </div>
      {group.courts.map((court) => (
        <div key={court.courtId} className={s.row}>
          <div className={s.courtName}>{labelOf(court.courtId)}</div>
          <div>
            <div className={s.chips}>
              {court.options.map((o) => (
                <button
                  key={o.minutes}
                  type="button"
                  className={`${s.chip} text-mono`}
                  disabled={!o.ok || add.busy}
                  aria-pressed={!!pick && pick.minutes === o.minutes && pick.courtIds.includes(court.courtId)}
                  onClick={() => tap(court.courtId, o.minutes)}
                >
                  {extendChip(o.minutes)}
                </button>
              ))}
            </div>
            <div className={s.note}>{extendNote(court, tz)}</div>
          </div>
        </div>
      ))}
      {dropped && (
        <p className={s.fine} role="status">
          {dropped}
        </p>
      )}
      {summary}
      <p className={s.fine}>{ACADEMY_COPY.extendFine}</p>
    </div>
  );
}
