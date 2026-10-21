/* The court 5-pack's booking pages, 2026-10-21 — a ONE-TEST STUB written by S1 (the
   foundation) so `npm test` lists every pack file from the start. S2 (pack booking pages,
   orangish-app docs/court-packs.md §14) owns this file and replaces the stub with §13's
   cases: the start route parks and 303s; the `next` allow-list; new API routes call
   refuseCrossSite; no "use client" file imports platform.ts.

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

const S = await import("./session.ts");

test("stub (S2 replaces): a sign-in's `next` is /my-bookings or /my-bookings/pack, never a URL from a request", () => {
  assert.equal(S.nextPathOf("/my-bookings/pack"), "/my-bookings/pack");
  assert.equal(S.nextPathOf("https://evil.example/"), "/my-bookings");
});
