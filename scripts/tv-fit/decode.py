"""Decode every code fit.mjs drew, from its screenshots (docs/court-extend.md §10.9: "decode
every code"). The 2026-11-02 fit check decoded screenshots too; no phone has scanned a code at
the court yet (§15).

    python scripts/tv-fit/decode.py <out dir of fit.mjs>

Needs OpenCV (pip install opencv-python). Each code is cropped from the PNG at the rectangle the
page reported (its white padding included), given a wide white margin, and read with OpenCV's
QR detector. A face passes when the codes read back are exactly the texts its feed carried.
Exits 1 on any miss."""
import json, pathlib, sys
import cv2

out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
report = json.loads((out / "report.json").read_text(encoding="utf-8"))
det = cv2.QRCodeDetector()
misses = 0
for face, m in report.items():
    if not m.get("codes"):
        continue
    img = cv2.imread(m["png"])
    dpr = float(m["viewport"].rsplit("@", 1)[1])
    got = []
    for c in m["codes"]:
        x, y, w, h = (round(v * dpr) for v in (c["x"], c["y"], c["w"], c["h"]))
        crop = img[max(0, y):y + h, max(0, x):x + w]
        crop = cv2.copyMakeBorder(crop, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        text, _, _ = det.detectAndDecode(crop)
        got.append(text or "")
    ok = sorted(got) == sorted(m["expect"])
    misses += not ok
    print(f"{'ok  ' if ok else 'MISS'} {face:40} {len(got)} codes" + ("" if ok else f"\n     read {got}\n     sent {m['expect']}"))
print("every code decodes" if not misses else f"{misses} faces with a code that does not decode")
sys.exit(1 if misses else 0)
