/* The keyless relay never forwards `extend` (lib/court-slots-relay.ts), 2026-11-03.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; Node strips the types itself)

   The platform's KEYED court board carries `extend` for the badminton TV: live codes
   that hold courts and open a Checkout for somebody's booking, with the booking's courts,
   end and price (orangish-app docs/court-extend.md §7.4). This relay is the site's
   KEYLESS path — cached, world-readable, behind extonsports.com/calendar (emailed to a
   mailing list) and the unkeyed /badminton. It must never pass `extend` on, even if the
   upstream sends it one day: that is what makes keying the TV a prerequisite whose
   failure is safe (an unkeyed TV shows today's board and no code). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

/* "next/server" has no exports map; the route imports it the bundler's way (see
   app/board/board-lib.test.mjs). */
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? ".ts" : ".js"), context);
    }
  },
});

const { relaySlots, EMPTY } = await import("./court-slots-relay.ts");

const extend = {
  now: "2026-11-08T18:53:00.000Z",
  offers: [{
    key: "abcdefgh0123", layout: "one", state: "open", date: "2026-11-08", end: 840,
    endsAt: "2026-11-08T19:00:00.000Z", opensAt: "2026-11-08T18:50:00.000Z", closesAt: "2026-11-08T19:05:00.000Z",
    basis: "published", courts: ["c2"], qr: null,
    lengths: {
      m30: { available: true, maxCourts: 1, perCourt: 2250, totals: [2250], moves: [], why: null, qr: { size: 33, d: "M2 2h7v1h-7z" } },
      m60: { available: true, maxCourts: 1, perCourt: 4500, totals: [4500], moves: [], why: null, qr: { size: 33, d: "M2 2h7v1h-7z" } },
    },
  }],
  moves: [{ date: "2026-11-08", at: 840, from: "c2", to: "c3" }],
};
const lights = {
  sports: ["badminton"], now: "2026-11-08T18:53:00.000Z",
  windows: [{ zone: "badminton", on_at: "2026-11-08T17:45:00.000Z", off_at: "2026-11-08T19:15:00.000Z" }],
  bridge: null,
};
/** An upstream answer carrying everything the keyed board can: `extend`, names, extra keys. */
const upstream = () => ({
  timeZone: "America/New_York",
  days: ["2026-11-08"],
  courts: [{ id: "c2", sport: "Badminton", sportId: "s", name: "BADMINTON 2", label: "2", extend }],
  blocks: [{ date: "2026-11-08", courtId: "c2", from: 780, to: 840, kind: "booking", who: "Jane Doe", extend, offer: extend.offers[0] }],
  lights,
  extend,
  offers: extend.offers,
});

/** Every key at any depth of a JSON value. */
const keysDeep = (v, out = new Set()) => {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.add(k); keysDeep(x, out); }
  return out;
};

test("`extend` is dropped wherever the upstream puts it, with the lights and without", () => {
  for (const wantLights of [false, true]) {
    const out = relaySlots(upstream(), wantLights);
    const keys = keysDeep(out);
    for (const k of ["extend", "offers", "offer", "qr", "d", "key", "who", "lengths", "moves", "totals"]) {
      assert.equal(keys.has(k), false, `${k} never forwarded (lights ${wantLights})`);
    }
    assert.deepEqual(Object.keys(out).sort(), wantLights ? ["blocks", "courts", "days", "lights", "timeZone"] : ["blocks", "courts", "days", "timeZone"]);
    assert.deepEqual(Object.keys(out.courts[0]).sort(), ["id", "label", "name", "sport", "sportId"]);
    assert.deepEqual(Object.keys(out.blocks[0]).sort(), ["courtId", "date", "from", "kind", "to"]);
    assert.equal(JSON.stringify(out).includes("app.orangish.io/x/"), false);
    assert.equal(JSON.stringify(out).includes("M2 2h7"), false);
  }
});

test("not the shape: the empty answer, never a pass-through", () => {
  assert.deepEqual(relaySlots({ extend }, true), EMPTY);
  assert.deepEqual(relaySlots(null, false), EMPTY);
  assert.deepEqual(relaySlots(extend, false), EMPTY);
});

test("the route serves the relay's rebuild and nothing else", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => upstream() }));
  const R = await import("../app/api/court-slots/route.ts");
  for (const q of ["?days=7", "?lights=1", "?days=21&lights=1"]) {
    const body = await (await R.GET(new Request(`https://extonsports.com/api/court-slots${q}`))).json();
    assert.equal(keysDeep(body).has("extend"), false, q);
    assert.equal(keysDeep(body).has("who"), false, q);
  }
  // And it names nothing of the offers itself: the allow-list is all it returns.
  const src = readFileSync(new URL("../app/api/court-slots/route.ts", import.meta.url), "utf8");
  assert.match(src, /return NextResponse\.json\(relaySlots\(await res\.json\(\), wantLights\)\)/);
  assert.ok(!/\.extend\b|['"]extend['"]/.test(src), "the route never touches `extend`");
});
