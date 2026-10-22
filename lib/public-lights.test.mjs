/* What the public relay forwards of the lights (lib/public-lights.ts), 2026-10-21.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts source; Node strips the types itself)

   Aniket, 2026-10-21: "show the real on/off state on the public page too". So the
   bridge's live state now reaches extonsports.com/reception and /vestibule without a
   TV key. These tests pin that it arrives, and that it arrives as an ALLOW-LIST: per
   zone a name, on/off and an override's end, nothing else, and only for a sport whose
   lights are automated. A bad bridge costs only the live state; a bad window still
   withholds everything, because a dropped window could say LIGHTS OFF over a lit
   court. */
import { test } from "node:test";
import assert from "node:assert/strict";

const { publicLights } = await import("./public-lights.ts");

const base = () => ({
  sports: ["badminton", "cricket", "squash"],
  now: "2026-10-22T00:13:15.840Z",
  windows: [{ zone: "badminton", on_at: "2026-10-21T21:15:00.000Z", off_at: "2026-10-22T01:45:00.000Z" }],
  bridge: {
    reported_at: "2026-10-22T00:13:00.220Z",
    zones: [
      { zone: "badminton", on: true, override: null, last_transmit_at: "2026-10-22T00:10:02.166Z", last_error_at: null },
      { zone: "squash", on: true, override: { on: true, until: "2026-10-22T00:50:52.846Z" } },
    ],
  },
});

test("the live state comes through: on/off and an override with its end", () => {
  const out = publicLights(base());
  assert.deepEqual(out.bridge, {
    reported_at: "2026-10-22T00:13:00.220Z",
    zones: [
      { zone: "badminton", on: true, override: null },
      { zone: "squash", on: true, override: { on: true, until: "2026-10-22T00:50:52.846Z" } },
    ],
  });
});

test("nothing outside the allow-list: no transmit or error times, no extra keys", () => {
  const raw = base();
  raw.bridge.secret = "x";
  raw.bridge.zones[0].note = "who switched it";
  const text = JSON.stringify(publicLights(raw));
  assert.doesNotMatch(text, /last_transmit_at|last_error_at|secret|who switched/);
});

test("a zone for a sport whose lights are not automated is dropped", () => {
  const raw = base();
  raw.bridge.zones.push({ zone: "lobby", on: true, override: null });
  assert.deepEqual(publicLights(raw).bridge.zones.map((z) => z.zone), ["badminton", "squash"]);
});

test("a bad bridge costs only the live state: bridge null, the schedule still served", () => {
  for (const bridge of [null, "on", { reported_at: "not a time", zones: [] }, { reported_at: "2026-10-22T00:13:00Z" }]) {
    const out = publicLights({ ...base(), bridge });
    assert.equal(out.bridge, null);
    assert.equal(out.windows.length, 1);
  }
});

test("an override that does not parse is no override; a non-boolean on is unknown", () => {
  const raw = base();
  raw.bridge.zones = [
    { zone: "squash", on: "yes", override: { on: true, until: "soon" } },
    { zone: "cricket", on: false, override: { on: "on", until: "2026-10-22T00:50:52Z" } },
  ];
  assert.deepEqual(publicLights(raw).bridge.zones, [
    { zone: "squash", on: null, override: null },
    { zone: "cricket", on: false, override: null },
  ]);
});

test("a window that does not parse still withholds the lights altogether", () => {
  const raw = base();
  raw.windows.push({ zone: "squash", on_at: "nope", off_at: "2026-10-22T01:45:00Z" });
  assert.equal(publicLights(raw), undefined);
});
