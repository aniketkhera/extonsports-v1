/* When the badminton and cricket TVs hand over to the N95's replay screen (2026-11-04).
   Run: npm test. node:test on the .ts source directly, like the other tests here. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { handoffUrl, isOn, statusUrl } from "./replay-handoff-pure.ts";

test("only an explicit on: true hands a TV over", () => {
  assert.equal(isOn({ on: true }), true);
  for (const b of [{ on: false }, { on: "true" }, { on: 1 }, {}, null, undefined, "on", [true]]) {
    assert.equal(isOn(b), false, JSON.stringify(b));
  }
});

test("the status question names Exton and the sport, nothing else", () => {
  assert.equal(statusUrl("https://app.orangish.io", "cricket"),
    "https://app.orangish.io/api/public/replay-status?location=f9d70a9d-ca32-4dc3-877e-83815a45bb5f&sport=cricket");
});

test("the hand-off carries the launch tag in the query and the key in the fragment", () => {
  assert.equal(handoffUrl("cricket", "KEY", "1793803508963"), "http://10.1.10.124:8090/tv/cricket?k=1793803508963#k=KEY");
  assert.equal(handoffUrl("badminton", "KEY", null), "http://10.1.10.124:8090/tv/badminton#k=KEY");
});
