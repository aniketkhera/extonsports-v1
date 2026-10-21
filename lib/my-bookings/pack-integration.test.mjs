/* The court 5-pack, put together, 2026-10-21 (integration of S2 + S3/S4 on S1).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court 5-pack
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
  whenText: "6:00 PM–7:00 PM, Sun, Oct 25", credits: 1, cardTotalCents: 4500, creditValueCents: 4000, savesCents: 500,
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

async function renderPackPage(quoteBody, { signedIn = true } = {}) {
  process.env.EXTON_RELAY_SECRET = "s".repeat(40);
  globalThis.__test = {
    cookies: { [S.PACK_SEL_COOKIE]: S.packSelCookie(SEL).value, ...(signedIn ? { [S.DEVICE_COOKIE]: TOKEN } : {}) },
    headers: { "x-real-ip": "203.0.113.9" },
  };
  const calls = stubFetch(() => ({ status: 200, body: quoteBody }));
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

test("every page and route the pack added under /my-bookings, /api/my-bookings and /api/5-pack is private; /5-pack is not", async () => {
  const cfg = (await import(pathToFileURL(join(ROOT, "next.config.ts")).href)).default;
  const rules = await cfg.headers();
  const isPrivate = (path) =>
    rules.some((r) => matches(r.source, path)
      && r.headers.some((x) => x.key === "Cache-Control" && x.value === "private, no-store")
      && r.headers.some((x) => x.key === "Referrer-Policy" && x.value === "no-referrer"));
  const served = ["my-bookings", "api/my-bookings", "api/5-pack"]
    .flatMap((d) => walk(join(ROOT, "app", ...d.split("/"))))
    .filter((f) => /[\\/](page\.tsx|route\.ts)$/.test(f))
    .map(urlOf);
  for (const p of ["/my-bookings/pack", "/my-bookings/pack/start", "/my-bookings/pack/ready", "/api/my-bookings/pack/book", "/api/5-pack/checkout"]) {
    assert.ok(served.includes(p), `not found: ${p}`);
  }
  for (const p of served) assert.ok(isPrivate(p), `${p} is not under the private headers`);
  for (const p of ["/5-pack", "/5-pack/terms"]) assert.equal(isPrivate(p), false, `${p} is a public page`);
});

/* ── SiteChrome: the booking bubble stays off the buy pages ────────────── */

test("SiteChrome: no booking bubble on /5-pack or its terms; analytics and the beacon stay; elsewhere unchanged", async () => {
  const SiteChrome = (await import("../../app/components/SiteChrome.tsx")).default;
  const names = (pathname) => {
    globalThis.__test = { pathname };
    const out = SiteChrome();
    return out === null ? null : elements(out).map((e) => e.type?.name).filter(Boolean);
  };
  for (const p of ["/5-pack", "/5-pack/terms"]) {
    const got = names(p);
    assert.ok(got, p);
    assert.equal(got.includes("WhatsAppFab"), false, p);
    for (const keep of ["BookingThemeCarry", "Analytics", "TrackBeacon"]) assert.ok(got.includes(keep), `${p}: ${keep}`);
  }
  for (const p of ["/", "/privacy", "/5-packs", "/5-pack-x"]) assert.ok(names(p).includes("WhatsAppFab"), p);
  assert.equal(names("/my-bookings/pack"), null);
  assert.equal(names("/my-bookings"), null);
  // The fragment the chrome returns still renders.
  globalThis.__test = { pathname: "/5-pack" };
  assert.equal(typeof renderToStaticMarkup(h(Fragment, null, SiteChrome())), "string");
});
