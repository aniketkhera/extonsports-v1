/* The court 5-pack in My bookings, 2026-10-21 — a ONE-TEST STUB written by S1 (the
   foundation) so `npm test` lists every pack file from the start. S3 (the My bookings
   list, orangish-app docs/court-packs.md §14) owns this file and replaces the stub with
   §13's cases: PackCard and BookingRow pack wording; ?cancel=.

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

const C = await import("./copy.ts");

test("stub (S3 replaces): a pack row says what paid for it, in credits, never money", () => {
  assert.equal(C.rowPaidWithPack("Badminton 5-pack", 1), "Paid with Badminton 5-pack · 1 credit");
  assert.doesNotMatch(C.rowPaidWithPack("Badminton 5-pack", 2), /\$/);
});
