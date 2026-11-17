import { addMessage, resultLine } from "@/lib/academies/copy";
import type { Unit } from "@/lib/academies/view";
import type { Outcome } from "./useAdd";
import s from "./academies.module.css";

/* What a press came to, 2026-11-16 (orangish-app docs/academy-page.md §4: "After a submit:
   per-court result lines ('Court 2 was just booked — nothing added for it'), then refresh").
   One line per court the platform answered for — courts succeed or fail one by one (§3.3) —
   then the total and whether the email went. Every other answer is one sentence from
   lib/academies/copy.ts addMessage, which never says "added" unless the platform did. */
export default function AddOutcome({ outcome, unit, tz }: { outcome: Outcome | null; unit: Unit; tz: string }) {
  if (!outcome) return null;
  const v = outcome.view;
  const good = v.status === "done" && v.results.some((r) => r.ok);
  const fallback = unit === "lane" ? "A lane" : "A court";
  return (
    <div className={`${s.results} ${good ? "" : s.doubt}`} role="status" aria-live="polite">
      {v.status === "done" && (
        <ul>
          {v.results.map((r) => (
            <li key={r.courtId}>{resultLine(r, outcome.labels[r.courtId] ?? fallback, tz)}</li>
          ))}
        </ul>
      )}
      <p>{addMessage(v)}</p>
    </div>
  );
}
