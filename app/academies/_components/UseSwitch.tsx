import { choiceForUse } from "@/lib/academies/copy";
import { usesOf } from "@/lib/academies/pick";
import type { Rate, Use } from "@/lib/academies/view";
import s from "./academies.module.css";

/* PBA's Coaching / Open play switch, 2026-11-16 (orangish-app docs/academy-page.md D8: §3.8 of
   PBA's licence bills extra time "at the rate for the actual use"). The two sides and their
   prices are the platform's rates; CCCA's single rate has no use, so it gets no switch. */
export default function UseSwitch({
  rates,
  value,
  onChange,
  disabled = false,
}: {
  rates: Rate[];
  value: Use | null;
  onChange: (u: Use) => void;
  disabled?: boolean;
}) {
  const uses = usesOf(rates);
  if (uses.length < 2) return null;
  return (
    <div className={`${s.seg} text-mono`} role="group" aria-label="Rate">
      {uses.map((u) => {
        const rate = rates.find((r) => r.use === u);
        return (
          <button key={u} type="button" aria-pressed={value === u} disabled={disabled} onClick={() => onChange(u)}>
            {rate ? choiceForUse(u, rate.centsPerHour) : u}
          </button>
        );
      })}
    </div>
  );
}
