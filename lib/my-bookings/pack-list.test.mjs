/* The court 5-pack in My bookings, 2026-10-21 (S3, orangish-app docs/court-packs.md §8.3,
   §13 and §14).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court 5-pack. These
   RENDER the components rather than grep them: a load hook below transpiles .tsx with the
   repo's own TypeScript, `next/headers` is a stub that reads globalThis.__test, and
   global fetch is stubbed, so no call leaves this machine. What they pin, each of which
   `tsc` would wave through when broken:
     • a pack row says what paid for it in CREDITS — never "$0.00", never "refund";
     • a pack row inside the cutoff says "Under 24 hours — call …" with a tel: link;
     • a desk-cancelled pack row says the club cancelled it;
     • the pack cards sit above the list, and only a usable pack offers "Book a court with
       my pack", to the app's form in pack mode for that pack's sport;
     • ?cancel=<seriesId> (the link in the pack confirmation email) opens THAT row's cancel
       sheet and no other, and only on a row that can still be cancelled;
     • "Your credit keeps your pack's date" is said only when it is true: the pack is
       known for certain and its 60 days have started (design §3).
     • card rows read exactly as they did before packs. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ── the harness: .tsx through TypeScript, "@/" from the repo root, Next stubbed ── */

const stub = (src) => "data:text/javascript," + encodeURIComponent(src);
const STUBS = {
  // Pages and routes read cookies and headers from here; each test sets globalThis.__test.
  "next/headers": stub(`
    export async function cookies() {
      const jar = globalThis.__test?.cookies ?? {};
      return { get: (n) => (Object.hasOwn(jar, n) ? { name: n, value: jar[n] } : undefined) };
    }
    export async function headers() { return new Headers(globalThis.__test?.headers ?? {}); }`),
  // BookingRow refreshes the server page after a cancel (review UI-1); a render never calls it.
  "next/navigation": stub(`
    export function usePathname() { return globalThis.__test?.pathname ?? "/"; }
    export function useRouter() { return { refresh() {}, push() {}, replace() {}, back() {}, forward() {}, prefetch() {} }; }`),
  // next/link is CommonJS whose component is exports.default; Node's ESM default import
  // would hand the components the whole exports object.
  "next/link": stub(`import m from ${JSON.stringify(pathToFileURL(join(ROOT, "node_modules/next/link.js")).href)};
    export default m.default ?? m;`),
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };
    const spec = specifier.startsWith("@/") ? pathToFileURL(join(ROOT, specifier.slice(2))).href : specifier;
    try {
      return nextResolve(spec, context);
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(spec)) throw err;
      if (!/^(\.{1,2}\/|file:)/.test(spec)) return nextResolve(spec + ".js", context);
      for (const ext of [".ts", ".tsx"]) {
        try {
          return nextResolve(spec + ext, context);
        } catch {
          /* next extension */
        }
      }
      throw err;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) {
      return { format: "module", source: "export default new Proxy({}, { get: (_, k) => String(k) });", shortCircuit: true };
    }
    if (!url.startsWith("file:") || !url.endsWith(".tsx")) return nextLoad(url, context);
    const file = fileURLToPath(url);
    const out = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  },
});

// platform.ts reads its base URL once, at load; the relay secret on every call.
process.env.ORANGISH_API_BASE = "https://platform.test";
delete process.env.EXTON_RELAY_SECRET;

const { createElement: h } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const V = await import("./view.ts");
const C = await import("./copy.ts");
const B = await import("../booking.ts");
const G = await import("./guard.ts");

const comp = async (p) => (await import(`../../app/my-bookings/${p}`)).default;

/** The visible text of rendered markup, entities decoded, whitespace collapsed. */
function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:a|span|b|strong|em)\b[^>]*>/g, "") // inline: no gap ("call <a>484…</a>.")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
const hrefs = (html) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const count = (s, needle) => s.split(needle).length - 1;

/* ── fixtures: everything goes through view.ts first, as on the real page ─── */

const PHONE = "484-252-2523";
const SPORT = "bfff160c-1111-4c2b-9e1f-0a1b2c3d4e5f";
const SQUASH = "3dda7884-2222-4c2b-9e1f-0a1b2c3d4e5f";
const SERIES = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
const SERIES_2 = "4a2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e60";
const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21);

const ROW = {
  seriesId: SERIES,
  sport: "Badminton",
  whenText: "Tue, Oct 27, 6:00 PM–7:00 PM",
  startsAt: "2026-10-27T22:00:00.000Z",
  cancelBy: "2026-10-26T22:00:00.000Z",
  cancelByText: "Mon, Oct 26, 6:00 PM",
  courts: ["BADMINTON 1"],
  amountPaidCents: 4500,
  status: "active",
  cancellable: true,
  blockedReason: null,
  refundedCents: null,
};
const PACK_ROW = { ...ROW, amountPaidCents: 0, paidWith: "pack", credits: 1, packName: "Badminton 5-pack" };

const PACK = {
  ref: "PK-ABC123",
  sport: "Badminton",
  sportId: SPORT,
  name: "Badminton 5-pack",
  creditsTotal: 5,
  creditsLeft: 2,
  creditsBooked: 1,
  status: "active",
  validUntil: "2026-11-29",
  validUntilText: "Nov 29",
  clock: "started",
  clockText: "60 days from your first game on Sep 30",
  unusedUntilText: "Oct 1, 2027",
  uses: [
    { whenText: "Tue, Oct 27, 6:00 PM–7:00 PM", credits: 1, use: "upcoming" },
    { whenText: "Thu, Oct 15, 7:00 PM–8:00 PM", credits: 1, use: "played" },
    { whenText: "Sun, Oct 11, 9:00 AM–10:00 AM", credits: 1, use: "returned" },
    { whenText: "Wed, Sep 30, 7:00 PM–8:00 PM", credits: 1, use: "played" },
  ],
};

function listView(over = {}) {
  const v = V.toView({
    club: { name: "Exton Sports Center", phone: PHONE },
    email: "a•••@example.com",
    cutoffHours: 24,
    bookings: [PACK_ROW],
    packs: [PACK],
    ...over,
  });
  assert.ok(v, "fixture must pass the allow-list");
  return v;
}
const row = (raw) => listView({ bookings: [raw] }).bookings[0];
const pack = (raw) => {
  const p = V.toPack(raw);
  assert.ok(p, "pack fixture must pass the allow-list");
  return p;
};

async function renderRow(booking, more = {}) {
  const Row = await comp("_components/BookingRow.tsx");
  return renderToStaticMarkup(h(Row, { booking, phone: PHONE, cutoffHours: 24, ...more }));
}
async function renderPack(p) {
  const Card = await comp("_components/PackCard.tsx");
  return renderToStaticMarkup(h(Card, { pack: p }));
}
async function renderList(view, openCancelFor = null) {
  const List = await comp("_components/BookingList.tsx");
  return renderToStaticMarkup(h(List, { view, openCancelFor }));
}

beforeEach(() => {
  globalThis.__test = { cookies: {}, headers: {} };
  delete process.env.EXTON_RELAY_SECRET;
  G.resetLimits();
});

/* ── the pack card ─────────────────────────────────────────────────────── */

test("PackCard: name, PK ref, 'N of M left · valid until …', and a bar of one segment per credit", async () => {
  const html = await renderPack(pack(PACK));
  const t = textOf(html);
  assert.match(t, /Badminton 5-pack/);
  assert.match(t, /PK-ABC123/);
  assert.match(t, new RegExp(C.packLine(pack(PACK)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(t, /2 of 5 left · valid until Nov 29 \(60 days from your first game on Sep 30\)/);
  // 5 credits: 2 used (played or returned-and-gone), 1 booked, 2 left — the order the
  // mock draws them in, spent first.
  const segs = [...html.matchAll(/data-credit="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(segs, ["used", "used", "booked", "left", "left"]);
  assert.doesNotMatch(t, /\$/);
});

test("PackCard: a usable pack offers 'Book a court with my pack' — the app form in pack mode, that sport, same tab", async () => {
  const html = await renderPack(pack(PACK));
  assert.match(textOf(html), new RegExp(C.bookWithMyPack("Badminton")));
  assert.match(textOf(html), /Book a court with my pack/);
  const book = hrefs(html).filter((u) => /pay=pack/.test(u));
  assert.deepEqual(book, [B.bookWithPackUrl(SPORT)]);
  assert.match(book[0], new RegExp(`sport_id=${SPORT}`));
  // Built by lib/booking.ts from the checked sport id — never the platform's bookUrl.
  assert.equal(pack({ ...PACK, bookUrl: "javascript:alert(1)" }).bookUrl, B.bookWithPackUrl(SPORT));
  assert.doesNotMatch(html, /target="_blank"/);
});

test("PackCard: the last few uses, at most three, each in its own words", async () => {
  const t = textOf(await renderPack(pack(PACK)));
  for (const u of PACK.uses.slice(0, 3)) assert.match(t, new RegExp(C.packUseLine(u)));
  assert.doesNotMatch(t, /Sep 30, 7:00 PM/); // the fourth is not shown
  assert.match(t, /Played Thu, Oct 15, 7:00 PM–8:00 PM · 1 credit/);
});

test("PackCard: a pack that can't take a booking says why, and offers no Book button", async () => {
  for (const [over, why] of [
    [{ status: "expired", creditsBooked: 0 }, "Expired on Nov 29."],
    [{ status: "used_up", creditsLeft: 0, creditsBooked: 0 }, "All 5 credits used."],
    [{ status: "refunded" }, "This pack is closed. Games you've already booked still stand."],
    [{ status: "disputed" }, "This pack is closed. Games you've already booked still stand."],
  ]) {
    const html = await renderPack(pack({ ...PACK, ...over }));
    const t = textOf(html);
    assert.match(t, new RegExp(why.replace(/[.]/g, "\\.")), over.status);
    assert.doesNotMatch(t, /with my pack/, over.status);
    assert.equal(hrefs(html).some((u) => /pay=pack/.test(u)), false, over.status);
    // A closed or expired pack does not advertise credits it cannot spend.
    if (over.status !== "used_up") assert.doesNotMatch(t, /left · valid until/, over.status);
  }
});

test("PackCard: all credits booked keeps its date line and says so, with no Book button", async () => {
  const html = await renderPack(pack({ ...PACK, status: "all_booked", creditsLeft: 0, creditsBooked: 3 }));
  const t = textOf(html);
  assert.match(t, /0 of 5 left · valid until Nov 29/);
  assert.match(t, /All 5 credits booked\./);
  assert.doesNotMatch(t, /with my pack/);
});

test("PackCard: an unstarted clock shows the platform's clock sentence, not a date", async () => {
  const t = textOf(await renderPack(pack({
    ...PACK, creditsLeft: 5, creditsBooked: 0, clock: "not_started", validUntilText: "Oct 1, 2027",
    clockText: "Your 60 days start when you first play", uses: [],
  })));
  assert.match(t, /5 of 5 left · Your 60 days start when you first play/);
  assert.doesNotMatch(t, /valid until/);
});

/* ── a pack row ────────────────────────────────────────────────────────── */

test("a pack row says what paid for it, in credits — never money, never 'refund'", async () => {
  const t = textOf(await renderRow(row(PACK_ROW)));
  assert.match(t, /Paid with Badminton 5-pack · 1 credit/);
  assert.match(t, /Cancel by Mon, Oct 26, 6:00 PM to get the credit back\./);
  assert.match(t, new RegExp(C.COPY.cancelButton));
  assert.doesNotMatch(t, /\$/);
  assert.doesNotMatch(t, /refund/i);
  assert.match(t, /Court: BADMINTON 1/);
});

test("a pack row inside the cutoff: 'Under 24 hours — call …', the number a tel: link, no Cancel", async () => {
  const html = await renderRow(row({ ...PACK_ROW, cancellable: false, blockedReason: "within_cutoff" }));
  const t = textOf(html);
  assert.match(t, /Under 24 hours — call 484-252-2523/);
  assert.ok(hrefs(html).includes("tel:+14842522523"));
  assert.doesNotMatch(t, new RegExp(C.COPY.cancelButton));
  assert.doesNotMatch(t, /To cancel within/); // the card row's sentence
});

test("a cancelled pack row says who cancelled it, and that the credit came back", async () => {
  const club = textOf(await renderRow(row({ ...PACK_ROW, status: "cancelled", cancellable: false, cancelledBy: "club", creditsReturned: 1 })));
  assert.match(club, /Cancelled by the club — credit returned/);
  const you = textOf(await renderRow(row({ ...PACK_ROW, status: "cancelled", cancellable: false, cancelledBy: "you", creditsReturned: 1 })));
  assert.match(you, /Cancelled · credit returned/);
  for (const t of [club, you]) {
    assert.doesNotMatch(t, /refund/i);
    assert.doesNotMatch(t, new RegExp(C.COPY.cancelButton));
  }
});

test("a card row reads exactly as before packs", async () => {
  const active = textOf(await renderRow(row(ROW)));
  assert.match(active, /Paid \$45\.00/);
  assert.match(active, /Cancel by Mon, Oct 26, 6:00 PM for a full refund\./);
  assert.doesNotMatch(active, /credit/);
  const late = textOf(await renderRow(row({ ...ROW, cancellable: false, blockedReason: "within_cutoff" })));
  assert.match(late, /To cancel within 24 hours, call 484-252-2523\./);
  const gone = textOf(await renderRow(row({ ...ROW, status: "cancelled", cancellable: false, refundedCents: 4500 })));
  assert.match(gone, /Cancelled · \$45\.00 refunded/);
});

/* ── ?cancel=<seriesId>: the pack confirmation email's Cancel link ──────── */

test("a row opened by ?cancel shows its cancel sheet straight away — the pack wording", async () => {
  const t = textOf(await renderRow(row(PACK_ROW), { startOpen: true, keptValidUntil: "Nov 29" }));
  assert.match(t, /Cancel this booking\? You get back 1 credit\. The court goes back on sale straight away\. Your credit keeps your pack's date: valid until Nov 29\./);
  assert.match(t, /Yes, cancel — return my credit/);
  assert.match(t, /Keep my booking/);
  assert.doesNotMatch(t, /refund/i);
});

test("the pack sheet promises no date it cannot vouch for", async () => {
  const t = textOf(await renderRow(row(PACK_ROW), { startOpen: true, keptValidUntil: null }));
  assert.match(t, /You get back 1 credit\. The court goes back on sale straight away\./);
  assert.doesNotMatch(t, /keeps your pack's date/);
});

test("a card row opened by ?cancel shows the card sheet; a row that can't be cancelled shows none", async () => {
  const card = textOf(await renderRow(row(ROW), { startOpen: true }));
  assert.match(card, /We'll refund \$45\.00 to the card you paid with\./);
  assert.match(card, new RegExp(C.COPY.confirmYes));
  for (const raw of [
    { ...PACK_ROW, cancellable: false, blockedReason: "within_cutoff" },
    { ...PACK_ROW, status: "cancelled", cancellable: false, cancelledBy: "you", creditsReturned: 1 },
    { ...PACK_ROW, status: "needs_staff", cancellable: false },
  ]) {
    const t = textOf(await renderRow(row(raw), { startOpen: true, keptValidUntil: "Nov 29" }));
    assert.doesNotMatch(t, /Cancel this booking\?/, raw.status);
    assert.doesNotMatch(t, /Yes, cancel/, raw.status);
  }
  // Without startOpen nothing is open (the default render is unchanged).
  assert.doesNotMatch(textOf(await renderRow(row(PACK_ROW))), /Yes, cancel/);
});

/* ── the list ──────────────────────────────────────────────────────────── */

test("BookingList: the pack cards sit above the bookings, usable packs first", async () => {
  const html = await renderList(listView({
    packs: [{ ...PACK, ref: "PK-OLD111", status: "expired", creditsBooked: 0 }, PACK],
  }));
  const t = textOf(html);
  const heading = t.indexOf(C.PACK_COPY.packsHeading);
  assert.ok(heading >= 0, "no packs heading");
  assert.ok(t.indexOf("PK-ABC123") < t.indexOf("PK-OLD111"), "the usable pack is not first");
  assert.ok(t.indexOf("PK-OLD111") < t.indexOf("Paid with Badminton 5-pack"), "the packs are not above the list");
  assert.match(t, /Bookings for a•••@example\.com/);
});

test("BookingList: no packs, no pack heading — the list as before", async () => {
  const t = textOf(await renderList(listView({ bookings: [ROW], packs: [] })));
  assert.doesNotMatch(t, new RegExp(C.PACK_COPY.packsHeading));
  assert.match(t, /Paid \$45\.00/);
});

test("BookingList: a pack and no bookings shows the pack and the empty state's own words", async () => {
  const html = await renderList(listView({ bookings: [] }));
  const t = textOf(html);
  assert.match(t, /PK-ABC123/);
  assert.match(t, new RegExp(C.COPY.empty));
  assert.ok(hrefs(html).includes("/#top"));
});

test("BookingList: ?cancel opens that row only", async () => {
  const view = listView({ bookings: [PACK_ROW, { ...PACK_ROW, seriesId: SERIES_2, startsAt: "2026-10-28T22:00:00.000Z" }] });
  const t = textOf(await renderList(view, SERIES_2));
  assert.equal(count(t, "Yes, cancel — return my credit"), 1);
  assert.equal(count(textOf(await renderList(view, null)), "Yes, cancel"), 0);
  // Case-insensitive, as a pasted UUID may be upper case.
  assert.equal(count(textOf(await renderList(view, SERIES_2.toUpperCase())), "Yes, cancel"), 1);
});

test("BookingList: 'keeps your pack's date' only for the ONE pack of that name, and only once its clock has started", async () => {
  const keeps = (v) => /keeps your pack's date: valid until Nov 29/.test(textOf(v));
  assert.equal(keeps(await renderList(listView(), SERIES)), true);
  // A provisional clock moves when its only booking goes (design §3): no promise.
  assert.equal(keeps(await renderList(listView({ packs: [{ ...PACK, clock: "provisional" }] }), SERIES)), false);
  // Two packs of one name: which one the booking drew from is not known here.
  assert.equal(keeps(await renderList(listView({ packs: [PACK, { ...PACK, ref: "PK-DEF456" }] }), SERIES)), false);
  // A pack of another name is not this booking's.
  assert.equal(keeps(await renderList(listView({ packs: [{ ...PACK, name: "Squash 5-pack", sport: "Squash", sportId: SQUASH }] }), SERIES)), false);
});

/* ── the page: ?cancel from the URL, end to end ─────────────────────────── */

function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = await responder(String(url), init);
    return new Response(JSON.stringify(r.body ?? null), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return calls;
}
const LIST_JSON = {
  club: { name: "Exton Sports Center", phone: PHONE },
  email: "a•••@example.com",
  cutoffHours: 24,
  bookings: [PACK_ROW],
  packs: [PACK],
};
async function renderPage(searchParams) {
  const Page = await comp("page.tsx");
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
}

test("/my-bookings?cancel=<seriesId> opens that booking's sheet; anything that is not a UUID opens nothing", async () => {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: { "__Host-exton_mb": TOKEN }, headers: { "x-real-ip": "203.0.113.9" } };
  const calls = stubFetch(() => ({ status: 200, body: LIST_JSON }));

  const open = textOf(await renderPage({ cancel: SERIES }));
  assert.match(open, /Yes, cancel — return my credit/);
  assert.match(open, /keeps your pack's date: valid until Nov 29/);
  assert.match(open, /PK-ABC123/);
  for (const bad of ["nope", `${SERIES}x`, [SERIES, SERIES], undefined, "javascript:alert(1)"]) {
    assert.doesNotMatch(textOf(await renderPage(bad === undefined ? {} : { cancel: bad })), /Yes, cancel/, String(bad));
  }
  assert.ok(calls.length >= 1 && calls.every((c) => c.url === "https://platform.test/api/public/guest-bookings"));
});

test("/my-bookings?cancel=… on a signed-out device asks for the email and says nothing about the booking", async () => {
  const calls = stubFetch(() => ({ status: 500 }));
  const t = textOf(await renderPage({ cancel: SERIES }));
  assert.match(t, new RegExp(C.COPY.sendButton));
  assert.doesNotMatch(t, /Yes, cancel|5-pack|PK-/);
  assert.equal(calls.length, 0);
});

/* ── the cancel route relays a pack answer as it is ─────────────────────── */

test("POST /api/my-bookings/cancel on a pack series: the credit, the pack, and no money in the answer", async () => {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: { "__Host-exton_mb": TOKEN }, headers: {} };
  const calls = stubFetch(() => ({
    status: 200,
    body: {
      status: "cancelled", refundedCents: 0, paidWith: "pack", creditsReturned: 1,
      pack: { name: "Badminton 5-pack", creditsLeft: 3, creditsTotal: 5, validUntilText: "Nov 29" },
    },
  }));
  const { POST } = await import("../../app/api/my-bookings/cancel/route.ts");
  const res = await POST(new Request("https://www.extonsports.com/api/my-bookings/cancel", {
    method: "POST",
    headers: { origin: "https://www.extonsports.com", "content-type": "application/json", "x-real-ip": "203.0.113.9" },
    body: JSON.stringify({ seriesId: SERIES }),
  }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, {
    status: "cancelled", paidWith: "pack", creditsReturned: 1,
    pack: { name: "Badminton 5-pack", creditsLeft: 3, creditsTotal: 5, validUntilText: "Nov 29" },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://platform.test/api/public/guest-bookings/${SERIES}/cancel`);
  // …and what the row then says, through the browser's own reading of that answer.
  assert.equal(
    C.cancelMessage(V.fromSiteCancel(200, body), PHONE),
    "Cancelled. Credit is back. Badminton 5-pack 3 of 5 left · valid until Nov 29.",
  );
});

/* ── source reads ───────────────────────────────────────────────────────── */

const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

test("a pack cancel's result draws the pack from the PLATFORM's answer, never from a sum made here", () => {
  const src = code(read("app/my-bookings/_components/BookingRow.tsx"));
  assert.match(src, /<PackMeter[^>]*result\.pack\.creditsLeft/);
  // No arithmetic on credits in the row: cp_pack_state is the one implementation.
  assert.doesNotMatch(src, /creditsLeft\s*[-+]/);
});

test("a CLOSED pack's cancel draws no meter — a full bar would say the credits can be used (2026-10-21, review F5)", () => {
  const src = code(read("app/my-bookings/_components/BookingRow.tsx"));
  assert.match(src, /\{result && done && result\.pack && !result\.pack\.closed && \(\s*<PackMeter/);
});

test("the page passes ?cancel through as a checked id only", () => {
  const src = code(read("app/my-bookings/page.tsx"));
  assert.match(src, /UUID_RE\.test\(/);
  assert.match(src, /openCancelFor=\{/);
});

/* ── review fixes, 2026-10-21 ───────────────────────────────────────────── */

test("after a cancel that worked, the row asks the server page again, so the cards above re-read the platform (review UI-1)", () => {
  // The card said "1 of 5 left · Upcoming Sun, Oct 25" while the row said "3 of 5 left"
  // until a reload. router.refresh() re-renders the server page (cp_holder_packs again);
  // the row keeps its key, so its own result message stays. Nothing is summed here.
  const src = code(read("app/my-bookings/_components/BookingRow.tsx"));
  assert.match(src, /import \{ useRouter \} from "next\/navigation";/);
  assert.match(src, /const router = useRouter\(\);/);
  const body = src.slice(src.indexOf("async function cancel()"), src.indexOf("const done ="));
  assert.match(body, /const v = fromSiteCancel\(r\.status, r\.json\);\s*setResult\(v\);\s*setPhase\("result"\);\s*if \(isCancelSuccess\(v\)\) router\.refresh\(\);/);
  // Only a cancel that worked: a doubt or a refusal changes nothing on the platform.
  assert.equal(body.split("router.refresh()").length - 1, 1);
  // BookingList keys each row by its series, so the refreshed list keeps the row's state.
  assert.match(code(read("app/my-bookings/_components/BookingList.tsx")), /<BookingRow\s+key=\{b\.seriesId\}/);
});

test("a row that used several credits says 'credits' on its cancel-by line and its Yes button (review UI-4)", async () => {
  const two = row({ ...PACK_ROW, courts: ["BADMINTON 1", "BADMINTON 2"], credits: 2 });
  const t = textOf(await renderRow(two, { startOpen: true, keptValidUntil: "Nov 29" }));
  assert.match(t, /Yes, cancel — return my credits/);
  assert.doesNotMatch(t, /return my credit\b(?!s)/);
  const idle = textOf(await renderRow(two));
  assert.match(idle, /Cancel by Mon, Oct 26, 6:00 PM to get the credits back\./);
  // One credit reads as before.
  assert.match(textOf(await renderRow(row(PACK_ROW))), /to get the credit back\./);
});

test("a cricket pack card offers 'Book a lane with my pack' (review UI-10)", async () => {
  const cricket = pack({ ...PACK, sport: "Cricket", sportId: SQUASH, name: "Cricket 5-pack" });
  const t = textOf(await renderPack(cricket));
  assert.match(t, /Book a lane with my pack/);
  assert.doesNotMatch(t, /Book a court/);
});

test("BookingList: a row that names its pack (packRef) is told THAT pack's date, even beside a pack of the same name (review UI-2)", async () => {
  const keeps = (html) => textOf(html).match(/keeps your pack's date: valid until (\w+ \d+)/)?.[1] ?? null;
  const other = { ...PACK, ref: "PK-DEF456", validUntil: "2026-12-02", validUntilText: "Dec 2" };
  const two = [PACK, other];
  // The platform's field name, on the platform's shape (orangish-app lib/guest-bookings.ts).
  assert.equal(keeps(await renderList(listView({ bookings: [{ ...PACK_ROW, packRef: "PK-DEF456" }], packs: two }), SERIES)), "Dec 2");
  assert.equal(keeps(await renderList(listView({ bookings: [{ ...PACK_ROW, packRef: "PK-ABC123" }], packs: two }), SERIES)), "Nov 29");
  // A ref no card carries: no promise — and no falling back to a name that might be another pack.
  assert.equal(keeps(await renderList(listView({ bookings: [{ ...PACK_ROW, packRef: "PK-999999" }], packs: [PACK] }), SERIES)), null);
  // The named pack's clock still decides: provisional, no promise.
  assert.equal(keeps(await renderList(listView({ bookings: [{ ...PACK_ROW, packRef: "PK-DEF456" }], packs: [PACK, { ...other, clock: "provisional" }] }), SERIES)), null);
  // A platform that sends no ref: the name rule, as before.
  assert.equal(keeps(await renderList(listView({ bookings: [PACK_ROW], packs: [PACK] }), SERIES)), "Nov 29");
  assert.equal(keeps(await renderList(listView({ bookings: [PACK_ROW], packs: two }), SERIES)), null);
});
