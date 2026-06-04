"use client";

import { useState } from "react";

export default function CtaBanner() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fd.get("name"), email: fd.get("email") }),
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
      className="bg-[var(--color-ember)] flex flex-col gap-5 md:flex-row md:gap-10 md:items-center md:justify-between"
      style={{ padding: "32px 24px", paddingInline: "clamp(24px, 5vw, 56px)" }}
    >
      {/* Left: copy */}
      <div className="flex-shrink-0 text-center md:text-left">
        <p
          className="text-cond text-[1.55rem] text-black leading-tight"
          style={{ letterSpacing: "0.02em" }}
        >
          Be the first to know when we open Badminton, Cricket &amp; Turf.
        </p>
        <p className="text-black/65 text-[0.88rem] mt-1.5 font-semibold tracking-wide">
          Badminton, Cricket, and Turf Opening July 2026. Stay tuned for membership options.
        </p>
      </div>

      {/* Right: inline form OR success message */}
      {state === "ok" ? (
        <p className="text-cond text-black text-[1.3rem] font-bold text-center md:text-left">
          🎉 You&apos;re on the list — we&apos;ll be in touch!
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5 items-stretch">
          <input
            name="name"
            type="text"
            placeholder="Your name"
            required
            className="bg-white border-2 border-white text-black placeholder:text-black/40 px-5 py-3.5 text-[0.95rem] focus:outline-none focus:border-black w-full sm:w-40 font-medium"
          />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            className="bg-white border-2 border-white text-black placeholder:text-black/40 px-5 py-3.5 text-[0.95rem] focus:outline-none focus:border-black w-full sm:w-56 font-medium"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="bg-black hover:bg-[#1A1A1A] text-[var(--color-ember)] text-cond text-[1.05rem] px-8 py-3.5 transition whitespace-nowrap disabled:opacity-60 tracking-wide w-full sm:w-auto"
          >
            {state === "sending" ? "…" : "Notify Me →"}
          </button>
        </form>
      )}
    </div>
  );
}
