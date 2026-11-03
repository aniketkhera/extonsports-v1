# tv-fit — does the extend panel fit the badminton TV?

Decision 2 of orangish-app `docs/court-extend.md` (Aniket, 2026-11-02): *"just make sure it
fits the TV"*. This measures the real panel (`app/reception/ExtendPanel.tsx`) on the real
`/badminton` page, the way the 2026-11-02 mock-up check did (`mockups/tvb.mjs` + `inject-b.js`
in `~/.claude/plans/court-extend-tv/`), which measured a mock's DOM instead.

**Re-run it on any change to the panel, the code text, SportBoard's `SCALE` or `BookingBand`.**

```
npm run build
npm run start -- --port 3123                       # or the "extonsports-start" launch config
node scripts/tv-fit/fit.mjs --out <dir>            # every face, 1280x720@1.5 and 1920x1080@1
python scripts/tv-fit/decode.py <dir>              # every code read back from the screenshots
```

- **Playwright and `qrcode` are not this site's dependencies.** `fit.mjs` loads them from
  `TV_FIT_FROM` (default `C:/Users/rkher/orangish-app`): a folder whose `node_modules` has both.
  orangish-app's `qrcode@1.5.4` is the encoder the platform draws the TV's codes with, and
  `fit.mjs` walks it exactly as `lib/court-extend-code.ts` `extendQr` does.
- `decode.py` needs OpenCV (`pip install opencv-python`).
- The page gets a screen key in the fragment, so it reads the **keyed** court board, which is
  routed to each scenario's answer. The clock is frozen; the border pulse is held at its
  brightest.

## What a face must do

`scenarios.mjs` holds 28 scenarios: the six measured on 2026-11-02 (`one`, `three`, `edge`,
`late`, `twoGroups`, `threeGroups`) and every face §10.9 listed as never measured:

- red from the end to the close;
- PAYMENT IN PROGRESS;
- the move face before payment;
- MOVE TO COURT 3 after it;
- AGREED RATE.

A face fails if:

- anything inside the panel lies outside its padding;
- any text is cut;
- the panel leaves its cell;
- anything in the NOW column runs past the column;
- the band still shows its booking QR beside the panel.

Every code must decode to exactly the URL its feed carried.

**The gate** runs after the faces. It sends the same answer, offers and all, to `/cricket`,
`/reception`, `/vestibule` and an unkeyed `/badminton`. None may draw a panel or say SCAN TO
EXTEND, and each keeps its band as before.

## Results, 2026-11-03 (branch `feat/court-extend-tv-panel`)

Run against `next start` of this branch in headless Chromium (Playwright 1.60).

- **All 56 faces fit:** 28 scenarios × 2 sizes. **Every code decodes**, and all four gates pass.
- **Panel size:** 575 × 465 CSS px at 1280×720 @1.5, and 863 × 698 at 1920×1080. The mock-up
  measured 864 × 700.

Codes and headroom at 1280×720 @1.5. A 55" set is 121.8 cm across these 1280 CSS px. Headroom is
the room left under the face's last line, at its natural height:

| Layout | Code | On the 55" | Module | Headroom |
|---|---|---|---|---|
| `one` | 157 CSS px | 15.0 cm | 4.5 mm | 23 px |
| `multi` | 137 CSS px | 13.0 cm | 3.9 mm | 29 px (3 courts) to 68 px (2) |
| `cards` | 100 CSS px | 9.5 cm | 2.9 mm | 39 px |
| `cards-one-code` | 107 CSS px | 10.2 cm | 3.1 mm | −25 px* |

\* The three cards give up their vertical padding to the codes, as on the approved mock-up
(`tvb-threeGroups.png`). Nothing leaves its card, and every code decodes.

**What this does not prove:**

- **That a phone scans these codes at the court.** Only screenshots were decoded. A scan from the
  nearest court line is rollout step 4.
- **The badminton set's own viewport.** 1280×720 @1.5 was measured on the reception set, which
  is the same model. The audio test page prints the badminton set's own (§11.2).
- **That the pulse is smooth on the VIZIO.** The pulse is an opacity change on an overlay; it has
  not been watched on the set.
