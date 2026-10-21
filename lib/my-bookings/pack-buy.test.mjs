/* The court 5-pack's buy pages and entry links, 2026-10-21 — a ONE-TEST STUB written by
   S1 (the foundation) so `npm test` lists every pack file from the start. S4 (buy pages +
   entry links, orangish-app docs/court-packs.md §14) owns this file and replaces the stub
   with §13's cases: PACKS_LIVE gates every entry link; /my-bookings/pack/* stays under the
   private headers.

   Run:  npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

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

const B = await import("../booking.ts");

test("stub (S4 replaces): the 5-pack entry links ship switched OFF", () => {
  // design §12 step 8: PACKS_LIVE flips only after the owner's live test and the key-box
  // revoke (Aniket, 2026-10-20).
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(B.PACK_PATH, "/5-pack");
});
