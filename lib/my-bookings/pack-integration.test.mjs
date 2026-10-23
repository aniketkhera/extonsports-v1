/* The court pack, put together, 2026-10-21 (integration of S2 + S3/S4 on S1).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court pack
   (orangish-app docs/court-packs.md). Each piece tested itself against S1's contracts; this
   file pins what only shows once they sit together — the needs each build report left for
   another piece. It RENDERS (the pack-list harness: .tsx through the repo's TypeScript,
   next/* stubbed, global fetch stubbed, so no call leaves this machine):
     • the pack page puts the quote's two sentences together by the choice's CLOCK, never
       by guessing from a date — a fresh pack read "valid until Dec 24 (Your 60 days start
       at your first game…)" when S2 matched the card by its old date;
     • a sign-in from /my-bookings?cancel=<id> comes back to that sheet (S3's ask);
     • every app.orangish.io link the pack pages render is the booking form, or the terms
       box's own link — the design's exceptions, and only them;
     • every pack page and route sits under the private headers, and the public buy pages
       do not;
     • the booking bubble stays off the buy pages, where it covered the form on a phone. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ── the harness (as lib/my-bookings/pack-list.test.mjs), plus SiteChrome's imports ── */

const stub = (src) => "data:text/javascript," + encodeURIComponent(src);
const STUBS = {
  "next/headers": stub(`
    export async function cookies() {
      const jar = globalThis.__test?.cookies ?? {};
      return { get: (n) => (Object.hasOwn(jar, n) ? { name: n, value: jar[n] } : undefined) };
    }
    export async function headers() { return new Headers(globalThis.__test?.headers ?? {}); }`),
  "next/navigation": stub(`
    export function usePathname() { return globalThis.__test?.pathname ?? "/"; }
    export function useRouter() { return { refresh() {}, push() {}, replace() {}, back() {}, forward() {}, prefetch() {} }; }`),
  "next/link": stub(`import m from ${JSON.stringify(pathToFileURL(join(ROOT, "node_modules/next/link.js")).href)};
    export default m.default ?? m;`),
  "@vercel/analytics/react": stub(`export function Analytics() { return null; }`),
  "mailer-admin/TrackBeacon": stub(`export default function TrackBeacon() { return null; }`),
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

const { createElement: h, Fragment } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const S = await import("./session.ts");
const B = await import("../booking.ts");
const G = await import("./guard.ts");
const V = await import("./view.ts");
const C = await import("./copy.ts");

/** The visible text of rendered markup, entities decoded, whitespace collapsed. */
function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:a|span|b|strong|em)\b[^>]*>/g, "")
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
const APP_ORIGIN = new URL(B.BOOK_COURT_URL).origin;
const onApp = (u) => {
  try {
    return new URL(u, "https://www.extonsports.com").origin === APP_ORIGIN;
  } catch {
    return false;
  }
};

/** Every element in a rendered-by-hand tree (a server page's return value), depth first. */
function elements(node, out = []) {
  if (Array.isArray(node)) {
    for (const n of node) elements(n, out);
  } else if (node && typeof node === "object" && "props" in node) {
    out.push(node);
    elements(node.props?.children, out);
  }
  return out;
}

/* ── fixtures ──────────────────────────────────────────────────────────── */

const PHONE = "484-252-2523";
const SPORT = "bfff160c-1111-4c2b-9e1f-0a1b2c3d4e5f";
const SERIES = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
const TOKEN = "A".repeat(20) + "_-" + "b".repeat(21);
const SEL = { sportId: SPORT, date: "2026-10-25", startTime: "18:00", hours: 1, courts: 1, preferCourtId: null };
const SLOT = {
  sport: "Badminton", sportId: SPORT, unit: "court", courts: 1, hours: 1,
  // The platform's own words (orangish-app lib/court-pack-rules.ts packWhenText), not the
  // design's — review UI-5: the fixtures had the design's, so the summary was never seen.
  whenText: "Sun, Oct 25 · 6:00–7:00 PM", credits: 1, cardTotalCents: 4500, creditValueCents: 4000, savesCents: 500,
};
const TERMS = { version: "2026-10-13-3", url: "/book-court/exton-sports/terms" };

/** A pack nobody has booked yet: its date is the 12-month start-by, its clock not started. */
const FRESH = {
  ref: "PK-ABC123", sport: "Badminton", sportId: SPORT, name: "Badminton 5-pack",
  creditsTotal: 5, creditsLeft: 5, creditsBooked: 0, status: "active",
  validUntil: "2027-10-20", validUntilText: "Oct 20, 2027", clock: "not_started",
  clockText: "Your 60 days start when you first play", unusedUntilText: "Oct 20, 2027", uses: [],
};
/** The platform's choice for it — AFTER this booking (orangish-app lib/court-pack-book.ts
 *  choiceFor): this game is now the first, so the window is provisional and its date moved. */
const FRESH_CHOICE = {
  packName: "Badminton 5-pack", creditsLeftAfter: 4, creditsTotal: 5,
  validUntilText: "Dec 24", clockText: "Your 60 days start at your first game — Oct 25 if you play as booked",
};
/** A pack whose first game was played on Oct 18: its date does not move. */
const STARTED = {
  ...FRESH, creditsLeft: 3, creditsBooked: 0, validUntil: "2026-12-17", validUntilText: "Dec 17", clock: "started",
  clockText: "60 days from your first game on Oct 18",
};
const STARTED_CHOICE = {
  packName: "Badminton 5-pack", creditsLeftAfter: 2, creditsTotal: 5,
  validUntilText: "Dec 17", clockText: "60 days from your first game on Oct 18",
};
const quote = (over = {}) => ({
  slot: SLOT, terms: TERMS, session: "match", email: "a•••@example.com", packs: [FRESH], choice: FRESH_CHOICE, refusal: null,
  ...over,
});

function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = await responder(String(url), init);
    return new Response(JSON.stringify(r.body ?? null), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return calls;
}

async function renderPackPage(quoteBody, { signedIn = true, sel = SEL, status = 200 } = {}) {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = {
    cookies: { [S.PACK_SEL_COOKIE]: S.packSelCookie(sel).value, ...(signedIn ? { [S.DEVICE_COOKIE]: TOKEN } : {}) },
    headers: { "x-real-ip": "203.0.113.9" },
  };
  const calls = stubFetch(() => ({ status, body: quoteBody }));
  const Page = (await import("../../app/my-bookings/pack/page.tsx")).default;
  const html = renderToStaticMarkup(await Page());
  return { html, text: textOf(html), calls };
}

beforeEach(() => {
  globalThis.__test = { cookies: {}, headers: {} };
  delete process.env.EXTON_RELAY_SECRET;
  G.resetLimits();
});

/* ── S2 ↔ S1 ↔ A3: the choice's clock ──────────────────────────────────── */

test("pack page: a fresh pack reads as the platform's provisional clock — with the choice's clock, and without one", async () => {
  for (const choice of [{ ...FRESH_CHOICE, clock: "provisional" }, FRESH_CHOICE]) {
    const { text, calls } = await renderPackPage(quote({ choice }));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://platform.test/api/public/guest-packs/quote");
    assert.match(text, /BADMINTON 5-PACK|Badminton 5-pack/);
    assert.match(text, /5 of 5 left · Your 60 days start at your first game — Oct 25 if you play as booked/, JSON.stringify(choice));
    // The first cut read any date as a started clock: "valid until Dec 24 (Your 60 days…)".
    assert.doesNotMatch(text, /valid until Dec 24/, JSON.stringify(choice));
    assert.match(text, /Book · use 1 credit/);
  }
});

test("pack page: a started pack reads 'valid until … (60 days from your first game …)' — with the clock, and without", async () => {
  for (const choice of [{ ...STARTED_CHOICE, clock: "started" }, STARTED_CHOICE]) {
    const { text } = await renderPackPage(quote({ packs: [STARTED], choice }));
    assert.match(text, /3 of 5 left · valid until Dec 17 \(60 days from your first game on Oct 18\)/, JSON.stringify(choice));
  }
});

test("pack page: the platform's clock wins over the cards — they describe the pack BEFORE this booking", async () => {
  // A card that says 'started' with the same count, but the choice says provisional: the
  // sentence follows the choice (its two sentences were written for its own clock).
  const { text } = await renderPackPage(quote({ packs: [{ ...STARTED, creditsLeft: 5 }], choice: { ...FRESH_CHOICE, clock: "provisional" } }));
  assert.match(text, /5 of 5 left · Your 60 days start at your first game/);
  assert.doesNotMatch(text, /valid until Dec 24/);
});

/* ── the design's app.orangish.io exceptions, as RENDERED ──────────────── */

test("pack page: every app.orangish.io link it renders is the booking form or the terms box's link", async () => {
  const termsUrl = B.appHref(TERMS.url);
  const pages = [
    await renderPackPage(quote()), // match + choice: terms, and nothing else on the app
    await renderPackPage({ slot: SLOT, terms: TERMS, session: "none" }, { signedIn: false }), // pay by card instead
    await renderPackPage(quote({ choice: null, refusal: { reason: "no_pack" } })), // pay by card
  ];
  const seen = new Set();
  for (const { html } of pages) {
    for (const u of hrefs(html).filter(onApp)) {
      const ok = u === termsUrl || u.startsWith(`${B.BOOK_COURT_URL}?`);
      assert.ok(ok, `an app link the design does not allow here: ${u}`);
      seen.add(u === termsUrl ? "terms" : new URL(u).searchParams.get("pay") === "pack" ? "form, pack mode" : "form, card");
    }
  }
  assert.deepEqual([...seen].sort(), ["form, card", "terms"]);
  // The booking-form links carry the slot this site checked, never one the platform sent.
  assert.ok(hrefs(pages[1].html).includes(B.bookByCardUrl(SEL)));
});

test("My bookings: the only app.orangish.io links are the pack cards' 'Book a court with my pack'", async () => {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: { [S.DEVICE_COOKIE]: TOKEN }, headers: {} };
  const ROW = {
    seriesId: SERIES, sport: "Badminton", whenText: "Tue, Oct 27, 6:00 PM–7:00 PM",
    startsAt: "2026-10-27T22:00:00.000Z", cancelBy: "2026-10-26T22:00:00.000Z", cancelByText: "Mon, Oct 26, 6:00 PM",
    courts: ["BADMINTON 1", "BADMINTON 2"], amountPaidCents: 0, status: "active", cancellable: true, blockedReason: null,
    refundedCents: null, paidWith: "pack", credits: 2, packName: "Badminton 5-pack",
  };
  stubFetch(() => ({
    status: 200,
    body: { club: { name: "Exton Sports Center", phone: PHONE }, email: "a•••@example.com", cutoffHours: 24, bookings: [ROW], packs: [STARTED] },
  }));
  const Page = (await import("../../app/my-bookings/page.tsx")).default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ cancel: SERIES }) }));
  const app = hrefs(html).filter(onApp);
  assert.deepEqual(app, [B.bookWithPackUrl(SPORT)]);
  // …and the two-court sheet the email's Cancel link opens reads in the plural (S3's ask).
  assert.match(
    textOf(html),
    /Cancel this booking\? You get back 2 credits\. The courts go back on sale straight away\. Your credits keep your pack's date: valid until Dec 17\./,
  );
});

/* ── S3 ↔ S1 ↔ S2: ?cancel=<seriesId> survives a code sign-in ──────────── */

test("/my-bookings?cancel=<id>, signed out: the email form's sign-in comes back to that sheet; a bad id goes to the list", async () => {
  const RequestPanel = (await import("../../app/my-bookings/_components/RequestPanel.tsx")).default;
  const Page = (await import("../../app/my-bookings/page.tsx")).default;
  const panelNext = async (searchParams) =>
    elements(await Page({ searchParams: Promise.resolve(searchParams) })).find((e) => e.type === RequestPanel)?.props.next;

  stubFetch(() => ({ status: 500 }));
  assert.equal(await panelNext({ cancel: SERIES }), `/my-bookings?cancel=${SERIES}`);
  for (const bad of [{}, { cancel: "nope" }, { cancel: [SERIES, SERIES] }, { cancel: `${SERIES}&x=1` }]) {
    assert.equal(await panelNext(bad), undefined, JSON.stringify(bad));
  }
  // What CodeForm then navigates to, through the same allow-list it uses.
  assert.equal(S.nextPathOf(await panelNext({ cancel: SERIES })), `/my-bookings?cancel=${SERIES}`);

  // A device the platform no longer knows (401) asks again — with the same way back.
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: { [S.DEVICE_COOKIE]: TOKEN }, headers: {} };
  stubFetch(() => ({ status: 401, body: { error: "signed_out" } }));
  assert.equal(await panelNext({ cancel: SERIES }), `/my-bookings?cancel=${SERIES}`);
});

test("the booked screen's and the confirmation email's Cancel link is one /my-bookings accepts", () => {
  // PackConfirm builds `/my-bookings?cancel=${encodeURIComponent(seriesId)}`; the platform's
  // email builds manageUrlFor(cfg) + '?cancel=' + encodeURIComponent(groupId). A series id
  // is a UUID, which encodeURIComponent leaves as it is — so both reach the page's
  // cancelParam, and the sign-in's allow-list, unchanged.
  assert.equal(`/my-bookings?cancel=${encodeURIComponent(SERIES)}`, S.cancelNextPath(SERIES));
  assert.match(
    readFileSync(join(ROOT, "app/my-bookings/_components/PackConfirm.tsx"), "utf8"),
    /`\/my-bookings\?cancel=\$\{encodeURIComponent\(b\.seriesId\)\}`/,
  );
});

/* ── next.config.ts: every pack page and route is private; the buy pages are public ── */

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
/** The URL path a page.tsx / route.ts serves (no route groups or dynamic segments here). */
const urlOf = (f) => "/" + f.slice(join(ROOT, "app").length + 1).split(sep).slice(0, -1).join("/");
/** Next's header `source`: an exact path, or /x/:path* for /x and everything under it. */
const matches = (source, path) =>
  source.endsWith("/:path*") ? path === source.slice(0, -7) || path.startsWith(source.slice(0, -6)) : path === source;

test("every page and route the pack added under /my-bookings, /api/my-bookings and /api/court-packs is private; /court-packs is not", async () => {
  const cfg = (await import(pathToFileURL(join(ROOT, "next.config.ts")).href)).default;
  const rules = await cfg.headers();
  const isPrivate = (path) =>
    rules.some((r) => matches(r.source, path)
      && r.headers.some((x) => x.key === "Cache-Control" && x.value === "private, no-store")
      && r.headers.some((x) => x.key === "Referrer-Policy" && x.value === "no-referrer"));
  const served = ["my-bookings", "api/my-bookings", "api/court-packs"]
    .flatMap((d) => walk(join(ROOT, "app", ...d.split("/"))))
    .filter((f) => /[\\/](page\.tsx|route\.ts)$/.test(f))
    .map(urlOf);
  for (const p of ["/my-bookings/pack", "/my-bookings/pack/start", "/my-bookings/pack/ready", "/api/my-bookings/pack/book", "/api/court-packs/checkout"]) {
    assert.ok(served.includes(p), `not found: ${p}`);
  }
  for (const p of served) assert.ok(isPrivate(p), `${p} is not under the private headers`);
  for (const p of ["/court-packs", "/court-packs/terms"]) assert.equal(isPrivate(p), false, `${p} is a public page`);
});

/* ── SiteChrome: the booking bubble stays off the buy pages ────────────── */

test("SiteChrome: no booking bubble on /court-packs or its terms; analytics and the beacon stay; elsewhere unchanged", async () => {
  const SiteChrome = (await import("../../app/components/SiteChrome.tsx")).default;
  const names = (pathname) => {
    globalThis.__test = { pathname };
    const out = SiteChrome();
    return out === null ? null : elements(out).map((e) => e.type?.name).filter(Boolean);
  };
  for (const p of ["/court-packs", "/court-packs/terms"]) {
    const got = names(p);
    assert.ok(got, p);
    assert.equal(got.includes("WhatsAppFab"), false, p);
    for (const keep of ["BookingThemeCarry", "Analytics", "TrackBeacon"]) assert.ok(got.includes(keep), `${p}: ${keep}`);
  }
  for (const p of ["/", "/privacy", "/court-packsx", "/court-packs-x", "/5-pack"]) assert.ok(names(p).includes("WhatsAppFab"), p);
  assert.equal(names("/my-bookings/pack"), null);
  assert.equal(names("/my-bookings"), null);
  // The fragment the chrome returns still renders.
  globalThis.__test = { pathname: "/court-packs" };
  assert.equal(typeof renderToStaticMarkup(h(Fragment, null, SiteChrome())), "string");
});

/* ══ review fixes, 2026-10-21 ═══════════════════════════════════════════════
   The confirmed findings from the review of the integrated branches (site side). Each test
   here failed before its fix. */

const PACK_CONFIRM = "../../app/my-bookings/_components/PackConfirm.tsx";

/* ── UI-2: the fields the platform added for the site, read by their real names ── */

test("My bookings: a row's packRef (the platform's field) picks ITS pack's date beside a pack of the same name (review UI-2)", async () => {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: { [S.DEVICE_COOKIE]: TOKEN }, headers: {} };
  // orangish-app lib/guest-bookings.ts: a pack row carries packRef: packRef(red.packId).
  const ROW = {
    seriesId: SERIES, sport: "Badminton", whenText: "Tue, Oct 27, 6:00 PM–7:00 PM",
    startsAt: "2026-10-27T22:00:00.000Z", cancelBy: "2026-10-26T22:00:00.000Z", cancelByText: "Mon, Oct 26, 6:00 PM",
    courts: ["BADMINTON 1"], amountPaidCents: 0, status: "active", cancellable: true, blockedReason: null,
    refundedCents: null, paidWith: "pack", credits: 1, creditsReturned: null, cancelledBy: null,
    packName: "Badminton 5-pack", packRef: "PK-DEF456",
  };
  const OTHER = { ...STARTED, ref: "PK-DEF456", validUntil: "2026-11-30", validUntilText: "Nov 30", clockText: "60 days from your first game on Oct 1" };
  stubFetch(() => ({
    status: 200,
    body: { club: { name: "Exton Sports Center", phone: PHONE }, email: "a•••@example.com", cutoffHours: 24, bookings: [ROW], packs: [STARTED, OTHER] },
  }));
  const Page = (await import("../../app/my-bookings/page.tsx")).default;
  const text = textOf(renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ cancel: SERIES }) })));
  assert.match(text, /Your credit keeps your pack's date: valid until Nov 30\./);
  assert.doesNotMatch(text, /keeps your pack's date: valid until Dec 17/);
});

async function renderReady(purchase, offersStatus = 200) {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = { cookies: {}, headers: { "x-real-ip": "203.0.113.9" } };
  // 2026-10-22: both sizes, each with its own window (the platform's offers answer now).
  const OFFERS = {
    offers: [
      { sportId: SPORT, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 60, unusedMonths: 12 },
      { sportId: SPORT, sport: "Badminton", name: "Badminton 10-pack", credits: 10, priceCents: 35000, perHourCents: 3500, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 120, unusedMonths: 12 },
    ],
    terms: { version: "cp-1", title: "Court pack terms", sections: [{ heading: "One sport", body: "A pack covers one sport." }] },
  };
  const calls = stubFetch((url) => (/\/court-packs\/purchase$/.test(url)
    ? { status: 200, body: purchase }
    : { status: offersStatus, body: offersStatus === 200 ? OFFERS : null }));
  const Page = (await import("../../app/my-bookings/pack/ready/page.tsx")).default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ cs: "cs_test_a1B2c3" }) }));
  return { html, text: textOf(html), calls };
}
// orangish-app app/api/public/court-packs/purchase/route.ts: sportId and name since integration.
const PURCHASE = { state: "active", sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com", sportId: SPORT, name: "Badminton 5-pack" };

test("ready page: 'Book your first game' opens the form for the pack's sport from the purchase answer itself — even with the offers down (review UI-2)", async () => {
  const { html, text, calls } = await renderReady(PURCHASE, 500);
  assert.ok(calls.some((c) => /\/court-packs\/offers/.test(c.url)), "the offers are still asked, for the window");
  assert.ok(hrefs(html).includes(B.bookWithPackUrl(SPORT)), hrefs(html).join(" "));
  assert.match(text, /Pack Badminton 5-pack/);
  assert.doesNotMatch(text, /Valid 60 days/); // the window comes from the offers, which are down
  // Offers up: the window row too.
  assert.match((await renderReady(PURCHASE)).text, /Valid 60 days from your first game/);
});

test("ready page: an older platform (no sportId or name) still matches the offer by sport, as before", async () => {
  const { html, text } = await renderReady({ ...PURCHASE, sportId: undefined, name: undefined });
  assert.ok(hrefs(html).includes(B.bookWithPackUrl(SPORT)));
  assert.match(text, /Pack Badminton 5-pack/);
  // …and with the offers down too, the form opens without a sport, never a wrong one.
  const bare = await renderReady({ ...PURCHASE, sportId: undefined, name: undefined }, 500);
  assert.ok(hrefs(bare.html).includes(B.bookWithPackUrl()));
});

/* ── UI-5: the summary box reads as the app's form did a click earlier ── */

test("pack page: the summary box is the form's wording, built from the parked slot — not the platform's whenText (review UI-5)", async () => {
  const want = "1 badminton court, 6:00 PM–7:00 PM, Sun, Oct 25 · 1 credit · By card $45.00";
  for (const [body, opts] of [[quote(), {}], [{ slot: SLOT, terms: TERMS, session: "none" }, { signedIn: false }]]) {
    const { text } = await renderPackPage(body, opts);
    assert.ok(text.includes(want), text.slice(0, 300));
    assert.doesNotMatch(text, /Sun, Oct 25 · 6:00–7:00 PM/);
  }
});

/* ── UI-6: inside the 24-hour cutoff, no promise of a credit back ── */

/** A parked slot `hoursAhead` from now, on the hour, in the club's zone. */
function selIn(hoursAhead) {
  const at = new Date(Date.now() + hoursAhead * 3600_000);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(at).map((x) => [x.type, x.value]));
  return { ...SEL, date: `${p.year}-${p.month}-${p.day}`, startTime: `${p.hour}:00` };
}

test("pack page: a slot under 24 hours away says it can't be cancelled online, with the phone; one further out keeps the fine print (review UI-6)", async () => {
  const near = await renderPackPage(quote(), { sel: selIn(3) });
  // The pack page speaks with the site's own number (lib/legal.ts CONTACT_PHONE), as before.
  assert.ok(near.text.includes(C.packInsideCutoff(C.FALLBACK_PHONE, 1)), near.text.slice(-400));
  assert.doesNotMatch(near.text, /Cancel up to 24 hours before/);
  assert.ok(hrefs(near.html).includes("tel:+14842522523"));
  const far = await renderPackPage(quote(), { sel: selIn(72) });
  assert.ok(far.text.includes(C.packFinePrint(1)));
  assert.doesNotMatch(far.text, /less than 24 hours away/);
});

const confirmProps = (over = {}) => ({
  children: null, packCard: null, sel: SEL, requestKey: "Ab3_-cdEfGhIjKlMnOpQrS", termsVersion: "2026-10-13-3",
  termsUrl: B.appHref(TERMS.url), credits: 2, email: "a•••@example.com", sport: "Badminton", cardUrl: B.bookByCardUrl(SEL),
  cardTotalCents: 9000, pickAnotherUrl: B.bookWithPackUrl(SPORT, SEL), bookAgainUrl: B.bookWithPackUrl(SPORT), buyUrl: null,
  refusalCtx: { sport: "Badminton", unit: "court", need: 2, email: "a•••@example.com", phone: PHONE, date: SEL.date, today: "2026-10-21" },
  phone: PHONE, insideCutoff: false, clock: "provisional",
  ...over,
});

test("PackConfirm: the fine print counts the credits, or says 'call' inside the cutoff (review UI-4, UI-6)", async () => {
  const PackConfirm = (await import(PACK_CONFIRM)).default;
  const out = textOf(renderToStaticMarkup(h(PackConfirm, confirmProps())));
  assert.match(out, /Cancel up to 24 hours before and the credits come back\./);
  const inside = renderToStaticMarkup(h(PackConfirm, confirmProps({ insideCutoff: true })));
  assert.ok(textOf(inside).includes(C.packInsideCutoff(PHONE, 2)));
  assert.doesNotMatch(textOf(inside), /Cancel up to/);
  assert.ok(hrefs(inside).includes("tel:+14842522523"));
});

/* ── UI-7: the booked screen states a date only for a started clock ── */

const bookedView = (pack, booking = {}) => V.fromSiteBook(200, {
  status: "booked",
  booking: { seriesId: SERIES, whenText: "Sun, Oct 25 · 6:00–7:00 PM", courts: ["BADMINTON 1"], credits: 1, lightsNote: null, ...booking },
  pack,
});
const FRESH_AFTER = { name: "Badminton 5-pack", creditsLeft: 4, creditsTotal: 5, validUntilText: "Dec 24", clockText: FRESH_CHOICE.clockText };
const STARTED_AFTER = { name: "Badminton 5-pack", creditsLeft: 2, creditsTotal: 5, validUntilText: "Dec 17", clockText: STARTED.clockText };

async function renderBooked(v, over = {}) {
  const { Booked } = await import(PACK_CONFIRM);
  const html = renderToStaticMarkup(h(Booked, { v, email: "a•••@example.com", bookAgainUrl: B.bookWithPackUrl(SPORT), clock: null, insideCutoff: false, phone: PHONE, ...over }));
  return { html, text: textOf(html) };
}

test("booked screen: a pack whose 60 days have not started shows its clock sentence, never a firm 'Valid until' (review UI-7)", async () => {
  // Today's platform sends no clock on the book answer: the quote's clock (the pack after
  // this booking, choiceFor) decides. The answer's own clock wins when it comes.
  for (const [pack, clock] of [[FRESH_AFTER, "provisional"], [{ ...FRESH_AFTER, clock: "provisional" }, "started"], [FRESH_AFTER, null]]) {
    const { text } = await renderBooked(bookedView(pack), { clock });
    assert.doesNotMatch(text, /Valid until/, JSON.stringify([pack.clock, clock]));
    assert.ok(text.includes(FRESH_CHOICE.clockText), JSON.stringify([pack.clock, clock]));
    assert.match(text, /Credits left 4 of 5/);
  }
});

test("booked screen: a started pack shows 'Valid until'; the ember box only when it has a note to hold (review UI-7)", async () => {
  for (const [pack, clock] of [[STARTED_AFTER, "started"], [{ ...STARTED_AFTER, clock: "started" }, "provisional"]]) {
    const { html, text } = await renderBooked(bookedView(pack), { clock });
    assert.match(text, /Valid until Dec 17/);
    assert.doesNotMatch(text, /60 days from your first game/);
    assert.doesNotMatch(html, /data-booked-note/, "an empty box under the rows");
  }
  const lights = await renderBooked(bookedView(STARTED_AFTER, { lightsNote: "Lights will automatically turn on 15 mins prior to the booking start." }), { clock: "started" });
  assert.match(lights.html, /data-booked-note/);
  assert.match(lights.text, /Lights will automatically turn on/);
});

test("booked screen: the Cancel link counts the credits, and inside the cutoff it is the phone instead (review UI-4, UI-6)", async () => {
  const two = bookedView(STARTED_AFTER, { courts: ["BADMINTON 1", "BADMINTON 2"], credits: 2 });
  const out = await renderBooked(two, { clock: "started" });
  assert.ok(hrefs(out.html).includes(`/my-bookings?cancel=${SERIES}`));
  assert.match(out.text, /Cancel this booking \(credits back until 24 hours before\)/);
  const inside = await renderBooked(two, { clock: "started", insideCutoff: true });
  assert.equal(hrefs(inside.html).some((u) => u.startsWith("/my-bookings?cancel=")), false);
  assert.ok(inside.text.includes(C.packInsideCutoff(PHONE, 2)));
  assert.ok(hrefs(inside.html).includes("tel:+14842522523"));
});

/* ── UI-8: "or pay by card" comes with the card link ── */

test("after Book: 'try again' and 'slow down' offer the card link their sentence names; a doubt never does (review UI-8)", async () => {
  const { showsPayByCard, showsPickAnother } = await import(PACK_CONFIRM);
  const toCard = V.PACK_REFUSALS.filter((r) => r !== "too_far_ahead");
  for (const s of ["try_again", "slow_down", "off", ...toCard]) assert.equal(showsPayByCard(s), true, s);
  for (const s of [null, "unknown", "booked", "already", "taken", "started", "no_rate", "club_closed_hours",
    "changed", "credits_changed", "terms_changed", "signed_out", "terms_required", "bad_phone", "too_far_ahead"]) {
    assert.equal(showsPayByCard(s), false, String(s));
  }
  // 2026-10-22: too far ahead for the pack is too far for a card (30 days) — another date is
  // the way on, so it offers Pick another time, as a slot that can't be booked online does.
  for (const s of ["taken", "started", "no_rate", "club_closed_hours", "too_far_ahead"]) assert.equal(showsPickAnother(s), true, s);
  for (const s of [null, "unknown", "try_again", ...toCard]) assert.equal(showsPickAnother(s), false, String(s));
  assert.match(C.bookMessage({ status: "try_again" }), /or pay by card\.$/);
  const src = readFileSync(join(ROOT, "app/my-bookings/_components/PackConfirm.tsx"), "utf8");
  // 2026-10-22: only with a card for this date (cardUrl null past the card window).
  assert.match(src, /\{cardUrl !== null && showsPayByCard\(status, card\) && \(/);
});

/* ══ two sizes, 2026-10-22 ══════════════════════════════════════════════════
   Aniket, 2026-10-22: a 10-pack beside the 5-pack (120 days, not 60), badminton and cricket
   only, renamed "court packs". What the pack pages must now get right with a 10-pack. */

const TEN_STARTED = {
  ...STARTED, ref: "PK-TEN100", name: "Badminton 10-pack", creditsTotal: 10, creditsLeft: 7,
  validUntil: "2027-02-15", validUntilText: "Feb 15", clockText: "120 days from your first game on Oct 18",
};
const TEN_CHOICE = {
  packName: "Badminton 10-pack", creditsLeftAfter: 6, creditsTotal: 10,
  validUntilText: "Feb 15", clockText: "120 days from your first game on Oct 18", clock: "started",
};

test("pack page: a 10-pack's card is its own — '7 of 10 left', its 120 days, ten blocks — under the 'court pack' heading", async () => {
  const { html, text } = await renderPackPage(quote({ packs: [TEN_STARTED], choice: TEN_CHOICE }));
  assert.match(text, /Book with my court pack/);
  assert.match(text, /Badminton 10-pack/);
  assert.match(text, /7 of 10 left · valid until Feb 15 \(120 days from your first game on Oct 18\)/);
  assert.doesNotMatch(text, /60 days/);
  assert.equal([...html.matchAll(/data-bar-credit/g)].length, 10);
  assert.match(text, /Book · use 1 credit/);
});

test("pack page: too many credits names the guest's OWN largest pack, in its real size (2026-10-22)", async () => {
  const sel = { ...SEL, courts: 2, hours: 3 };
  const slot = { ...SLOT, courts: 2, hours: 3, credits: 6, cardTotalCents: 27000 };
  for (const [max, want] of [[5, "holds 5 credits"], [10, "holds 10 credits"]]) {
    const { text } = await renderPackPage(
      quote({ slot, choice: null, refusal: { reason: "too_many_credits", need: 6, maxCredits: max } }),
      { sel },
    );
    assert.ok(text.includes(`This booking needs 6 credits and your largest badminton pack ${want}.`), text.slice(0, 400));
    assert.doesNotMatch(text, /a pack has/);
    // PACKS_LIVE is off: no buy link of any kind.
    assert.doesNotMatch(text, /Buy a/);
  }
});

test("pack page: too far ahead says how far the guest's pack books, and offers Pick another time — not a card (2026-10-22)", async () => {
  // Aniket, 2026-10-22: "let's make the pack bookings upto 60 days for 5 pack and 120 days for
  // 10 pack.." — a slot past every usable pack's horizon. A card opens only 30 days ahead, so
  // "Pay by card" would lead to the app form's refusal; the way on is an earlier date.
  const sel = { ...SEL, date: "2027-03-01" };
  for (const [refusal, want] of [
    [{ reason: "too_far_ahead", maxDays: 60 }, "You can book up to 60 days ahead with your court pack. Pick an earlier date."],
    [{ reason: "too_far_ahead", maxDays: 120 }, "You can book up to 120 days ahead with your court pack. Pick an earlier date."],
    [{ reason: "too_far_ahead" }, "You can't book that far ahead with your court pack. Pick an earlier date."],
  ]) {
    const { html, text } = await renderPackPage(quote({ choice: null, refusal }), { sel });
    assert.ok(text.includes(want), text.slice(0, 400));
    assert.ok(hrefs(html).includes(B.bookWithPackUrl(SPORT, sel)), "Pick another time goes back to the form with this slot");
    assert.match(text, /Pick another time/);
    assert.doesNotMatch(text, /Pay by card/);
    assert.doesNotMatch(text, /Book · use/);
  }
  // Any other refusal still offers the card, as before.
  const other = await renderPackPage(quote({ choice: null, refusal: { reason: "not_enough_credits", need: 1, creditsLeft: 0 } }));
  assert.match(other.text, /Pay by card \$45\.00/);
  assert.doesNotMatch(other.text, /Pick another time/);
});

/* ── the card window on the pack pages, 2026-10-22 ─────────────────────────
   Review of the booking horizon: a pack books up to 60 / 120 days ahead, a card only 30
   (C.CARD_WINDOW_DAYS). The pack pages offered "Pay by card" for every date, and the app's
   form, handed a date past its card window, moved the booking to TODAY at the same start
   time. Past the window: no card link, no "By card $X", no "or pay by card" — "Pick another
   time" (the form in pack mode, this slot) instead. Inside it: exactly as before. The dates
   are counted from the club's real today, as the page counts them. */

const O = await import("../opening.ts");
/** Club-local today + n days, YYYY-MM-DD. */
function plusDays(n) {
  const [y, m, d] = O.clubDate(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const FAR = { ...SEL, date: plusDays(45) }; // inside a 5-pack's 60 days, past the card's 30
const NEAR = { ...SEL, date: plusDays(10) };
/** No card anywhere on the page: no form link in card mode, no card words. */
function assertNoCard(html, text, label) {
  for (const u of hrefs(html).filter(onApp).filter((u) => u.startsWith(`${B.BOOK_COURT_URL}?`))) {
    assert.equal(new URL(u).searchParams.get("pay"), "pack", `${label}: a card link ${u}`);
  }
  assert.doesNotMatch(text, /by card/i, label);
}

test("cardOpenOn: the last card date is today + 30 − 1, as the app's lastBookableDate counts it", () => {
  assert.equal(C.cardOpenOn("2026-11-20", "2026-10-22"), true); // today + 29
  assert.equal(C.cardOpenOn("2026-11-21", "2026-10-22"), false); // today + 30
  assert.equal(C.cardOpenOn("2026-10-22", "2026-10-22"), true);
  assert.equal(C.cardOpenOn("2026-10-01", "2026-10-22"), true); // a past date is not "too far"
  assert.equal(C.cardOpenOn("2027-01-13", "2026-12-15"), true); // across a year
  assert.equal(C.cardOpenOn("2027-01-14", "2026-12-15"), false);
  assert.equal(C.cardOpenOn("2026-11-05", "2026-10-22", 14), false);
  assert.equal(C.cardOpenOn("2026-11-04", "2026-10-22", 14), true);
  // A malformed date says what the page always said (the parked one is checked by session.ts).
  assert.equal(C.cardOpenOn("2027-03-01", "nope"), true);
  assert.equal(C.cardOpenOn("soon", "2026-10-22"), true);
});

test("pack page, a refusal past the card window: Pick another time, no card and no 'or pay by card'; inside it, the card as before (2026-10-22)", async () => {
  const cases = [
    [{ reason: "no_pack" }, "There's no court pack on a•••@example.com.", "There's no court pack on a•••@example.com."],
    [
      { reason: "not_enough_credits", need: 1, creditsLeft: 0 },
      "This booking needs 1 credit and your badminton pack has 0 left. Book fewer courts or hours.",
      "This booking needs 1 credit and your badminton pack has 0 left. Book fewer courts or hours, or pay by card.",
    ],
    [
      { reason: "outside_window" },
      "Your badminton pack can't be used on that date. Pick another time.",
      "Your badminton pack can't be used on that date. Pick another time, or pay by card.",
    ],
    // The platform's own shape: an expired refusal's date is validUntil (fix D, view.ts refusalOf).
    [{ reason: "expired", validUntil: "2026-10-01" }, "Your badminton court pack expired on Oct 1.", "Your badminton court pack expired on Oct 1."],
  ];
  for (const [refusal, far, near] of cases) {
    const a = await renderPackPage(quote({ choice: null, refusal }), { sel: FAR });
    assert.ok(a.text.includes(far), `${refusal.reason} at +45: ${a.text.slice(0, 500)}`);
    assert.ok(hrefs(a.html).includes(B.bookWithPackUrl(SPORT, FAR)), `${refusal.reason} at +45: Pick another time, this slot`);
    assert.match(a.text, /Pick another time/);
    assert.equal(hrefs(a.html).includes(B.bookByCardUrl(FAR)), false, refusal.reason);
    assertNoCard(a.html, a.text, `${refusal.reason} at +45`);
    // The summary box still says what the slot is, without its card price.
    assert.ok(a.text.includes(C.slotSummary(SLOT, FAR, false)), a.text.slice(0, 300));
    assert.equal(a.text.includes(C.slotSummary(SLOT, FAR)), false);

    const b = await renderPackPage(quote({ choice: null, refusal }), { sel: NEAR });
    assert.ok(b.text.includes(near), `${refusal.reason} at +10: ${b.text.slice(0, 500)}`);
    assert.match(b.text, /Pay by card \$45\.00/);
    assert.ok(hrefs(b.html).includes(B.bookByCardUrl(NEAR)), `${refusal.reason} at +10: the card link`);
    assert.ok(b.text.includes(C.slotSummary(SLOT, NEAR)), b.text.slice(0, 300));
    assert.equal(hrefs(b.html).includes(B.bookWithPackUrl(SPORT, NEAR)), false, `${refusal.reason} at +10: no Pick another time`);
  }
});

test("pack page past the card window: the signed-out screen offers Pick another time, not 'Pay by card instead' (2026-10-22)", async () => {
  const none = { slot: SLOT, terms: TERMS, session: "none" };
  const far = await renderPackPage(none, { signedIn: false, sel: FAR });
  assert.match(far.text, /Pick another time/);
  assert.ok(hrefs(far.html).includes(B.bookWithPackUrl(SPORT, FAR)));
  assert.doesNotMatch(far.text, /Pay by card instead/);
  assertNoCard(far.html, far.text, "signed out at +45");
  const near = await renderPackPage(none, { signedIn: false, sel: NEAR });
  assert.match(near.text, /Pay by card instead/);
  assert.ok(hrefs(near.html).includes(B.bookByCardUrl(NEAR)));
  assert.match(near.text, /By card \$45\.00/);
  assert.doesNotMatch(near.text, /Pick another time/);
});

test("pack page past the card window: the Book screen drops 'By card $X' and the savings line; Book itself stays (2026-10-22)", async () => {
  const far = await renderPackPage(quote(), { sel: FAR });
  assert.match(far.text, /Book · use 1 credit/);
  assertNoCard(far.html, far.text, "Book screen at +45");
  assert.doesNotMatch(far.text, /saves you/);
  const near = await renderPackPage(quote(), { sel: NEAR });
  assert.match(near.text, /By card \$45\.00/);
  assert.match(near.text, /This hour is \$45\.00 by card — your pack saves you \$5\.00\./);
});

test("pack page past the card window: 'off' and 'unreachable' say no card and offer Pick another time (2026-10-22)", async () => {
  const off = await renderPackPage(null, { sel: FAR, status: 404 });
  assert.ok(off.text.includes("Booking with a court pack isn't available right now."), off.text);
  assert.match(off.text, /Pick another time/);
  assertNoCard(off.html, off.text, "off at +45");
  const down = await renderPackPage(null, { sel: FAR, status: 500 });
  assert.ok(down.text.includes("We couldn't reach the booking system. Try again in a moment."), down.text);
  assert.match(down.text, /Pick another time/);
  assertNoCard(down.html, down.text, "unreachable at +45");
  // Inside the window, as before: the sentence offers the card and the link is there.
  const offNear = await renderPackPage(null, { sel: NEAR, status: 404 });
  assert.ok(offNear.text.includes("You can still pay by card."));
  assert.ok(hrefs(offNear.html).includes(B.bookByCardUrl(NEAR)));
  const downNear = await renderPackPage(null, { sel: NEAR, status: 500 });
  assert.ok(downNear.text.includes(C.PACK_COPY.unreachable));
  assert.ok(hrefs(downNear.html).includes(B.bookByCardUrl(NEAR)));
});

test("after Book, past the card window: no card link or words; the refusals and 'off' show Pick another time, 'try again' keeps Book (2026-10-22)", async () => {
  const { showsPayByCard, showsPickAnother } = await import(PACK_CONFIRM);
  for (const s of [...V.PACK_REFUSALS, "try_again", "slow_down", "off"]) assert.equal(showsPayByCard(s, false), false, s);
  for (const s of [...V.PACK_REFUSALS, "off", "taken", "started", "no_rate", "club_closed_hours"]) {
    assert.equal(showsPickAnother(s, false), true, s);
  }
  for (const s of [null, "try_again", "slow_down", "unknown", "changed", "terms_required", "bad_phone", "signed_out"]) {
    assert.equal(showsPickAnother(s, false), false, String(s));
  }
  // With a card, unchanged (the UI-8 test above).
  assert.equal(showsPayByCard("no_pack", true), true);
  assert.equal(showsPickAnother("no_pack", true), false);
  // The sentences: none names a card when there is none to offer.
  const ctx = { sport: "Badminton", unit: "court", need: 2, email: "a•••@example.com", phone: PHONE, date: FAR.date, today: plusDays(0), card: false };
  const bare = { need: null, sports: [], maxCredits: null, creditsLeft: null, creditsTotal: null, lo: null, hi: null, maxDays: null };
  for (const reason of V.PACK_REFUSALS) {
    for (const extra of [{}, { need: 6, maxCredits: 5 }, { creditsLeft: 1 }, { creditsLeft: 3 }]) {
      assert.doesNotMatch(C.refusalText({ ...bare, reason, ...extra }, ctx), /card/i, `${reason} ${JSON.stringify(extra)}`);
    }
  }
  assert.equal(C.refusalText({ ...bare, reason: "not_enough_credits", creditsLeft: 1 }, ctx),
    "This booking needs 2 credits and your badminton pack has 1 left. Book 1 court for 1 hour.");
  for (const status of ["off", "try_again", "slow_down", "no_pack", "unknown"]) {
    assert.doesNotMatch(C.bookMessage({ status }, PHONE, false), /card/i, status);
  }
  assert.equal(C.bookMessage({ status: "try_again" }, PHONE, false), "That didn't go through, and nothing has changed. Try again in a moment.");
  assert.match(C.bookMessage({ status: "try_again" }, PHONE), /or pay by card\.$/);
  // PackConfirm takes the card from its cardUrl alone, and hands that to both sentence makers.
  const src = readFileSync(join(ROOT, "app/my-bookings/_components/PackConfirm.tsx"), "utf8");
  assert.match(src, /const card = cardUrl !== null;/);
  assert.match(src, /refusalText\([^;]*\{ \.\.\.refusalCtx, card \}\)/);
  assert.match(src, /bookMessage\(result, phone, card\)/);
  assert.match(src, /showsPickAnother\(status, card\)/);
  // …and the page passes null past the window (the same switch as everywhere on it).
  const page = readFileSync(join(ROOT, "app/my-bookings/pack/page.tsx"), "utf8");
  assert.match(page, /const card = cardOpenOn\(sel\.date, today\);/);
  assert.match(page, /cardUrl=\{card \? view\.cardUrl : null\}/);
});

test("PackConfirm without a card (cardUrl null) renders the Book form as before (2026-10-22)", async () => {
  const PackConfirm = (await import(PACK_CONFIRM)).default;
  const html = renderToStaticMarkup(h(PackConfirm, confirmProps({ cardUrl: null, sel: FAR })));
  assert.match(textOf(html), /Book · use 2 credits/);
  assert.doesNotMatch(textOf(html), /by card/i);
});

test("a 10-pack's bars fit a phone: blocks share the row (10–28 px), never a fixed 28 px that overflows (2026-10-22)", async () => {
  const { PackBar } = await import(PACK_CONFIRM);
  const { PackMeter } = await import("../../app/my-bookings/_components/PackCard.tsx");
  const bar = renderToStaticMarkup(h(PackBar, { left: 7, total: 10 }));
  const blocks = [...bar.matchAll(/<span[^>]*data-bar-credit[^>]*>/g)].map((m) => m[0]);
  assert.equal(blocks.length, 10);
  for (const b of blocks) {
    assert.match(b, /\bflex-1\b/);
    assert.match(b, /\bmin-w-\[10px\]/);
    assert.match(b, /\bmax-w-7\b/);
    // No fixed width: the class list holds no bare w-7 (max-w-7 is the cap, not a width).
    assert.equal(b.match(/class="([^"]*)"/)[1].split(/\s+/).includes("w-7"), false);
  }
  const meter = renderToStaticMarkup(h(PackMeter, { left: 7, booked: 1, total: 10 }));
  const segs = [...meter.matchAll(/<span[^>]*data-credit="(\w+)"[^>]*>/g)];
  assert.deepEqual(segs.map((m) => m[1]), ["used", "used", "booked", "left", "left", "left", "left", "left", "left", "left"]);
  for (const [tag] of segs) {
    assert.match(tag, /flex:1 1 0/);
    assert.match(tag, /min-width:10px/);
    assert.match(tag, /max-width:28px/);
    assert.doesNotMatch(tag, /(?:^|[;"])width:28px/);
  }
  // At their narrowest, ten blocks and nine 6 px gaps are 154 px — inside the ember card on a
  // 375 px phone (about 307 px between its padding), where ten fixed 28 px blocks (334 px) were not.
  assert.ok(10 * 10 + 9 * 6 <= 307);
});

test("the pack pages say 'court pack' — no '5-pack' left in the copy or the page code (the offer names are data)", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const f of [
    "lib/my-bookings/copy.ts",
    "app/court-packs/page.tsx", "app/court-packs/BuyForm.tsx", "app/court-packs/terms/page.tsx",
    "app/my-bookings/pack/page.tsx", "app/my-bookings/pack/ready/page.tsx",
    "app/my-bookings/_components/PackConfirm.tsx", "app/my-bookings/_components/PackCard.tsx",
    "app/my-bookings/_components/RequestPanel.tsx", "app/components/Footer.tsx", "app/components/Hero.tsx",
  ]) {
    const src = strip(readFileSync(join(ROOT, f), "utf8"));
    assert.doesNotMatch(src, /5-pack/i, f);
    assert.doesNotMatch(src, /squash (?:court )?pack/i, f);
  }
  // The words the app form shows are the ones this site tells the guest to look for.
  assert.match(C.PACK_BUY_COPY.alreadyHave, /“My court pack”/);
  assert.equal(C.PACK_COPY.title, "Book with my court pack");
  assert.equal(C.PACK_COPY.packsHeading, "My court packs");
  assert.equal(C.PACK_BUY_COPY.readyTitle, "Your court pack is ready");
  assert.equal(C.PACK_BUY_COPY.notOnSale, "Court packs aren't on sale online right now.");
  assert.equal(C.buySportPack("Cricket"), "Buy a cricket court pack");
  assert.equal(C.bookMessage({ status: "off" }), "Booking with a court pack isn't available right now. You can still pay by card.");
  assert.equal(C.checkoutMessage("terms_required"), "Tick the box to agree to the court pack terms.");
  assert.match(C.checkoutMessage("off", PHONE), /^Court packs can't be bought online right now\./);
});

test("buying copy: each offer's own window and price — the 10-pack says 120 days; tiles read 'from' only with several sizes", () => {
  const ten = { sport: "Cricket", credits: 10, windowDays: 120, unusedMonths: 12 };
  const lines = C.whatYouGet(ten);
  assert.equal(lines[0], "10 bookings of one lane for one hour. Two lanes, or two hours, use two.");
  assert.equal(lines[2], "Use within 120 days of your first game. The clock doesn't start until you play.");
  assert.equal(lines[3], "Unused, a pack expires 12 months after purchase.");
  assert.match(C.whatYouGet({ ...ten, credits: 5, windowDays: 60 })[2], /^Use within 60 days/);
  assert.equal(C.sportTilePrice([20000, 35000]), "from $200.00");
  assert.equal(C.sportTilePrice([27500]), "$275.00");
  assert.equal(C.sportTilePrice([]), "");
  assert.deepEqual(C.sizeTile({ credits: 10, priceCents: 35000, perHourCents: 3500, windowDays: 120 }), ["10 credits", "$350.00", "$35.00 an hour", "Books 120 days ahead"]);
  assert.equal(C.sizeTile({ credits: 5, priceCents: 20000, perHourCents: 4000, windowDays: 60 })[3], "Books 60 days ahead");
  assert.equal(C.packSportsLine(["Badminton", "Cricket"]), "Court packs are for badminton and cricket.");
  assert.equal(C.validWindowText(120), "120 days from your first game");
});
