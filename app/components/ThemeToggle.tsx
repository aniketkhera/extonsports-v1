"use client";

import { useSyncExternalStore } from "react";

/* Light/dark switcher for the nav.

   The stored value is the whole state — there is no "system" option, and
   that is deliberate: the navy/ember palette IS the brand, so an OS set to
   light should not silently repaint the site for someone who never asked.
   Dark is the default and light is an opt-in.

   To follow the OS instead, change the fallback in the inline script in
   layout.tsx to read prefers-color-scheme. Nothing here needs to change —
   this component reads whatever that script decided.

   The source of truth at runtime is <html data-theme>, not React state. The
   inline script sets it before first paint, so reading it back through
   useSyncExternalStore means the button renders correctly on the very first
   client render, with no effect and no hydration mismatch. */

export type Theme = "light" | "dark";

export const THEME_KEY = "exton-theme";

/** Fires on same-tab toggles; `storage` only fires in *other* tabs. */
const THEME_EVENT = "exton-themechange";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/* The server has no way to know the visitor's choice, so it renders the
   default. The inline script corrects the DOM before paint. */
function getServerSnapshot(): Theme {
  return "dark";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLight = theme === "light";

  const toggle = () => {
    const next: Theme = isLight ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode / storage disabled. Switching still works for this
      // page view; it just will not be remembered.
    }
    // Cross-tab `storage` events skip the tab that wrote them, so the
    // originating tab needs its own nudge to re-read the snapshot.
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const label = `Switch to ${isLight ? "dark" : "light"} theme`;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center h-[30px] w-[30px] shrink-0 border border-[var(--color-line-2)] text-[var(--color-fog)] hover:text-[var(--color-ember)] hover:border-[var(--color-ember)]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ember)] transition-colors ${className}`}
    >
      {/* Both glyphs stay in the DOM and cross-fade, so the button never
          reflows and nothing pops in after hydration. */}
      <span className="relative block h-[15px] w-[15px]">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 h-full w-full transition-opacity duration-300"
          style={{ opacity: isLight ? 0 : 1 }}
        >
          {/* Moon — shown while dark is active */}
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 h-full w-full transition-opacity duration-300"
          style={{ opacity: isLight ? 1 : 0 }}
        >
          {/* Sun — shown while light is active */}
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
    </button>
  );
}
