"""Records the cricket TV's spoken announcements (2026-11-16).

    python scripts/announce/make_clips.py

Writes public/tv/announce/cricket-ending-<lanes>.mp3 (one per non-empty set of lanes 1-3) and
cricket-ended.mp3: the soft three-tone chime, a short pause, then Microsoft's neural voice Jenny
(en-US-JennyNeural, through the free `edge-tts` package: pip install edge-tts). Needs ffmpeg on
PATH or FFMPEG=<path>. The wording, the voice and "one chime, softer" are Aniket's, at the
on-site sound check on 2026-11-16; the rules for when each plays are app/board/chime-pure.ts
(SPOKEN ANNOUNCEMENTS), and these constants copy its chime (CHIME_STRIKES, CHIME_PARTIALS,
CHIME_ATTACK_S, CHIME_DECAY_S, CHIME_GAIN) — change both together.

Only the fixed wording below is sent to the speech service: no name, no booking, nothing
personal. Re-run it after changing a line, and commit the mp3s it writes.
"""
import asyncio
import math
import os
import shutil
import struct
import subprocess
import tempfile
import wave

import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "tv", "announce")
VOICE = "en-US-JennyNeural"
RATE = 24000

# app/board/chime-pure.ts, the cricket chime as it rings on the TV.
STRIKES = [(0, 392), (0.35, 523.25), (0.7, 659.25)]
PARTIALS = [(1, 1), (2, 0.12), (3, 0.03)]
ATTACK_S = 0.02
DECAY_S = 1.8
GAIN = 0.28

LANES = ["1", "2", "3"]
ENDED = ("Your booking has ended. The lights will turn off automatically in 15 minutes. "
         "If you are the last people in the building, please see your email for the lockbox code, "
         "and lock up the place. Thanks for playing!")


def lane_phrase(labels):
    if len(labels) == 1:
        return f"lane {labels[0]}"
    return f"lanes {', '.join(labels[:-1])} and {labels[-1]}"


def ending(labels):
    return (f"Your cricket {lane_phrase(labels)} booking is ending in 5 minutes. "
            "A free slot is available. Scan the QR code on the screen to extend your time.")


def lane_sets():
    sets = []
    for m in range(1, 1 << len(LANES)):
        sets.append([l for i, l in enumerate(LANES) if m & (1 << i)])
    return sorted(sets, key=lambda s: (len(s), ",".join(s)))


def chime_wav(path):
    peak = sum(a for _, a in PARTIALS)
    tail = max(a for a, _ in STRIKES) + DECAY_S + 0.2
    n = int(math.ceil(tail * RATE))
    buf = [0.0] * n
    for at, hz in STRIKES:
        for mult, amp in PARTIALS:
            length = DECAY_S / math.sqrt(mult)
            k = math.log(amp / 0.0001) / length
            i0 = int(at * RATE)
            w = 2 * math.pi * hz * mult / RATE
            for i in range(int(math.ceil(length * RATE))):
                if i0 + i >= n:
                    break
                t = i / RATE
                env = amp * (t / ATTACK_S) if t < ATTACK_S else amp * math.exp(-k * (t - ATTACK_S))
                buf[i0 + i] += env * math.sin(w * i)
    scale = GAIN / peak
    with wave.open(path, "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * scale)) * 32767)) for s in buf))


async def main():
    ff = os.environ.get("FFMPEG") or shutil.which("ffmpeg")
    if not ff:
        raise SystemExit("ffmpeg not found: put it on PATH or set FFMPEG")
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        chime = os.path.join(tmp, "chime.wav")
        chime_wav(chime)
        jobs = [(f"cricket-ending-{'-'.join(s)}", ending(s)) for s in lane_sets()] + [("cricket-ended", ENDED)]
        for name, text in jobs:
            speech = os.path.join(tmp, f"{name}.mp3")
            # The free service drops connections now and then (seen 2026-11-16): retry.
            for attempt in range(6):
                try:
                    await edge_tts.Communicate(text, VOICE, rate="-5%").save(speech)
                    break
                except Exception as e:  # noqa: BLE001 — any network error is worth a retry
                    if attempt == 5:
                        raise
                    print(f"  retry {attempt + 1} for {name}: {type(e).__name__}")
                    await asyncio.sleep(2 + attempt * 2)
            out = os.path.join(OUT, f"{name}.mp3")
            # The voice to -16 LUFS on its own; the chime keeps its own (softer) level ahead of it.
            subprocess.run([
                ff, "-y", "-loglevel", "error", "-i", chime, "-i", speech, "-filter_complex",
                f"[0:a]aresample={RATE},apad=pad_dur=0.35[c];[1:a]aresample={RATE},loudnorm=I=-16:TP=-1.5,aresample={RATE}[s];"
                "[c][s]concat=n=2:v=0:a=1[o]",
                "-map", "[o]", "-ac", "1", "-ar", str(RATE), "-b:a", "64k", out,
            ], check=True)
            print(f"{name}.mp3  {text}")


if __name__ == "__main__":
    asyncio.run(main())
