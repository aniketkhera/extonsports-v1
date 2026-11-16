"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useTick } from "./ticker";
import { secondTicker } from "./ScreenChrome";
import { readKey } from "./screen-key";
import {
  CHIME_ATTACK_S, CHIME_DECAY_S, CHIME_GAIN, CHIME_PARTIALS, CHIME_PEAK, CHIME_TEST_EVERY_MS, CHIME_TEST_FOR_MS, chimeStrikes, chimeVia,
  type ChimeStrike,
  CHIME_TEST_LEVELS, CHIME_WINDOW_MS, chimeDue, chimeKey, chimesFor, testLevel, testUntil,
  announceClip, announceDue, announceKey, zoneBusyAfter, type AnnounceKind,
} from "../board/chime-pure";

/* THE TIME-UP CHIME ON A TV (2026-11-15) — the sound and the switches. The rules (when,
   how loud, what it sounds like) are app/board/chime-pure.ts; this is the browser half.

   ChimeSports — which sports ring on THIS page: the TV's `chime` list (tv-screens.ts),
   handed down by ReceptionBoard / SportBoard. Empty, the default, is silent and creates
   no audio at all. useTimeUpChime — called by the countdown (ReceptionBoard NudgedFoot)
   every second it is showing; it rings at most once per end instant.

   UNLOCKING (the cricket set). Silk on the Fire TV refused all page audio on 2026-11-10
   unless a user gesture came first. The N95 already presses OK on that set after opening
   the page (for full screen, SilkFullscreen.tsx); a key press or click is a gesture, so
   AudioUnlock creates and resumes the one AudioContext inside it. On the VIZIOs the
   context runs with no gesture and this changes nothing.

   ChimeTest — ?chimetest=<until> (epoch ms or ISO, at most 3 h ahead) on any TV page rings every CHIME_TEST_EVERY_MS at the three
   CHIME_TEST_LEVELS in turn (or ?chimelevel=2 for one), for CHIME_TEST_FOR_MS, and says
   on screen which level just rang and whether the browser PLAYED or BLOCKED it. For the
   sound check with someone in the hall; without the parameter it renders nothing. It
   needs no key, and on anybody else's device it only rings that device. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = Ctor ? new Ctor() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Ask a suspended context to run, waiting at most `ms` (a refused resume can hang). */
async function wake(c: AudioContext, ms = 400): Promise<boolean> {
  if (c.state === "running") return true;
  try {
    await Promise.race([c.resume(), new Promise((r) => setTimeout(r, ms))]);
  } catch {
    /* refused: stays suspended */
  }
  return (c.state as string) === "running";
}

export type ChimeResult = "played" | "blocked" | "error";

/** Ring the chime once at `gain` (1 = full scale; see CHIME_GAIN). Never throws. */
export async function playChime(gain: number = CHIME_GAIN, strikes: ReadonlyArray<ChimeStrike> = chimeStrikes(null)): Promise<ChimeResult> {
  try {
    const c = audio();
    if (!c || !(await wake(c))) return "blocked";
    const out = c.createGain();
    out.gain.value = Math.max(0, Math.min(1, gain)) / CHIME_PEAK;
    out.connect(c.destination);
    const t0 = c.currentTime + 0.05;
    let last = t0;
    let lastOsc: OscillatorNode | null = null;
    for (const { at, hz } of strikes) {
      for (const [mult, amp] of CHIME_PARTIALS) {
        const start = t0 + at;
        const end = start + CHIME_DECAY_S / Math.sqrt(mult);
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = hz * mult;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(amp, start + CHIME_ATTACK_S);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g).connect(out);
        o.start(start);
        o.stop(end + 0.05);
        if (end >= last) { last = end; lastOsc = o; }
      }
    }
    /* Let go of the master gain when the LAST tone has stopped — on the audio clock
       (onended), not a wall-clock timer, which could cut the ring short if the audio
       clock started late (review, 2026-11-15). */
    if (lastOsc) lastOsc.onended = () => { try { out.disconnect(); } catch { /* gone */ } };
    return "played";
  } catch (e) {
    console.warn("[chime]", e instanceof Error ? e.message : e);
    return "error";
  }
}

/* THE SAME CHIME AS A CLIP, played by an <audio> element (2026-11-16). At the sound
   check the cricket Fire TV rang through Web Audio (above) once unlocked, but the badminton
   VIZIO stayed silent with its volume at 100. On 2026-11-10 that set's browser did play
   <audio> clips to the end, so this renders the identical ding-dong into a WAV (16-bit
   mono, 22.05 kHz, built here: no file to fetch) and plays it as media. One clip per level,
   cached as a blob: URL. `play()` resolving is "played"; NotAllowedError is "blocked". */
const clips = new Map<string, string>();
function chimeClip(gain: number, strikes: ReadonlyArray<ChimeStrike>): string {
  const g = Math.max(0, Math.min(1, gain));
  const id = `${g}|${strikes.map((s) => `${s.at}:${s.hz}`).join(",")}`;
  const hit = clips.get(id);
  if (hit) return hit;
  const rate = 22050;
  const tail = Math.max(...strikes.map((s) => s.at)) + CHIME_DECAY_S + 0.3;
  const n = Math.ceil(tail * rate);
  const buf = new Float32Array(n);
  for (const { at, hz } of strikes) {
    for (const [mult, amp] of CHIME_PARTIALS) {
      const len = CHIME_DECAY_S / Math.sqrt(mult);
      const k = Math.log(amp / 0.0001) / len;
      const i0 = Math.floor(at * rate);
      const w = (2 * Math.PI * hz * mult) / rate;
      for (let i = 0; i < Math.ceil(len * rate) && i0 + i < n; i++) {
        const t = i / rate;
        const env = t < CHIME_ATTACK_S ? amp * (t / CHIME_ATTACK_S) : amp * Math.exp(-k * (t - CHIME_ATTACK_S));
        buf[i0 + i] += env * Math.sin(w * i);
      }
    }
  }
  const scale = g / CHIME_PEAK;
  const bytes = new ArrayBuffer(44 + n * 2);
  const v = new DataView(bytes);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, buf[i] * scale)) * 32767, true);
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  clips.set(id, url);
  return url;
}

/** Ring the chime once as an <audio> clip at `gain`. Never throws. */
export async function playChimeClip(gain: number = CHIME_GAIN, strikes: ReadonlyArray<ChimeStrike> = chimeStrikes(null)): Promise<ChimeResult> {
  try {
    const a = new Audio(chimeClip(gain, strikes));
    a.volume = 1;
    await a.play();
    return "played";
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotAllowedError") return "blocked";
    console.warn("[chime clip]", e instanceof Error ? e.message : e);
    return "error";
  }
}

/** Has this set already rung for `key`? Memory first, then localStorage — shared by every
 *  page of the origin on the set and kept across reloads and tv-keeper's relaunches into a
 *  new page (review, 2026-11-15: sessionStorage is per page), so the same end never rings
 *  twice. Old claims are pruned as new ones are made. Storage that throws (private mode, a
 *  locked-down browser) just means memory only. */
const rung = new Set<string>();
function claim(key: string): boolean {
  if (rung.has(key)) return false;
  rung.add(key);
  try {
    if (localStorage.getItem(key)) return false;
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("chime:") && now - Number(localStorage.getItem(k)) > 2 * CHIME_WINDOW_MS) localStorage.removeItem(k);
    }
    localStorage.setItem(key, String(now));
  } catch {
    /* memory only */
  }
  return true;
}

/** A ring the browser refused gives its claim back, so the next second inside the window
 *  tries again — a context that starts a moment later (the cricket set's unlock press)
 *  still rings (review, 2026-11-15). Claim-before-play stays: two entries ending together
 *  must not both ring. */
function release(key: string): void {
  rung.delete(key);
  try { localStorage.removeItem(key); } catch { /* memory only */ }
}

const noSubscribe = () => () => {};
/** Is this page a PAIRED screen (a board key in the URL fragment or its storage)? */
function useKeyed(): boolean {
  return useSyncExternalStore(noSubscribe, () => readKey() !== null, () => false);
}

const ChimeSports = createContext<readonly string[]>([]);
/** The sports whose bookings are ANNOUNCED on this page (tv-screens.ts `announce`). */
const AnnounceSports = createContext<readonly string[]>([]);

/** Turns the chime on for these sports inside it. Empty = silent, and no audio is set up.

    ONLY ON A PAIRED SCREEN (review, 2026-11-15). /reception, /badminton and /cricket are
    public addresses; without this a phone or laptop with one open would ring at every
    TIME UP after one tap. Same rule as ReplayHandoff ("ONLY A PAIRED TV MOVES") and the
    heartbeat: no board key, no chime. */
const NONE: readonly string[] = [];
export function ChimeSportsProvider({ sports, announce, children }: { sports?: readonly string[]; announce?: readonly string[]; children: ReactNode }) {
  const keyed = useKeyed();
  const list = keyed && sports ? sports : NONE;
  /* The spoken announcements (2026-11-16): the same fence, a paired screen only. */
  const spoken = keyed && announce ? announce : NONE;
  return (
    <ChimeSports.Provider value={list}>
      <AnnounceSports.Provider value={spoken}>
        {(list.length > 0 || spoken.length > 0) && <AudioUnlock />}
        {children}
      </AnnounceSports.Provider>
    </ChimeSports.Provider>
  );
}

/** Play a recorded clip once (an announcement). Never throws. */
export async function playClipUrl(url: string): Promise<ChimeResult> {
  try {
    const a = new Audio(url);
    a.volume = 1;
    await a.play();
    return "played";
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotAllowedError") return "blocked";
    console.warn("[announce]", e instanceof Error ? e.message : e);
    return "error";
  }
}

/** What the announcer needs from an entry on the board (ReceptionBoard's Entry). */
type AnnounceEntry = {
  date?: string; from?: number; to?: number; brand: unknown;
  nudge?: { kind: "next" | "free"; endMs: number; courts: string[]; scan?: true };
};

const byLane = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b);
function dayAfter(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1, 12));
  return t.toISOString().slice(0, 10);
}

/* The announcer (2026-11-16, chime-pure SPOKEN ANNOUNCEMENTS). Called by SportBoard with its
   panel's NOW entries on every render. A 'free' nudge — and so the entry's sight of its end —
   goes away AT the end (courtNudges), so what each end will say is remembered as it is seen,
   on the board's 15 s tick, and the second ticker plays it when due. A later look replaces an
   earlier one: if a group books in after the end at the last minute, the nudge turns 'next'
   and the "ended" message is dropped for the TIME UP chime.

   ONE PLAN PER END INSTANT, FOLDED OVER EVERY ENTRY THAT ENDS THEN (review of the first
   browser run, 2026-11-16): keyed per entry, a lane with a group waiting overwrote a free
   lane's "ended" when both ended at 7 PM. Now the free private lanes are gathered, "ending"
   names all of them that show codes ("lanes 1 and 3"), and "ended" plays only when the
   lights line is true (zoneBusyAfter). */
export function useCourtAnnouncements(
  sport: string,
  now: readonly AnnounceEntry[],
  upNext: readonly AnnounceEntry[] = [],
  upcoming: readonly AnnounceEntry[] = [],
): void {
  const sports = useContext(AnnounceSports);
  const on = sports.includes(sport);
  const plan = useRef(new Map<number, Record<AnnounceKind, string[] | null>>());
  useEffect(() => {
    if (!on) return;
    const fresh = new Map<number, { ending: Set<string>; ended: Set<string>; endMin: number; date: string }>();
    for (const e of now) {
      const n = e.nudge;
      if (!n) continue;
      let f = fresh.get(n.endMs);
      if (!f) {
        f = { ending: new Set(), ended: new Set(), endMin: e.to ?? 0, date: e.date ?? "" };
        fresh.set(n.endMs, f);
      }
      if (!e.brand && n.kind === "free") {
        for (const c of n.courts) {
          f.ended.add(c);
          if (n.scan) f.ending.add(c);
        }
      }
    }
    const ahead = [...upNext, ...upcoming];
    for (const [endMs, f] of fresh) {
      const before = plan.current.get(endMs);
      const busy = zoneBusyAfter(f.endMin, f.date, now, ahead, f.date ? dayAfter(f.date) : "");
      plan.current.set(endMs, {
        // `scan` is true only while the codes are drawn; once seen, kept for its window.
        ending: f.ending.size ? [...f.ending].sort(byLane) : f.ended.size ? before?.ending ?? null : null,
        ended: f.ended.size && !busy ? [...f.ended].sort(byLane) : null,
      });
    }
  }, [on, now, upNext, upcoming]);
  const ms = useTick(secondTicker);
  useEffect(() => {
    if (!on || !ms) return;
    for (const [endMs, says] of plan.current) {
      if (ms - endMs > 2 * CHIME_WINDOW_MS) {
        plan.current.delete(endMs);
        continue;
      }
      for (const kind of ["ending", "ended"] as const) {
        const lanes = says[kind];
        if (!lanes || !announceDue(kind, endMs - ms)) continue;
        const url = announceClip(sport, kind, lanes);
        if (!url) continue;
        const key = announceKey(kind, endMs);
        if (!claim(key)) continue;
        void playClipUrl(url).then((r) => {
          if (r === "played") return;
          release(key);
          console.warn(`[announce] ${kind} ${sport}: ${r}`);
        });
      }
    }
  }, [on, ms, sport]);
}

/** The countdown's hook: rings once when this entry's TIME UP begins, if its sport rings
 *  on this page. `faceKind` and `nowMs` are what the countdown drew this second. */
export function useTimeUpChime(sport: string, endMs: number, faceKind: string, nowMs: number, privateHire: boolean): void {
  const sports = useContext(ChimeSports);
  /* `privateHire`: the ending booking is somebody's own hire, not a partner's session
     (2026-11-16, "only for private bookings, not PBA"). A partner never claims the end
     instant, so a private booking ending at the same moment still rings. */
  const on = privateHire && chimesFor(sports, sport);
  useEffect(() => {
    if (!on || !nowMs || !chimeDue(faceKind, nowMs - endMs)) return;
    const key = chimeKey(endMs);
    if (!claim(key)) return;
    /* The sport's own sound, played the way this set can (chimeVia: Silk the tone, the
       VIZIOs the clip — 2026-11-16 sound check). */
    const strikes = chimeStrikes(sport);
    const play = chimeVia(navigator.userAgent) === "tone" ? playChime : playChimeClip;
    void play(CHIME_GAIN, strikes).then((r) => {
      if (r === "played") return;
      release(key);
      console.warn(`[chime] TIME UP ${sport}: ${r}`);
    });
  }, [on, sport, endMs, faceKind, nowMs]);
}

/** Creates and resumes the audio inside the first key press or click (see UNLOCKING). */
function AudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      const c = audio();
      if (c && c.state !== "running") void c.resume().catch(() => {});
    };
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("click", unlock, true);
    return () => {
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("click", unlock, true);
    };
  }, []);
  return null;
}

/** ?chimetest=<until> — the sound check (see the header). Renders nothing without a live
 *  deadline (chime-pure testUntil): after it, a set left on the test URL is silent. */
export function ChimeTest() {
  const [state, setState] = useState<{ on: boolean; n: number; level: number; result: string; done: boolean; via: string }>(
    { on: false, n: 0, level: 0, result: "", done: false, via: "" },
  );
  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URL(location.href).searchParams;
    } catch {
      return;
    }
    const until = testUntil(params.get("chimetest"), Date.now());
    if (until === null) return;
    const pinned = Number(params.get("chimelevel")) || null;
    /* &via=clip: ring the <audio> clip instead of Web Audio (2026-11-16, for the badminton
       VIZIO, silent through Web Audio at the sound check). */
    const via = params.get("via");
    const clip = via === "clip" || (via !== "tone" && chimeVia(navigator.userAgent) === "clip");
    /* &sound=Badminton|Cricket|Squash: that sport's pattern (2026-11-16). */
    const strikes = chimeStrikes(params.get("sound"));
    /* &say=<clip>: play a recorded announcement instead, e.g. cricket-ending-1-3 or
       cricket-ended (2026-11-16). Only a name of the form below, from /tv/announce/. */
    const say = params.get("say");
    const sayUrl = say && /^[a-z]+-(ended|ending(-\d)+)$/.test(say) ? `/tv/announce/${say}.mp3` : null;
    const started = Date.now();
    let n = 0;
    let stopped = false;
    const ring = async () => {
      if (stopped) return;
      if (Date.now() - started >= CHIME_TEST_FOR_MS || Date.now() >= until) {
        stopped = true;
        setState((s) => ({ ...s, done: true }));
        return;
      }
      const { level, gain } = testLevel(n, pinned);
      const result = sayUrl ? await playClipUrl(sayUrl) : clip ? await playChimeClip(gain, strikes) : await playChime(gain, strikes);
      setState({ on: true, n: n + 1, level, result, done: false, via: sayUrl ? (say ?? "").toUpperCase() : clip ? "CLIP" : "TONE" });
      n += 1;
    };
    const show = setTimeout(() => setState((s) => ({ ...s, on: true })), 0);
    const first = setTimeout(ring, 2000);
    // An announcement runs up to ~15 s: give it room before the next.
    const every = setInterval(ring, sayUrl ? 25_000 : CHIME_TEST_EVERY_MS);
    return () => {
      stopped = true;
      clearTimeout(show);
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);
  if (!state.on) return null;
  return (
    <>
      <AudioUnlock />
      <div
        style={{
          position: "fixed", top: "2vh", left: "50%", transform: "translateX(-50%)", zIndex: 2147483000,
          background: "#FFE6A6", color: "#0B1623", borderRadius: "1vh", padding: "1.2vh 2.4vw",
          font: "600 3.2vh/1.2 system-ui, sans-serif", textAlign: "center", boxShadow: "0 0 3vh rgba(0,0,0,0.6)",
        }}
      >
        {state.done
          ? "CHIME TEST OVER"
          : state.n === 0
            ? "CHIME TEST — first ring in 2 s"
            : `CHIME TEST (${state.via}) — LEVEL ${state.level} of ${CHIME_TEST_LEVELS.length} — ${state.result.toUpperCase()} — ring ${state.n}`}
      </div>
    </>
  );
}
