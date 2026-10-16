"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createGlobe, globeAngleAt, msUntilNextTurn, loadGlobeTexture, GLOBE_TEXTURE } from "../../lib/logo-globe";

/* The club's round mark as a globe that turns now and then (2026-10-16).
   ──────────────────────────────────────────────────────────────────────────
   Aniket: "can we rotate the exton sports logo? like a globe, 3D perhaps?", then — of
   three mocked treatments — "globe.", then "put the same globe on extonsports.com,
   and on the vestible and entrance tvs too". So this one component is the mark in the
   site's header, on /reception, /board and /comingsoon.

   The drawing is lib/logo-globe (a canvas ray-cast of the logo onto a lit sphere);
   this file is only the scheduling around it:

   - THE FLAT LOGO FIRST. An <img> of the globe's own texture sits under the canvas and
     is what the server renders, so the header never flashes empty — and with no JS, or
     a canvas that fails, it is simply the logo. It fades out once the globe has drawn
     its first frame, which at rest is that same image, texel for pixel, so nothing
     jumps. One 33KB file serves both, which matters on the website: the 1254px
     /favicon.png the TVs used to show is a megabyte to every visitor's phone.
   - ONE CLOCK FOR EVERY SCREEN. The angle comes from the wall clock, not from when
     the page loaded, so the reception and vestibule TVs turn at the same moment.
   - IT SLEEPS. A turn is a few seconds in every ten; between turns nothing is drawn
     and the loop waits on a timer for the next one. Off screen or in a hidden tab
     (the website) it stops altogether and resumes on return.
   - prefers-reduced-motion: the rest frame, once, and no loop.
   - It follows its box: the size is any CSS length (vw/vh on the TVs), and a
     ResizeObserver rebuilds the canvas at the new pixel size. */
/* The halo, in multiples of the ball's own size so it reads the same at 38px and on a
   75" panel. 2026-10-16, Aniket, of the live globe: "add more glow to the globe..
   looks good..". It was a 0.35x blur at 0.28; now two layers — a tight bright one
   that hugs the ball and a wide soft one — with a little spread so the light leaves
   the edge rather than starting outside it. The ring (TVs only) is a touch brighter
   to match. The ball's own orange rim light went up with it (RIM in lib/logo-globe). */
function halo(s: string, ring: boolean): string {
  const near = `0 0 calc(${s} * 0.2) calc(${s} * 0.02) rgba(248, 155, 114, 0.55)`;
  const far = `0 0 calc(${s} * 0.6) calc(${s} * 0.06) rgba(248, 155, 114, 0.32)`;
  return ring ? `0 0 0 calc(${s} * 0.035) rgba(248, 155, 114, 0.75), ${near}, ${far}` : `${near}, ${far}`;
}

export default function LogoGlobe({
  size, ring = false, glow = ring, label, className, style,
}: {
  /** Any CSS length. Omit it to size from `className` instead. */
  size?: string;
  /** The thin orange ring the TV headers use (it brings the glow with it). */
  ring?: boolean;
  /** The orange glow around the ball, without the ring — the website's header. */
  glow?: boolean;
  /** Accessible name when the mark stands alone (the site header). Otherwise decorative. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let globe: ReturnType<typeof createGlobe> | null = null;
    let lastAngle = NaN;
    let visible = true;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const stop = () => {
      if (timer !== undefined) clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      timer = frame = undefined;
    };
    const tick = () => {
      frame = undefined;
      if (!alive || !globe || !visible) return;
      const now = Date.now();
      const a = reduce ? 0 : globeAngleAt(now);
      if (a !== lastAngle || globe.resized()) {
        globe.draw(a);
        lastAngle = a;
        setDrawn(true);
      }
      if (reduce) return;
      const wait = msUntilNextTurn(now);
      if (wait > 0) timer = setTimeout(() => { timer = undefined; frame = requestAnimationFrame(tick); }, wait);
      else frame = requestAnimationFrame(tick);
    };
    const wake = () => { stop(); if (visible) frame = requestAnimationFrame(tick); };

    loadGlobeTexture()
      .then((tex) => {
        if (!alive) return;
        globe = createGlobe(cv, tex);
        wake();
      })
      .catch(() => { /* keep the flat logo */ });

    const ro = new ResizeObserver(() => { lastAngle = NaN; wake(); });
    ro.observe(cv);
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting) && document.visibilityState !== "hidden";
      wake();
    });
    io.observe(cv);
    const onVis = () => { visible = document.visibilityState !== "hidden"; wake(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      globe?.destroy();
    };
  }, []);

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        position: "relative", display: "inline-block", flex: "none", borderRadius: "50%",
        ...(size ? { width: size, height: size } : {}),
        ...(ring || glow ? { boxShadow: halo(size ?? "1em", ring) } : {}),
        ...style,
      }}
    >
      {/* The flat mark, clipped to its disc: the texture is cut to the disc and filled
          with the logo's own navy past 0.95 of the radius, so no white edge can show. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GLOBE_TEXTURE} alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", maxWidth: "none", display: "block",
          borderRadius: "50%", opacity: drawn ? 0 : 1, transition: "opacity 300ms",
        }}
      />
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", borderRadius: "50%" }} />
    </span>
  );
}
