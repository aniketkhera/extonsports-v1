// Class strings shared by the /my-bookings components, 2026-10-20 — the site's own
// vocabulary (Hero.tsx CTAs, BadmintonEnquiry.tsx fields), square corners throughout.
//
// Light is the default theme (layout.tsx), so only tokens and the text-white/NN steps
// that globals.css remaps under [data-theme="light"] are used — /85 is NOT one of them,
// and a first render here set the "Cancelled" sentence white on white with it. Two
// deliberate departures from BadmintonEnquiry: the placeholder is var(--color-muted)
// (placeholder:text-white/30 is a different class from text-white/30 and has no light
// remap), and inputs are 16px, because iOS Safari zooms the page into any field set
// smaller. No hover:text-white either — also not remapped, and on the light ground it
// would blank the label under the pointer.

export const BTN_PRIMARY =
  "text-mono bg-[var(--color-ember)] text-black border border-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] hover:border-[var(--color-ember-hi)] transition-colors py-[12px] px-5 text-[0.72rem] disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SECONDARY =
  "text-mono text-[var(--color-ember)] border border-[var(--color-ember)]/50 hover:border-[var(--color-ember)] transition-colors py-[12px] px-5 text-[0.72rem] disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_TEXT =
  "text-mono text-[0.68rem] text-white/55 hover:text-white/80 underline underline-offset-4 transition-colors disabled:opacity-60";

export const INPUT =
  "w-full bg-[var(--color-ink-2)] border border-[var(--color-line-2)] focus:border-[var(--color-ember)] text-white placeholder:text-[var(--color-muted)] px-3.5 py-2.5 text-[16px] outline-none transition-colors";

export const LABEL = "block text-mono text-[0.62rem] text-white/50 mb-1.5";

export const ERROR = "text-[var(--color-ember)] text-[0.88rem] leading-relaxed mt-3";

/** POST JSON to one of this site's own /api/my-bookings routes. Never throws. */
export async function postJson(path: string, body: unknown): Promise<{ status: number; json: unknown }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  } catch {
    return { status: 0, json: null };
  }
}
