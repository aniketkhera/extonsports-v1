"use client";

import { useState, useEffect, useRef } from "react";

// Reads referrer + UTM + sport off the current URL at submit time.
// Returns only the keys that are actually present so the API's
// existing null-defaults stand for everything else. Safe on the server
// (returns {}), though this only ever runs from a click handler.
function acquisitionFields(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  if (document.referrer) out.referrer = document.referrer;
  const params = new URLSearchParams(window.location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "sport"]) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

function useScrollDirection() {
  const [dir, setDir] = useState<"up" | "down">("down");
  const lastY = useRef(0);
  useEffect(() => {
    // Seed with actual scroll position so first move is correct
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

export default function WaitlistSection() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const scrollDir = useScrollDirection();

  // Only collapse on mobile (we detect in JS too since CSS can't toggle max-height)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const collapsed = isMobile && scrollDir === "up" && state !== "ok";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          // Acquisition context — captured at submit time so a signup
          // can be attributed to its referrer / campaign / sport. The
          // `sport` param (e.g. ?sport=cricket on an outreach link) feeds
          // the sport-interest segment in the Traffic dashboard.
          ...acquisitionFields(),
        }),
      });
      if (!res.ok) throw new Error();
      setState("ok");
      (e.target as HTMLFormElement).reset();
    } catch {
      setState("err");
    }
  }

  return (
    <section className="bg-[var(--color-ink-2)] border-y border-[var(--color-line)] overflow-hidden">
      {/* Outer wrapper — max-height drives the collapse animation */}
      <div
        style={{
          maxHeight: collapsed ? "52px" : "600px",
          overflow: "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        {/* ── COLLAPSED STRIP (mobile only, scroll-up) ── */}
        <div
          style={{
            opacity: collapsed ? 1 : 0,
            pointerEvents: collapsed ? "auto" : "none",
            position: collapsed ? "relative" : "absolute",
            transition: "opacity 0.2s ease",
          }}
        >
          <form onSubmit={submit} className="flex items-center gap-2 px-3 py-2 sm:hidden">
            <input
              name="email"
              type="email"
              placeholder="Your email — be first to know"
              required
              className="bg-white/[0.06] border border-white/15 text-white placeholder:text-white/30 px-3 py-2 text-[0.78rem] flex-1 min-w-0 focus:outline-none focus:border-[var(--color-ember)] transition"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="bg-[var(--color-ember)] text-black font-bold px-3 py-2 text-[0.75rem] whitespace-nowrap shrink-0 transition disabled:opacity-55"
            >
              {state === "sending" ? "…" : "Notify Me →"}
            </button>
          </form>
        </div>

        {/* ── FULL SECTION ── */}
        <div
          style={{
            opacity: collapsed ? 0 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          <div className="mx-auto max-w-[760px] px-4 py-6 sm:py-12 text-center">
            <p className="hidden sm:block text-cond text-[var(--color-ember)] text-[0.75rem] tracking-[0.22em] mb-3">
              OPENING MID-AUGUST 2026 · EXTON, PA
            </p>
            <h2
              className="text-cond text-white mb-2 sm:mb-4"
              style={{ fontSize: "clamp(1.3rem, 3.4vw, 2.8rem)" }}
            >
              Be the first to know when we open.
            </h2>
            <p className="text-white/60 text-[0.82rem] sm:text-[0.94rem] leading-[1.5] mb-4 sm:mb-10 max-w-[46ch] mx-auto">
              <span className="sm:hidden">Founding members get first access and an exclusive opening rate.</span>
              <span className="hidden sm:inline">Enter your name and email. Founding members get first access, priority court bookings, and an exclusive opening-week rate.</span>
            </p>

            {state !== "ok" ? (
              <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 justify-center items-stretch">
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
                <a href="mailto:contact@extonsports.com" className="underline">contact@extonsports.com</a>
              </p>
            )}
            <p className="text-white/30 text-[0.68rem] mt-3 sm:mt-6">No spam. Unsubscribe any time.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
