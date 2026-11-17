"use client";

import { useState } from "react";
import {
  ACADEMY_COPY, addedTag, dayHeading, regularUntilLine, upcomingEmpty, upcomingHeading, upcomingWhat,
} from "@/lib/academies/copy";
import { rangeText, splitWeek, type OverviewView, type UpcomingDay } from "@/lib/academies/view";
import s from "./academies.module.css";

/* "Your upcoming court time" / "…lane time", 2026-11-16 (orangish-app docs/academy-page.md D9;
   the mockup). The partner's OWN time for the next 14 days as the platform grouped it — seven
   days shown, "Show the next 7 days" for the rest — with the tags the mockup draws: "Added 16 Nov"
   on time made from this page, "Not billed" on CCCA's free girls' hour. Then one line, "Your
   regular hours continue to …", when the platform sends that date.

   Only an answered overview reaches here (app/academies/page.tsx), so "No court time booked in
   the next 14 days" is the platform's word for it, never a failure shown as empty. Rows carry
   courts, times and a label from a closed set (lib/academies/view.ts UPCOMING_LABELS) — never
   an event's description, a holder or anyone else's booking. */
export default function Upcoming({ view }: { view: OverviewView }) {
  const [more, setMore] = useState(false);
  const { partner, club, today } = view;
  const { first, later } = splitWeek(view.upcoming, today);
  const days = more ? [...first, ...later] : first;

  return (
    <section className={s.section} aria-labelledby="ac-upcoming">
      <h2 id="ac-upcoming" className="text-cond text-white text-[1.4rem] mb-1">
        {upcomingHeading(partner.unit)}
      </h2>
      {view.upcoming.length === 0 ? (
        <p className="text-white/70 text-[0.92rem] leading-relaxed mt-3">{upcomingEmpty(partner.unit)}</p>
      ) : (
        days.map((d) => <Day key={d.date} day={d} view={view} tz={club.timezone} />)
      )}
      {!more && later.length > 0 && (
        <button type="button" className={`${s.more} text-mono`} onClick={() => setMore(true)}>
          {ACADEMY_COPY.showNext}
        </button>
      )}
      {view.regularUntil && <p className={s.fine}>{regularUntilLine(view.regularUntil, today)}</p>}
    </section>
  );
}

function Day({ day, view, tz }: { day: UpcomingDay; view: OverviewView; tz: string }) {
  return (
    <div>
      <div className={`${s.upDay} text-mono`}>{dayHeading(day.date, view.today)}</div>
      {day.items.map((it) => (
        <div key={`${it.start}|${it.courtLabels.join(",")}`} className={s.up}>
          <span className={s.w}>{rangeText(it.start, it.end, tz)}</span>
          <span className={s.what}>
            {upcomingWhat(view.partner.unit, it.courtLabels, it.label, it.use)}
            {it.addedOn && <span className={`${s.tag} ${s.tagAdd} text-mono`}>{addedTag(it.addedOn)}</span>}
            {it.notBilled && <span className={`${s.tag} ${s.tagFree} text-mono`}>{ACADEMY_COPY.notBilled}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
