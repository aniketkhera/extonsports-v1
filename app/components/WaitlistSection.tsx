"use client";

import { useState } from "react";

export default function WaitlistSection() {
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
    <section className="bg-[var(--color-ink-2)] border-y border-[var(--color-line)]">
      <div className="mx-auto max-w-[760px] px-4 py-12 text-center">
        {/* eyebrow */}
        <p className="text-cond text-[var(--color-ember)] text-[0.75rem] tracking-[0.22em] mb-4">
          OPENING JULY 2026 · EXTON, PA
        </p>

        {/* headline */}
        <h2
          className="text-cond text-white mb-4"
          style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.8rem)" }}
        >
          Be the first to know when we open.
        </h2>

        {/* sub */}
        <p className="text-white/60 text-[0.94rem] leading-[1.6] mb-10 max-w-[46ch] mx-auto">
          Enter your name and email. Founding members get first access, priority court bookings,
          and an exclusive opening-week rate.
        </p>

        {/* form */}
        {state !== "ok" ? (
          <form
            onSubmit={submit}
            className="flex flex-col sm:flex-row gap-3 justify-center items-stretch"
          >
            <input
              name="name"
              type="text"
              placeholder="Your name"
              required
              className="bg-white/[0.06] border border-white/15 text-white placeholder:text-white/35 px-5 py-3 text-[0.94rem] w-full sm:w-48 focus:outline-none focus:border-[var(--color-ember)] transition"
            />
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="bg-white/[0.06] border border-white/15 text-white placeholder:text-white/35 px-5 py-3 text-[0.94rem] w-full sm:w-60 focus:outline-none focus:border-[var(--color-ember)] transition"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="bg-[var(--color-ember)] hover:bg-[var(--color-ember-hi)] text-black font-bold px-7 py-3 text-cond-md text-[0.92rem] transition disabled:opacity-55 whitespace-nowrap w-full sm:w-auto"
            >
              {state === "sending" ? "Sending…" : "Notify Me →"}
            </button>
          </form>
        ) : (
          <p className="text-[var(--color-ember)] text-[1.1rem] font-semibold">
            🎉 You&apos;re on the list. We&apos;ll be in touch!
          </p>
        )}

        {state === "err" && (
          <p className="text-red-400 text-sm mt-4">
            Something went wrong — try again or email{" "}
            <a href="mailto:contact@extonsports.com" className="underline">
              contact@extonsports.com
            </a>
          </p>
        )}

        <p className="text-white/30 text-[0.72rem] mt-6">
          No spam. You can unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
