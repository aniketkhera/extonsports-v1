/* The court 5-pack's buy pages and entry links, 2026-10-21 (S4, orangish-app
   docs/court-packs.md §8.2, §12, §13 and §14).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court 5-pack. The
   pages and the checkout route are RENDERED and CALLED here, not grepped: a load hook
   transpiles .tsx with the repo's own TypeScript, `next/headers` and `next/navigation`
   are stubs reading globalThis.__test, and global fetch is stubbed — no call leaves this
   machine and nothing reaches Stripe. What they pin, each of which `tsc` would wave
   through when broken:
     • PACKS_LIVE gates every entry link (Hero, Footer, sitemap): the pages deploy
       unlinked and fail closed (design §12, steps 4 and 8);
     • /api/5-pack/* and /my-bookings/pack/* carry the private, no-store headers;
     • Pay goes to Stripe only through this site's route, which refuses cross-site calls,
       limits per IP before the platform is called, never calls it without a ticked box,
       and follows nothing but https://checkout.stripe.com;
     • /5-pack and /5-pack/terms say "not on sale" / "can't show" — never a broken form —
       when the platform is off, down or unconfigured;
     • /my-bookings/pack/ready relays only a cs_ id, and says "ready" only when the
       platform says active. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ── the harness (as lib/my-bookings/pack-list.test.mjs) ─────────────────── */

const stub = (src) => "data:text/javascript," + encodeURIComponent(src);
const STUBS = {
  "next/headers": stub(`
    export async function cookies() {
      const jar = globalThis.__test?.cookies ?? {};
      return { get: (n) => (Object.hasOwn(jar, n) ? { name: n, value: jar[n] } : undefined) };
    }
    export async function headers() { return new Headers(globalThis.__test?.headers ?? {}); }`),
  "next/navigation": stub(`
    export function useRouter() {
      return globalThis.__test?.router ?? { refresh() {}, push() {}, replace() {}, back() {}, forward() {}, prefetch() {} };
    }`),
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

process.env.ORANGISH_API_BASE = "https://platform.test";
delete process.env.EXTON_RELAY_SECRET;

const { createElement: h } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const V = await import("./view.ts");
const C = await import("./copy.ts");
const B = await import("../booking.ts");
const G = await import("./guard.ts");

const mod = (p) => import(`../../${p}`);

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
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The sport radio that is checked, by its value — whatever order React writes the attributes in. */
const checkedSport = (html) =>
  [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\schecked(=""|\s|\/|>)/.test(tag))
    .map((tag) => tag.match(/value="([^"]*)"/)?.[1]);

const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/* ── fixtures ──────────────────────────────────────────────────────────── */

const SECRET = "s".repeat(40);
const OWN = "https://www.extonsports.com";
const BADMINTON = "bfff160c-1111-4c2b-9e1f-0a1b2c3d4e5f";
const SQUASH = "3dda7884-2222-4c2b-9e1f-0a1b2c3d4e5f";
const CRICKET = "4b0c1d1b-3333-4c2b-9e1f-0a1b2c3d4e5f";
const STRIPE = "https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0";
const CS = "cs_test_a1B2c3";

const OFFERS_JSON = {
  offers: [
    { sportId: BADMINTON, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500 },
    { sportId: SQUASH, sport: "Squash", name: "Squash 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500 },
    { sportId: CRICKET, sport: "Cricket", name: "Cricket 5-pack", credits: 5, priceCents: 27500, perHourCents: 5500, cardStandardCents: 5500, cardPeakCents: 6500 },
  ],
  terms: {
    version: "cp-2026-10-20",
    title: "Exton Sports 5-pack terms",
    sections: [
      { heading: "One sport", body: "A pack covers one sport." },
      { heading: "Refunds", body: ["Packs are non-refundable.", "The club may refund at its discretion."] },
    ],
  },
  windowDays: 60,
  unusedMonths: 12,
};
const OFFERS = V.toOffers(OFFERS_JSON);
assert.ok(OFFERS && OFFERS.offers.length === 3, "offer fixture must pass the allow-list");

function stubFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const r = await responder(String(url), init);
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body ?? null), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return calls;
}

beforeEach(() => {
  globalThis.__test = { cookies: {}, headers: { "x-real-ip": "203.0.113.9" } };
  delete process.env.EXTON_RELAY_SECRET;
  G.resetLimits();
  stubFetch(() => new Error("no network in tests"));
});

/* ── the switch: PACKS_LIVE gates every entry link ──────────────────────── */

test("the 5-pack entry links ship switched OFF", () => {
  // design §12 step 8: PACKS_LIVE flips only after the owner's live test and the key-box
  // revoke (Aniket, 2026-10-20).
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(B.PACK_PATH, "/5-pack");
});

test("the Hero's rate card and the Footer link to /5-pack only behind PACKS_LIVE", () => {
  const hero = code(read("app/components/Hero.tsx"));
  const gate = hero.indexOf("{PACKS_LIVE && (");
  assert.ok(gate > 0, "Hero: no PACKS_LIVE-gated link");
  const uses = [...hero.matchAll(/\bPACK_PATH\b/g)].map((m) => m.index).filter((i) => !/import/.test(hero.slice(hero.lastIndexOf("\n", i), i)));
  assert.equal(uses.length, 1, "Hero: PACK_PATH used outside the one gated link");
  assert.ok(uses[0] > gate && uses[0] - gate < 400, "Hero: the 5-pack link is not inside the PACKS_LIVE block");
  // Same tab: it is this site's own page.
  assert.doesNotMatch(hero.slice(gate, gate + 400), /target=/);

  const footer = code(read("app/components/Footer.tsx"));
  assert.match(footer, /\.\.\.\(PACKS_LIVE \? \[\{ label: "5-pack", href: PACK_PATH \}\] : \[\]\)/);
  assert.equal([...footer.matchAll(/\bPACK_PATH\b/g)].length, 2, "Footer: PACK_PATH outside the gate"); // import + the gated entry
});

test("the sitemap lists /5-pack only behind PACKS_LIVE — and does not list it now", async () => {
  const src = code(read("app/sitemap.ts"));
  assert.match(src, /\.\.\.\(PACKS_LIVE\s*\?\s*\[\s*\{\s*path: PACK_PATH/);
  const sitemap = (await mod("app/sitemap.ts")).default;
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.includes("https://www.extonsports.com/"));
  assert.equal(urls.some((u) => /5-pack/.test(u)), false);
});

test("nothing else links to the pack pages around the switch (no literal /5-pack path)", () => {
  const files = [...walk(join(ROOT, "app", "components")), join(ROOT, "app", "page.tsx"), join(ROOT, "app", "layout.tsx"), join(ROOT, "app", "sitemap.ts")]
    .filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of files) assert.doesNotMatch(code(readFileSync(f, "utf8")), /["'`]\/5-pack/, f);
});

/* ── the private headers ────────────────────────────────────────────────── */

test("/api/5-pack/* and /my-bookings/pack/* answer private, no-store, no-referrer, noindex", async () => {
  const cfg = (await mod("next.config.ts")).default;
  const rules = await cfg.headers();
  const PRIVATE = [
    { key: "Cache-Control", value: "private, no-store" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
  for (const source of ["/api/5-pack/:path*", "/my-bookings/:path*", "/api/my-bookings/:path*"]) {
    const r = rules.find((x) => x.source === source);
    assert.ok(r, `no header rule for ${source}`);
    for (const want of PRIVATE) assert.ok(r.headers.some((x) => x.key === want.key && x.value === want.value), `${source}: ${want.key}`);
  }
  // /my-bookings/pack/ready sits under /my-bookings/:path* — the receipt page is private.
  assert.ok(B.PACK_BOOK_PATH.startsWith("/my-bookings/"));
});

/* ── POST /api/5-pack/checkout ──────────────────────────────────────────── */

function buyReq(body, headers = {}) {
  return new Request(`${OWN}/api/5-pack/checkout`, {
    method: "POST",
    headers: { origin: OWN, "content-type": "application/json", "x-real-ip": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });
}
const BUY = { sportId: BADMINTON, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-2026-10-20" };
const checkoutRoute = () => mod("app/api/5-pack/checkout/route.ts");

test("checkout: a cross-site call is refused before anything else", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  const { POST } = await checkoutRoute();
  for (const hdrs of [{ origin: "https://evil.example" }, { origin: "" }, { "content-type": "text/plain" }, { "sec-fetch-site": "cross-site" }]) {
    const res = await POST(buyReq(BUY, hdrs));
    assert.equal(res.status, 403, JSON.stringify(hdrs));
  }
  assert.equal(calls.length, 0);
});

test("checkout: no ticked box, no platform call — and a bad email or sport never leaves the site", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  const { POST } = await checkoutRoute();
  const cases = [
    [{ ...BUY, agreeTerms: false }, "terms_required"],
    [{ ...BUY, agreeTerms: "true" }, "terms_required"],
    [{ ...BUY, email: "not-an-email" }, "bad_email"],
    [{ ...BUY, sportId: "badminton" }, "bad_sport"],
    [{ ...BUY, termsVersion: "" }, "bad_request"],
    [{ ...BUY, termsVersion: "x".repeat(41) }, "bad_request"],
  ];
  for (const [body, error] of cases) {
    const res = await POST(buyReq(body));
    assert.equal(res.status, 400, error);
    assert.deepEqual(await res.json(), { error });
  }
  assert.equal(calls.length, 0);
});

test("checkout: a good request is relayed once, with the secret and the visitor's IP, and answers only the Stripe URL", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { url: STRIPE, packId: "never-shown" } }));
  const { POST } = await checkoutRoute();
  const res = await POST(buyReq({ ...BUY, email: "  guest@example.com ", extra: "dropped" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { url: STRIPE });
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/checkout");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["x-exton-relay-secret"], SECRET);
  assert.equal(calls[0].init.headers["x-exton-client-ip"], "203.0.113.9");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    club: "exton-sports", sportId: BADMINTON, email: "guest@example.com", agreeTerms: true, termsVersion: "cp-2026-10-20",
  });
});

test("checkout: the platform's refusals come back as words the form knows; a URL off Stripe is never followed", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const { POST } = await checkoutRoute();
  for (const [reply, error] of [
    [{ status: 409, body: { error: "terms_changed" } }, "terms_changed"],
    [{ status: 409, body: { error: "club_not_payable" } }, "club_not_payable"],
    [{ status: 400, body: { error: "bad_email" } }, "bad_email"],
    [{ status: 404, body: { error: "not_available" } }, "off"],
    [{ status: 429, body: { error: "slow_down" } }, "slow_down"],
    [{ status: 503 }, "try_again"],
    [{ status: 200, body: { url: "https://evil.example/pay" } }, "try_again"],
    [{ status: 200, body: { url: "http://checkout.stripe.com/c/pay/cs_test_1" } }, "try_again"],
    [new Error("timeout"), "try_again"],
  ]) {
    G.resetLimits();
    stubFetch(() => reply);
    const res = await POST(buyReq(BUY));
    assert.equal(res.status, 200, String(error));
    assert.deepEqual(await res.json(), { error }, JSON.stringify(reply));
  }
});

test("checkout: with no relay secret nothing is called, and the guest is told nothing was charged", async () => {
  const calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  const { POST } = await checkoutRoute();
  const res = await POST(buyReq(BUY));
  assert.deepEqual(await res.json(), { error: "try_again" });
  assert.equal(calls.length, 0);
  assert.match(C.checkoutMessage("try_again"), /you haven't been charged/);
});

test("checkout: the per-IP limit runs before the platform is called", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  const { POST } = await checkoutRoute();
  for (let i = 0; i < 8; i++) assert.equal((await POST(buyReq(BUY))).status, 200, `call ${i + 1}`);
  const res = await POST(buyReq(BUY));
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: "slow_down" });
  assert.equal(calls.length, 8);
  // Another visitor is not held up by the first.
  assert.equal((await POST(buyReq(BUY, { "x-real-ip": "198.51.100.7" }))).status, 200);
});

test("checkout route: guards in the house order, a limit before the call, and time for the platform's 25 s", () => {
  const src = code(read("app/api/5-pack/checkout/route.ts"));
  const order = ["refuseCrossSite(req)", "readJsonBody(req)", "hit(`buy:${ip}`", "packCheckout("].map((s) => src.indexOf(s));
  assert.ok(order.every((i) => i > 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(src, /packCheckout\(\{[^}]*\}, ip\)/);
  const max = Number(src.match(/export const maxDuration = (\d+)/)?.[1]);
  assert.ok(max >= 30 && max <= 60, `maxDuration ${max}`);
  for (const n of [...src.matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1])) {
    assert.ok(["runtime", "dynamic", "maxDuration", "POST"].includes(n), n);
  }
});

/* ── the buy form ───────────────────────────────────────────────────────── */

async function renderForm(initialSportId) {
  const Form = (await mod("app/5-pack/BuyForm.tsx")).default;
  return renderToStaticMarkup(h(Form, {
    offers: OFFERS.offers, termsVersion: OFFERS.terms.version,
    windowDays: OFFERS.windowDays, unusedMonths: OFFERS.unusedMonths, initialSportId,
  }));
}

test("BuyForm: a tile per sport with its price; the chosen sport's per-hour line, what you get, and Pay", async () => {
  const html = await renderForm(CRICKET);
  const t = textOf(html);
  for (const o of OFFERS.offers) assert.match(t, new RegExp(`${o.sport} ${esc(C.money(o.priceCents))}`));
  assert.deepEqual(checkedSport(html), [CRICKET]);
  assert.match(t, /Per hour \$55\.00 — peak hours are \$65\.00 by card/);
  for (const line of C.whatYouGet(OFFERS.offers[2], 60, 12)) assert.match(t, new RegExp(esc(line)));
  assert.match(t, /5 bookings of one lane for one hour\./);
  assert.match(t, /Use within 60 days of your first game/);
  assert.match(t, /Pay \$275\.00/);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.finePrint)));
});

test("BuyForm: the corrected copy — 60 days, no 'proposed' tags, the PACK terms (not the booking waiver)", async () => {
  const html = await renderForm(BADMINTON);
  const t = textOf(html);
  assert.doesNotMatch(t, /45 days|proposed/i);
  assert.doesNotMatch(t, /disclosure and waiver/);
  assert.match(t, /I agree to the 5-pack terms/);
  assert.ok(hrefs(html).includes("/5-pack/terms"));
  assert.match(t, /Pay \$200\.00/);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.emailHelp)));
});

test("BuyForm: an unknown or missing ?sport picks the first offer; the email field is a real email field", async () => {
  for (const s of [null, "not-a-sport", "aaaaaaaa-0000-4000-8000-000000000000"]) {
    assert.deepEqual(checkedSport(await renderForm(s)), [BADMINTON], String(s));
  }
  const html = await renderForm(null);
  const email = html.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? "";
  assert.match(email, /type="email"/);
  assert.match(email, /autoComplete="email"|autocomplete="email"/);
  // The address lives in the form only — never in the page's links.
  assert.equal(hrefs(html).some((u) => /@/.test(u)), false);
});

test("BuyForm: 'Already have a pack? Book a court…' goes to the app's form in pack mode", async () => {
  const html = await renderForm(SQUASH);
  assert.match(textOf(html), /Already have a pack\? Book a court and choose “My 5-pack” when you pay\./);
  assert.ok(hrefs(html).includes(B.bookWithPackUrl(SQUASH)));
});

test("BuyForm.stripeHref: the browser follows https://checkout.stripe.com and nothing else", async () => {
  const { stripeHref } = await mod("app/5-pack/BuyForm.tsx");
  assert.equal(stripeHref(STRIPE), new URL(STRIPE).href);
  for (const bad of [
    "http://checkout.stripe.com/c/pay/x", "https://checkout.stripe.com.evil.example/x", "https://evil.example/?checkout.stripe.com",
    "javascript:alert(1)", "https://user:pw@checkout.stripe.com/x", "https://checkout.stripe.com:8443/x", "//checkout.stripe.com/x",
    "", 42, null, undefined, "x".repeat(5000),
  ]) {
    assert.equal(stripeHref(bad), null, String(bad).slice(0, 60));
  }
});

/* ── /5-pack ────────────────────────────────────────────────────────────── */

async function renderBuyPage(searchParams = {}) {
  const Page = (await mod("app/5-pack/page.tsx")).default;
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
}

test("/5-pack: the public offers, the mock's header, and the form — ?sport= picks the tile", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: OFFERS_JSON }));
  const html = await renderBuyPage({ sport: SQUASH });
  const t = textOf(html);
  for (const s of [C.PACK_BUY_COPY.chip, C.PACK_BUY_COPY.title, C.PACK_BUY_COPY.titleAccent, C.PACK_BUY_COPY.lead]) {
    assert.match(t, new RegExp(esc(s)));
  }
  assert.deepEqual(checkedSport(html), [SQUASH]);
  assert.match(t, /Pay \$200\.00/);
  assert.equal(calls.length, 1);
  // The PUBLIC variant: no desk=1 (that one needs only court_packs, not court_packs_public).
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports");
  assert.equal(calls[0].init.headers["x-exton-client-ip"], "203.0.113.9");
});

test("/5-pack fails closed: off, down, a bad answer or no secret all read 'not on sale', with no form", async () => {
  for (const [reply, secret] of [
    [{ status: 404, body: { error: "not_available" } }, SECRET],
    [{ status: 500 }, SECRET],
    [{ status: 200, body: { offers: "nope" } }, SECRET],
    [{ status: 200, body: { ...OFFERS_JSON, offers: [] } }, SECRET],
    [new Error("timeout"), SECRET],
    [{ status: 200, body: OFFERS_JSON }, null],
  ]) {
    if (secret) process.env.EXTON_RELAY_SECRET = secret;
    else delete process.env.EXTON_RELAY_SECRET;
    const calls = stubFetch(() => reply);
    const t = textOf(await renderBuyPage());
    assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.notOnSale)), JSON.stringify(reply));
    assert.doesNotMatch(t, /Pay \$/);
    if (!secret) assert.equal(calls.length, 0);
  }
});

test("/5-pack: stays out of search until PACKS_LIVE, with its own canonical", async () => {
  const { metadata } = await mod("app/5-pack/page.tsx");
  assert.equal(metadata.alternates.canonical, "/5-pack");
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(metadata.robots.index, false);
  const terms = (await mod("app/5-pack/terms/page.tsx")).metadata;
  assert.equal(terms.alternates.canonical, "/5-pack/terms");
  assert.equal(terms.robots.index, false);
});

/* ── /5-pack/terms ──────────────────────────────────────────────────────── */

async function renderTerms() {
  const Page = (await mod("app/5-pack/terms/page.tsx")).default;
  return renderToStaticMarkup(await Page());
}

test("/5-pack/terms: the platform's pack terms, as text, from the DESK variant (a desk sale links here first)", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: OFFERS_JSON }));
  const html = await renderTerms();
  const t = textOf(html);
  assert.match(t, /Exton Sports 5-pack terms/);
  assert.match(t, /One sport A pack covers one sport\./);
  assert.match(t, /Packs are non-refundable\. The club may refund at its discretion\./);
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports&desk=1");
  // Text only: whatever the sections said, no link of theirs reaches the page.
  assert.equal(hrefs(html).some((u) => /platform\.test|javascript:/.test(u)), false);
});

test("/5-pack/terms: off, down or unconfigured — it says so, with the phone, and shows no terms", async () => {
  for (const [reply, secret] of [[{ status: 404 }, SECRET], [{ status: 500 }, SECRET], [{ status: 200, body: OFFERS_JSON }, null]]) {
    if (secret) process.env.EXTON_RELAY_SECRET = secret;
    else delete process.env.EXTON_RELAY_SECRET;
    const calls = stubFetch(() => reply);
    const html = await renderTerms();
    const t = textOf(html);
    assert.match(t, new RegExp(esc(C.FALLBACK_PHONE)));
    assert.ok(hrefs(html).some((u) => u.startsWith("tel:")));
    assert.doesNotMatch(t, /One sport/);
    if (!secret) assert.equal(calls.length, 0);
  }
});

/* ── /my-bookings/pack/ready?cs= ────────────────────────────────────────── */

async function renderReady(searchParams) {
  const Page = (await mod("app/my-bookings/pack/ready/page.tsx")).default;
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
}
const PURCHASE = (state) => ({ state, sport: "Badminton", credits: 5, priceCents: 20000, maskedEmail: "a•••@example.com" });

test("ready: an active pack — the mock's rows, 'Book your first game' for its sport, and the receipt note", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: PURCHASE("active") } : { status: 200, body: OFFERS_JSON }));
  const html = await renderReady({ cs: CS });
  const t = textOf(html);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.readyTitle)));
  assert.match(t, /Pack Badminton 5-pack/);
  assert.match(t, /Credits 5 of 5/);
  assert.match(t, /Valid 60 days from your first game/);
  assert.match(t, /Paid \$200\.00 by card/);
  assert.match(t, /Email a•••@example\.com/);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.receiptNote)));
  assert.ok(hrefs(html).includes(B.bookWithPackUrl(BADMINTON)));
  assert.match(t, new RegExp(C.PACK_BUY_COPY.bookFirst));
  assert.deepEqual([...html.matchAll(/data-credit="(\w+)"/g)].map((m) => m[1]), ["left", "left", "left", "left", "left"]);
  // The purchase first, with the cs_ id in the BODY; the offers only once it is active.
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/purchase");
  assert.deepEqual(JSON.parse(calls[0].init.body), { club: "exton-sports", sessionId: CS });
  assert.equal(calls[1].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports&desk=1");
});

test("ready: active but the offers are down — still ready, with the rows it can vouch for", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: PURCHASE("active") } : { status: 500 }));
  const html = await renderReady({ cs: CS });
  const t = textOf(html);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.readyTitle)));
  assert.match(t, /Paid \$200\.00 by card/);
  assert.doesNotMatch(t, /days from your first game/);
  // No sport id to hand the form: it opens in pack mode and the guest picks the sport.
  assert.ok(hrefs(html).includes(B.bookWithPackUrl()));
});

test("ready: pending shows 'setting up' and polls; the offers are not asked for", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: PURCHASE("pending") }));
  const t = textOf(await renderReady({ cs: CS }));
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.pendingTitle)));
  assert.doesNotMatch(t, new RegExp(esc(C.PACK_BUY_COPY.readyTitle)));
  assert.equal(calls.length, 1);
});

test("ready: unknown, down, or a cs that is not a Checkout id — 'we can't find that payment yet', and a bad id is never sent", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const unknown = C.purchaseUnknown(C.FALLBACK_PHONE);
  for (const reply of [{ status: 200, body: PURCHASE("unknown") }, { status: 500 }, { status: 200, body: { state: "paid" } }]) {
    stubFetch(() => reply);
    const t = textOf(await renderReady({ cs: CS }));
    assert.match(t, new RegExp(esc(unknown)), JSON.stringify(reply));
    assert.doesNotMatch(t, new RegExp(esc(C.PACK_BUY_COPY.readyTitle)));
  }
  for (const cs of [undefined, "", "pi_123", "cs_live_", "cs_test_abc/../x", ["cs_test_a", "cs_test_b"], "cs_test_" + "a".repeat(251)]) {
    const calls = stubFetch(() => ({ status: 200, body: PURCHASE("active") }));
    const html = await renderReady(cs === undefined ? {} : { cs });
    assert.match(textOf(html), new RegExp(esc(unknown)), String(cs));
    assert.ok(hrefs(html).includes("tel:+14842522523"));
    assert.equal(calls.length, 0, String(cs));
  }
});

test("PurchaseStatus: 'setting up' as a live status, polling every 3 s for 30 s through a server refresh", async () => {
  const PS = await mod("app/my-bookings/pack/ready/PurchaseStatus.tsx");
  assert.equal(PS.POLL_EVERY_MS, 3000);
  assert.equal(PS.POLL_FOR_MS, 30_000);
  const html = renderToStaticMarkup(h(PS.default, { maskedEmail: "a•••@example.com", phone: C.FALLBACK_PHONE }));
  assert.match(html, /role="status"/);
  assert.match(textOf(html), new RegExp(esc(C.PACK_BUY_COPY.pendingTitle)));
  assert.doesNotMatch(textOf(html), /Not there in 10 minutes/);
  const src = code(read("app/my-bookings/pack/ready/PurchaseStatus.tsx"));
  assert.match(src, /router\.refresh\(\)/);
  assert.match(src, /purchasePendingLate\(/);
});
