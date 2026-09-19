"use client";

import { Component, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Facility3D from "../components/Facility3D";
import { CONTACT_PHONE, CONTACT_PHONE_E164 } from "@/lib/legal";
import QrCode from "./QrCode";
import s from "./comingsoon.module.css";

// Zone colours are Facility3D's own (its `C` table), so each legend dot matches the floor
// it names in the rendering above it.
const ZONES = [
  { color: "#f0997b", count: "4", label: "All-glass squash courts" },
  { color: "#c0dd97", count: "3", label: "Badminton courts" },
  { color: "#f5c4b3", count: "3", label: "Cricket lanes" },
  { color: "#d3d1c7", count: "+", label: "Fitness studio · Pro shop" },
];

// Entrances are CSS, not framer-motion: a JS-driven entrance starts at opacity 0 and only
// finishes if animation frames run. On a wall screen, that makes "is anything visible"
// depend on the TV's scheduler — and when frames were paused (a hidden browser tab,
// 2026-09-19) the page stayed blank. A CSS animation with fill-mode `both` ends visible
// regardless, and prefers-reduced-motion drops it outright.
const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` });

// Tighter framing on the wide TV stage; the homepage's own framing (38) on a phone's 5:4
// stage, where 31 crops the ends of the building. Same query as the CSS layout switch. The
// server has no window and says 38; that differs from a TV's first client render, which is
// harmless because Facility3D renders no fov-dependent markup — the value is read once,
// client-side, when the renderer is built.
const TV_LAYOUT = "(min-aspect-ratio: 4/3) and (min-width: 900px)";
const stageFov = () => (typeof window !== "undefined" && window.matchMedia(TV_LAYOUT).matches ? 31 : 38);

export default function ComingSoon() {
  useReloadOnDeploy();

  return (
    <main className={s.root}>
      <Backdrop />
      <Diag />

      <section className={s.copy}>
        <div className={`${s.brand} ${s.rise}`}>
          {/* The 1254px mark, not /logo.png: that one is 128px and goes soft on a TV. */}
          <img className={s.logo} src="/favicon.png" alt="" width={1254} height={1254} />
          <div>
            <div className={s.wordmark}>
              EXTON <span>SPORTS CENTER</span>
            </div>
            <div className={s.sports}>Squash · Badminton · Cricket · Fitness</div>
          </div>
        </div>

        {/* Two messages taking turns in one spot (2026-09-19): COMING SOON!, then the bulk
            booking offer. Both slides share one grid cell, so the heading keeps the taller
            one's height and nothing below it moves when they swap. data-text feeds each line's
            colour-crossfading ::after copy; the slides are aria-hidden and the heading's
            aria-label says both, so a screen reader reads each message once.
            "Call or text": texts to the Exton line do arrive, but it cannot text back until
            its 10DLC brand is registered (orangish-app docs/telephony.md §5). */}
        <h1
          className={`${s.title} ${s.rise}`}
          style={delay(0.15)}
          aria-label="Coming soon! Bulk court bookings — call or text."
        >
          <span className={`${s.slide} ${s.slideA}`} aria-hidden>
            <span className={s.line} data-text="Coming">Coming</span>
            <span className={s.line} data-text="soon!">soon!</span>
          </span>
          <span className={`${s.slide} ${s.slideB}`} aria-hidden>
            <span className={s.line} data-text="Bulk court">Bulk court</span>
            <span className={s.line} data-text="bookings">bookings</span>
            <span className={s.callOrText}>
              <PhoneIcon />
              Call or text
            </span>
          </span>
        </h1>
      </section>

      <section className={`${s.stageWrap} ${s.riseStage}`}>
        <div className={s.stageFrame}>
          <div className={s.stage}>
            <StageBoundary fallback={<img className={s.stageFallback} src="/favicon.png" alt="" />}>
              <Facility3D fov={stageFov()} />
            </StageBoundary>
            <div className={s.stageTag}>
              <span className={s.stageTagDot} aria-hidden />
              The club floor · 3D
            </div>
            {/* Not a bare "Open 24/7" — beside COMING SOON that reads as open now. And no
                opening date anywhere on this screen: it is not settled (2026-09-19), so the
                page does not read lib/opening.ts at all. */}
            <div className={s.stageTagRight}>Open 24/7 from day one</div>
          </div>
        </div>
        {/* Under the frame, not over it: overlaid, the chips covered the building's near
            corner at some angles of the orbit. */}
        <ul className={s.legend}>
          {ZONES.map((z) => (
            <li key={z.label}>
              <span className={s.legendDot} style={{ background: z.color, boxShadow: `0 0 12px ${z.color}` }} />
              <b>{z.count}</b>
              {z.label}
            </li>
          ))}
        </ul>
      </section>

      <footer className={`${s.foot} ${s.rise}`} style={delay(0.45)}>
        <div className={s.qrBlock}>
          <div className={s.qrTile}>
            <QrCode className={s.qr} />
          </div>
          <div>
            <div className={s.kicker}>Scan to explore</div>
            <div className={s.big}>extonsports.com</div>
          </div>
        </div>

        <span className={s.rule} aria-hidden />

        <a className={s.phone} href={`tel:${CONTACT_PHONE_E164}`}>
          <span className={s.phoneBadge} aria-hidden>
            <PhoneIcon />
          </span>
          <span>
            <span className={s.kicker}>Questions? Call or text</span>
            <span className={s.big}>{CONTACT_PHONE}</span>
          </span>
        </a>

        <div className={s.where}>
          <div>4 Tabas Lane, Building 2 · Exton, PA</div>
          <div className={s.whereSub}>Pay by the hour · No membership required</div>
        </div>
      </footer>
    </main>
  );
}

// "Whatever is on the URL is what the TV shows." A wall screen loads its page once and
// holds it for days, so a deploy would otherwise reach it only at the next power cut. Polls
// /api/screen-version once a minute and reloads when the deployment changes. A failed poll
// (the club's internet blipping) is just skipped; the next one tries again.
function useReloadOnDeploy(everyMs = 60_000) {
  useEffect(() => {
    let first: string | null = null;
    const check = async () => {
      try {
        const res = await fetch("/api/screen-version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!version) return;
        if (first === null) first = version;
        else if (version !== first) window.location.reload();
      } catch {
        /* offline — try again next tick */
      }
    };
    const kick = setTimeout(check, 0);
    const id = setInterval(check, everyMs);
    return () => {
      clearTimeout(kick);
      clearInterval(id);
    };
  }, [everyMs]);
}

function Backdrop() {
  return (
    <div className={s.bg} aria-hidden>
      <div className={`${s.blob} ${s.blobEmber}`} />
      <div className={`${s.blob} ${s.blobGreen}`} />
      <div className={`${s.blob} ${s.blobGold}`} />
      <div className={s.grid} />
      <div className={s.vignette} />
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// The rendering needs WebGL, and a TV browser is the likeliest place in the world to lack
// it. Facility3D constructs its renderer in an effect, and an effect that throws unmounts
// the whole tree without a boundary — a blank wall screen with nobody at it to notice. So
// the floor plan fails alone, and the logo stands in.
class StageBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ?diag=1 — what this screen is actually doing, printed in a corner: frame rate, device
// pixel ratio, viewport, the 3D canvas's real backing size, and the GPU. For judging a TV
// from across the room ("the floor plan is choppy") with numbers rather than adjectives —
// which is how the 18 → 75 fps fix on the reception TV was found (2026-09-19). Off unless
// asked for; reads the URL client-side so /comingsoon stays a static page. Point a TV at it
// with tv-keeper: `point reception https://extonsports.com/comingsoon?diag=1`.
function Diag() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("diag")) return;
    let frames = 0;
    let raf = 0;
    const count = () => { frames++; raf = requestAnimationFrame(count); };
    raf = requestAnimationFrame(count);
    let gpu = "?";
    const report = () => {
      const fps = frames / 5;
      frames = 0;
      const c = document.querySelector("canvas");
      if (c && gpu === "?") {
        const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        gpu = gl ? String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : "no WebGL";
      }
      const canvas = c ? `${c.width}x${c.height} for ${c.clientWidth}x${c.clientHeight} css` : "none";
      setText(`${Math.round(fps)} fps · dpr ${window.devicePixelRatio} · ${window.innerWidth}x${window.innerHeight} · canvas ${canvas} · ${gpu}`);
    };
    const id = setInterval(report, 5000);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, []);
  if (!text) return null;
  return <div className={s.diag}>{text}</div>;
}
