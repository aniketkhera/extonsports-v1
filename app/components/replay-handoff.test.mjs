/* When the badminton and cricket TVs hand over to the N95's replay screen (2026-11-04).
   Run: npm test. node:test on the .ts source directly, like the other tests here. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { academyOn, handoffUrl } from "./replay-handoff-pure.ts";

const COURTS = [
  { id: "b1", sport: "Badminton" }, { id: "b2", sport: "Badminton" },
  { id: "c1", sport: "Cricket" }, { id: "s1", sport: "Squash" },
];
const feed = (blocks) => ({ courts: COURTS, blocks });
const D = "2026-11-04";
const pba = { date: D, courtId: "b2", from: 1050, to: 1170, org: "philadelphia-badminton", session: "junior-coaching" };

test("a PBA junior block on a badminton court turns the badminton TV over, inside its hours only", () => {
  assert.equal(academyOn(feed([pba]), "badminton", D, 1050), true);
  assert.equal(academyOn(feed([pba]), "badminton", D, 1169), true);
  assert.equal(academyOn(feed([pba]), "badminton", D, 1170), false);
  assert.equal(academyOn(feed([pba]), "badminton", D, 1049), false);
  assert.equal(academyOn(feed([pba]), "cricket", D, 1100), false);
});

test("open play, another day, another partner or a squash court never count", () => {
  assert.equal(academyOn(feed([{ ...pba, session: "open-play" }]), "badminton", D, 1100), false);
  assert.equal(academyOn(feed([{ ...pba, date: "2026-11-05" }]), "badminton", D, 1100), false);
  assert.equal(academyOn(feed([{ ...pba, org: "ccca" }]), "badminton", D, 1100), false);
  assert.equal(academyOn(feed([{ ...pba, courtId: "s1", org: "squashtigers" }]), "badminton", D, 1100), false);
  assert.equal(academyOn(feed([{ ...pba, courtId: "c1", org: "ccca" }]), "cricket", D, 1100), true);
});

test("true edges beat the half-hour grid", () => {
  const b = { ...pba, exactFrom: 1065, exactTo: 1155 };
  assert.equal(academyOn(feed([b]), "badminton", D, 1060), false);
  assert.equal(academyOn(feed([b]), "badminton", D, 1065), true);
  assert.equal(academyOn(feed([b]), "badminton", D, 1160), false);
});

test("no feed is no session", () => {
  assert.equal(academyOn(null, "badminton", D, 1100), false);
  assert.equal(academyOn({}, "badminton", D, 1100), false);
});

test("the hand-off carries the launch tag in the query and the key in the fragment", () => {
  assert.equal(handoffUrl("cricket", "KEY", "1793803508963"), "http://10.1.10.124:8090/tv/cricket?k=1793803508963#k=KEY");
  assert.equal(handoffUrl("badminton", "KEY", null), "http://10.1.10.124:8090/tv/badminton#k=KEY");
});
