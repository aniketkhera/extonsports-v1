"use client";

import { useState, useEffect, useRef } from "react";

function useScrollDirection() {
  const [dir, setDir] = useState<"up" | "down">("down");
  const lastY = useRef(0);
  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 8) return;
      setDir(y < lastY.current ? "up" : "down");
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return dir;
}

export default function CtaBanner() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const scrollDir = useScrollDirection();

  // Collapse the copy text on mobile when scrolling up —
  // keeps just the form row visible. Desktop always shows full.
  const copyCollapsed = scrollDir === "up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");

    // Capture acquisition context at submit time
    const params = new URLSearchParams(window.location.search);
    const acquisition = {
      referrer:     document.referrer || null,
      utm_source:   params.get("utm_source"),
      utm_medium:   params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    };

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), ...acquisition }),
      });
      if (!res.ok) throw new Error();
      setState("ok");
      (e.target as HTMLFormElement).reset();
    } catch {
      setState("err");
    }
  }

  return (
    <div
      id="waitlist"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-ember)] flex flex-col gap-2 md:flex-row md:gap-10 md:items-center md:justify-between shadow-2xl"
      style={{
        paddingInline: "clamp(20px, 4vw, 56px)",
        paddingTop: "12px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        transition: "padding 0.3s ease",
      }}
    >
      {/* Copy — collapses on mobile when scrolling up */}
      <div
        className="flex-shrink-0 text-center md:text-left overflow-hidden md:overflow-visible"
        style={{
          maxHeight: copyCollapsed ? "0px" : "120px",
          opacity: copyCollapsed ? 0 : 1,
          marginBottom: copyCollapsed ? "0" : undefined,
          transition: "max-height 0.3s ease, opacity 0.2s ease",
        }}
      >
        <p
          className="text-cond text-[1.3rem] sm:text-[1.55rem] text-black leading-tight"
          style={{ letterSpacing: "0.02em" }}
        >
          Be the first to know when we open Badminton, Cricket &amp; Turf.
        </p>
        <p className="text-black/65 text-[0.8rem] sm:text-[0.88rem] mt-1 font-semibold tracking-wide">
          Badminton, Cricket, and Turf opening mid-August 2026. Stay tuned for membership options.
        </p>
      </div>

      {/* Form — always visible */}
      {state === "ok" ? (
        <p className="text-cond text-black text-[1.1rem] font-bold text-center md:text-left pb-1">
          🎉 You&apos;re on the list — we&apos;ll be in touch!
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-row gap-2 items-stretch">
          {/* Name hidden on mobile when collapsed to keep it to one row */}
          <input
            name="name"
            type="text"
            placeholder="Your name"
            required
            className="bg-white border-2 border-white text-black placeholder:text-black/40 px-3 py-2.5 text-[0.85rem] focus:outline-none focus:border-black font-medium md:overflow-visible"
            style={{
              width: copyCollapsed ? "0px" : undefined,
              minWidth: copyCollapsed ? "0" : "120px",
              padding: copyCollapsed ? "10px 0" : undefined,
              overflow: "hidden",
              transition: "min-width 0.3s ease, width 0.3s ease, padding 0.3s ease",
              display: copyCollapsed ? "none" : undefined,
            }}
          />
          <input
            name="email"
            type="email"
            placeholder="Email — be first to know"
            required
            className="bg-white border-2 border-white text-black placeholder:text-black/40 px-3 py-2.5 text-[0.85rem] focus:outline-none focus:border-black font-medium flex-1 min-w-0"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="bg-black hover:bg-[#1A1A1A] text-[var(--color-ember)] text-cond text-[0.9rem] px-4 py-2.5 transition whitespace-nowrap disabled:opacity-60 tracking-wide shrink-0"
          >
            {state === "sending" ? "…" : "Notify Me →"}
          </button>
        </form>
      )}

      {state === "err" && (
        <p className="text-black/70 text-[0.75rem] text-center pb-1">
          Something went wrong — try again.
        </p>
      )}
    </div>
  );
}
