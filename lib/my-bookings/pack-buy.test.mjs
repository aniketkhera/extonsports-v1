/* The court pack's buy pages and entry links, 2026-10-21 (S4, orangish-app
   docs/court-packs.md §8.2, §12, §13 and §14).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Owner, 2026-10-20: "let's go with the implentation.." of the Exton court pack. The
   pages and the checkout route are RENDERED and CALLED here, not grepped: a load hook
   transpiles .tsx with the repo's own TypeScript, `next/headers` and `next/navigation`
   are stubs reading globalThis.__test, and global fetch is stubbed — no call leaves this
   machine and nothing reaches Stripe. What they pin, each of which `tsc` would wave
   through when broken:
     • PACKS_LIVE gates every entry link (Hero, Footer, sitemap): the pages deploy
       unlinked and fail closed (design §12, steps 4 and 8);
     • /api/court-packs/* and /my-bookings/pack/* carry the private, no-store headers;
     • Pay goes to Stripe only through this site's route, which refuses cross-site calls,
       limits per IP before the platform is called, never calls it without a ticked box,
       and follows nothing but https://checkout.stripe.com;
     • /court-packs and /court-packs/terms say "not on sale" / "can't show" — never a
       broken form — when the platform is off, down or unconfigured;
     • /my-bookings/pack/ready relays only a cs_ id, and says "ready" only when the
       platform says active.

   2026-10-22 (Aniket): renamed to "court packs" (/5-pack → /court-packs, redirected
   permanently), and two sizes per sport — Badminton 5-pack $200 / 10-pack $350, Cricket
   5-pack $275 / 10-pack $500; 60 days for a 5-pack, 120 for a 10-pack; no squash. The
   fixtures are those four offers, and what is pinned on top: a tile per sport and per
   size, the 10-pack choosable, the size in the POST, each offer's OWN window on the page
   and the receipt, and a squash ?sport= that is never quietly turned into badminton. */
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
/** The radios of one group (name="sport" or name="size"): their values, and which are checked —
 *  whatever order React writes the attributes in. */
const radios = (html, name) =>
  [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes(`name="${name}"`))
    .map((tag) => ({ value: tag.match(/value="([^"]*)"/)?.[1], checked: /\schecked(=""|\s|\/|>)/.test(tag) }));
const checked = (html, name) => radios(html, name).filter((r) => r.checked).map((r) => r.value);
const checkedSport = (html) => checked(html, "sport");
const checkedSize = (html) => checked(html, "size");

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

// The four Exton offers of 2026-10-22 (Aniket), as the platform's offers endpoint answers
// them: sorted by sport then size, each with its own window, no top-level window, no squash.
const OFFERS_JSON = {
  offers: [
    { sportId: BADMINTON, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 60, unusedMonths: 12 },
    { sportId: BADMINTON, sport: "Badminton", name: "Badminton 10-pack", credits: 10, priceCents: 35000, perHourCents: 3500, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 120, unusedMonths: 12 },
    { sportId: CRICKET, sport: "Cricket", name: "Cricket 5-pack", credits: 5, priceCents: 27500, perHourCents: 5500, cardStandardCents: 5500, cardPeakCents: 6500, windowDays: 60, unusedMonths: 12 },
    { sportId: CRICKET, sport: "Cricket", name: "Cricket 10-pack", credits: 10, priceCents: 50000, perHourCents: 5000, cardStandardCents: 5500, cardPeakCents: 6500, windowDays: 120, unusedMonths: 12 },
  ],
  terms: {
    version: "2026-10-22-1",
    title: "Exton Sports — court pack terms",
    sections: [
      { heading: "One sport", body: "A pack covers one sport." },
      { heading: "Refunds", body: ["Packs are non-refundable.", "The club may refund at its discretion."] },
    ],
  },
};
const OFFERS = V.toOffers(OFFERS_JSON);
assert.ok(OFFERS && OFFERS.offers.length === 4, "offer fixture must pass the allow-list");
const offerOf = (sportId, credits) => OFFERS.offers.find((o) => o.sportId === sportId && o.credits === credits);

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

test("the court pack entry links ship switched OFF", () => {
  // design §12 step 8: PACKS_LIVE flips only after the owner's live test and the key-box
  // revoke (Aniket, 2026-10-20).
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(B.PACK_PATH, "/court-packs");
});

test("the Hero's rate card and the Footer link to /court-packs only behind PACKS_LIVE, as 'Court packs'", () => {
  const hero = code(read("app/components/Hero.tsx"));
  const gate = hero.indexOf("{PACKS_LIVE && (");
  assert.ok(gate > 0, "Hero: no PACKS_LIVE-gated link");
  const uses = [...hero.matchAll(/\bPACK_PATH\b/g)].map((m) => m.index).filter((i) => !/import/.test(hero.slice(hero.lastIndexOf("\n", i), i)));
  assert.equal(uses.length, 1, "Hero: PACK_PATH used outside the one gated link");
  assert.ok(uses[0] > gate && uses[0] - gate < 400, "Hero: the court pack link is not inside the PACKS_LIVE block");
  // Same tab: it is this site's own page.
  assert.doesNotMatch(hero.slice(gate, gate + 400), /target=/);
  // 2026-10-22: the link names the product, not one size of it.
  assert.match(hero.slice(gate, gate + 600), />\s*Court packs\s*<\/a>/);
  assert.doesNotMatch(hero.slice(gate, gate + 600), /5-pack/);

  const footer = code(read("app/components/Footer.tsx"));
  assert.match(footer, /\.\.\.\(PACKS_LIVE \? \[\{ label: "Court packs", href: PACK_PATH \}\] : \[\]\)/);
  assert.equal([...footer.matchAll(/\bPACK_PATH\b/g)].length, 2, "Footer: PACK_PATH outside the gate"); // import + the gated entry
});

test("the sitemap lists /court-packs only behind PACKS_LIVE — and does not list it now", async () => {
  const src = code(read("app/sitemap.ts"));
  assert.match(src, /\.\.\.\(PACKS_LIVE\s*\?\s*\[\s*\{\s*path: PACK_PATH/);
  const sitemap = (await mod("app/sitemap.ts")).default;
  const urls = sitemap().map((e) => e.url);
  assert.ok(urls.includes("https://www.extonsports.com/"));
  assert.equal(urls.some((u) => /court-packs|5-pack/.test(u)), false);
});

test("nothing else links to the pack pages around the switch (no literal /court-packs or /5-pack path)", () => {
  const files = [...walk(join(ROOT, "app", "components")), join(ROOT, "app", "page.tsx"), join(ROOT, "app", "layout.tsx"), join(ROOT, "app", "sitemap.ts")]
    .filter((f) => /\.(ts|tsx)$/.test(f));
  for (const f of files) assert.doesNotMatch(code(readFileSync(f, "utf8")), /["'`]\/(?:5-pack|court-packs)/, f);
});

/* ── /5-pack → /court-packs (2026-10-22) ────────────────────────────────── */

test("next.config: /5-pack and /5-pack/terms redirect PERMANENTLY to the court-packs pages, above the apex rule", async () => {
  const cfg = (await mod("next.config.ts")).default;
  const rules = await cfg.redirects();
  const at = (source) => rules.findIndex((r) => r.source === source);
  assert.deepEqual(rules[at("/5-pack")], { source: "/5-pack", destination: B.PACK_PATH, permanent: true });
  assert.deepEqual(rules[at("/5-pack/terms")], { source: "/5-pack/terms", destination: B.PACK_TERMS_PATH, permanent: true });
  // Plain rules — no `has`, no query rewriting — so Next carries ?sport=&credits= through
  // (node_modules/next/dist/docs …/redirects.md: "any query values … will be passed through").
  for (const s of ["/5-pack", "/5-pack/terms"]) assert.equal("has" in rules[at(s)] || "missing" in rules[at(s)], false, s);
  // Before the catch-all apex → www rule, which would otherwise match first on the apex.
  const apex = rules.findIndex((r) => r.source === "/:path*");
  assert.ok(apex > at("/5-pack") && apex > at("/5-pack/terms"));
  // Nothing redirects the new pages anywhere.
  assert.equal(rules.some((r) => r.source === B.PACK_PATH || r.source === B.PACK_TERMS_PATH), false);
});

/* ── /packs → /court-packs (2026-10-26) ─────────────────────────────────── */

test("next.config: /packs (the flyer's QR) and /packs/* redirect TEMPORARILY to the court-packs pages, above the apex rule", async () => {
  const cfg = (await mod("next.config.ts")).default;
  const rules = await cfg.redirects();
  const at = (source) => rules.findIndex((r) => r.source === source);
  // 307, not 308: the address is printed, and a cached 308 could never be re-pointed.
  assert.deepEqual(rules[at("/packs")], { source: "/packs", destination: B.PACK_PATH, permanent: false });
  assert.deepEqual(rules[at("/packs/:path*")], { source: "/packs/:path*", destination: `${B.PACK_PATH}/:path*`, permanent: false });
  for (const s of ["/packs", "/packs/:path*"]) assert.equal("has" in rules[at(s)] || "missing" in rules[at(s)], false, s);
  const apex = rules.findIndex((r) => r.source === "/:path*");
  assert.ok(apex > at("/packs") && apex > at("/packs/:path*"));
});

/* ── the private headers ────────────────────────────────────────────────── */

test("/api/court-packs/* and /my-bookings/pack/* answer private, no-store, no-referrer, noindex", async () => {
  const cfg = (await mod("next.config.ts")).default;
  const rules = await cfg.headers();
  const PRIVATE = [
    { key: "Cache-Control", value: "private, no-store" },
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ];
  for (const source of ["/api/court-packs/:path*", "/my-bookings/:path*", "/api/my-bookings/:path*"]) {
    const r = rules.find((x) => x.source === source);
    assert.ok(r, `no header rule for ${source}`);
    for (const want of PRIVATE) assert.ok(r.headers.some((x) => x.key === want.key && x.value === want.value), `${source}: ${want.key}`);
  }
  // The rule moved WITH the relay (2026-10-22): none is left on the old path.
  assert.equal(rules.some((x) => x.source.startsWith("/api/5-pack")), false);
  // /my-bookings/pack/ready sits under /my-bookings/:path* — the receipt page is private.
  assert.ok(B.PACK_BOOK_PATH.startsWith("/my-bookings/"));
});

/* ── POST /api/court-packs/checkout ─────────────────────────────────────── */

function buyReq(body, headers = {}) {
  return new Request(`${OWN}/api/court-packs/checkout`, {
    method: "POST",
    headers: { origin: OWN, "content-type": "application/json", "x-real-ip": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });
}
const BUY = { sportId: BADMINTON, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "2026-10-22-1" };
const checkoutRoute = () => mod("app/api/court-packs/checkout/route.ts");

test("checkout: the relay lives at /api/court-packs/checkout — the 5-pack one is gone (2026-10-22)", () => {
  assert.ok(statSync(join(ROOT, "app", "api", "court-packs", "checkout", "route.ts")).isFile());
  assert.throws(() => statSync(join(ROOT, "app", "api", "5-pack")), /ENOENT/);
  assert.throws(() => statSync(join(ROOT, "app", "5-pack")), /ENOENT/);
});

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
    // 2026-10-22: the size is a whole number, or the call never leaves the site.
    [{ ...BUY, credits: undefined }, "bad_size"],
    [{ ...BUY, credits: "10" }, "bad_size"],
    [{ ...BUY, credits: 0 }, "bad_size"],
    [{ ...BUY, credits: 21 }, "bad_size"],
    [{ ...BUY, credits: 2.5 }, "bad_size"],
    [{ ...BUY, termsVersion: "" }, "bad_request"],
    [{ ...BUY, termsVersion: "x".repeat(41) }, "bad_request"],
  ];
  for (const [body, error] of cases) {
    // More cases than the 8-per-10-minutes limit allows from one IP (the size checks,
    // 2026-10-22); the limit has its own test below.
    G.resetLimits();
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
  // The size the guest chose goes with the sport (the contract: {club, sportId, credits,
  // email, agreeTerms, termsVersion}); never a price.
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    club: "exton-sports", sportId: BADMINTON, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "2026-10-22-1",
  });
});

test("checkout: a whole number the platform does not sell is ITS refusal (bad_size), relayed as such", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 400, body: { error: "bad_size" } }));
  const { POST } = await checkoutRoute();
  const res = await POST(buyReq({ ...BUY, credits: 7 }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { error: "bad_size" });
  assert.equal(JSON.parse(calls[0].init.body).credits, 7);
  assert.match(C.checkoutMessage("bad_size"), /isn't on sale right now/);
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
  const src = code(read("app/api/court-packs/checkout/route.ts"));
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

async function renderForm(initialSportId, initialCredits = null, offers = OFFERS.offers) {
  const Form = (await mod("app/court-packs/BuyForm.tsx")).default;
  return renderToStaticMarkup(h(Form, { offers, termsVersion: OFFERS.terms.version, initialSportId, initialCredits }));
}

test("BuyForm: a tile per sport, then a tile per SIZE with its own price — four offers, four unique tiles (2026-10-22)", async () => {
  const html = await renderForm(CRICKET);
  const t = textOf(html);
  // Two sports, each once, each "from" its smallest price.
  assert.deepEqual(radios(html, "sport").map((r) => r.value), [BADMINTON, CRICKET]);
  assert.match(t, /Badminton from \$200\.00/);
  assert.match(t, /Cricket from \$275\.00/);
  assert.deepEqual(checkedSport(html), [CRICKET]);
  // The chosen sport's two sizes, each with its own price and per-hour; the smallest picked.
  assert.deepEqual(radios(html, "size").map((r) => r.value), ["5", "10"]);
  assert.match(t, /5 credits \$275\.00 \$55\.00 an hour/);
  assert.match(t, /10 credits \$500\.00 \$50\.00 an hour/);
  assert.deepEqual(checkedSize(html), ["5"]);
  // Exactly one radio checked per group: one badminton tile can no longer light another.
  assert.equal(checkedSport(html).length + checkedSize(html).length, 2);
  assert.match(t, /Per hour \$55\.00 — peak hours are \$65\.00 by card/);
  for (const line of C.whatYouGet(offerOf(CRICKET, 5))) assert.match(t, new RegExp(esc(line)));
  assert.match(t, /5 bookings of one lane for one hour\./);
  assert.match(t, /Use within 60 days of your first game/);
  assert.match(t, /Pay \$275\.00/);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.finePrint)));
});

test("BuyForm: ?credits=10 picks the 10-pack — ITS price, per-hour, credits and ITS 120 days, never the 5-pack's 60", async () => {
  for (const [sport, price, perHour, unit] of [[BADMINTON, "350.00", "35.00", "court"], [CRICKET, "500.00", "50.00", "lane"]]) {
    const html = await renderForm(sport, 10);
    const t = textOf(html);
    assert.deepEqual(checkedSport(html), [sport]);
    assert.deepEqual(checkedSize(html), ["10"]);
    assert.match(t, new RegExp(`Pay \\$${esc(price)}`));
    assert.match(t, new RegExp(`Per hour \\$${esc(perHour)}`));
    assert.match(t, new RegExp(`10 bookings of one ${unit} for one hour\\.`));
    assert.match(t, /Use within 120 days of your first game/);
    assert.doesNotMatch(t, /within 60 days/);
    assert.match(t, /Unused, a pack expires 12 months after purchase\./);
    assert.match(t, /(Badminton|Cricket) 10-pack/);
  }
});

/* ── the booking horizon, 2026-10-22 ─────────────────────────────────────
   Aniket: "let's make the pack bookings upto 60 days for 5 pack and 120 days for 10 pack..
   cancel and re-booking is fine." A pack books as far ahead as its own window; card bookings
   stay at the club's 30 days. Each size tile says how far ahead it books, and a "Booking and
   changes" box says how booking and changing work — from the offers' own windows. */

const BOX_EXTON = [
  "Book up to 60 days ahead with a 5-pack, or 120 with a 10-pack (card bookings open 30 days ahead).",
  "Every game must fall within your pack's 60 or 120 days from your first game.",
  "To change a booking, cancel it and book again.",
  "Cancel online up to 24 hours before and the credit goes back on your pack.",
  // The page has no club phone of its own to pass, so the box carries the site's fallback.
  `Inside 24 hours, the desk can help: call ${C.FALLBACK_PHONE}.`,
  "A no-show uses the credit.",
  "A credit that comes back keeps your pack's dates.",
];

test("BuyForm: each size tile says how far ahead it books — 60 days for the 5-pack, 120 for the 10-pack (2026-10-22)", async () => {
  for (const sport of [BADMINTON, CRICKET]) {
    const t = textOf(await renderForm(sport));
    assert.match(t, /5 credits \$[\d.,]+ \$[\d.,]+ an hour Books 60 days ahead/, sport);
    assert.match(t, /10 credits \$[\d.,]+ \$[\d.,]+ an hour Books 120 days ahead/, sport);
  }
});

test("BuyForm: the 'Booking and changes' box, in Aniket's points, with the club's phone a tel: link (2026-10-22)", async () => {
  const html = await renderForm(BADMINTON);
  const t = textOf(html);
  assert.match(t, /Booking and changes/);
  for (const line of BOX_EXTON) assert.ok(t.includes(line), line);
  assert.ok(hrefs(html).includes("tel:+14842522523"));
  // The same box whichever size is chosen — it describes the sport's packs, not one of them.
  const ten = textOf(await renderForm(CRICKET, 10));
  for (const line of BOX_EXTON) assert.ok(ten.includes(line), line);
  // Its own section, after "What you get" and before the email.
  assert.ok(t.indexOf("What you get") < t.indexOf("Booking and changes"));
  assert.ok(t.indexOf("Booking and changes") < t.indexOf(C.PACK_BUY_COPY.emailHelp));
  // Nothing is chosen (squash ?sport=): no box, as there is no "What you get".
  assert.doesNotMatch(textOf(await renderForm(SQUASH)), /Booking and changes|days ahead/);
});

test("BuyForm: the tiles and the box take every window from the offers — change them on the platform and the page follows", async () => {
  // A platform whose windows are not 60 and 120: no number on the page may be a site constant.
  const odd = OFFERS.offers.map((o) => ({ ...o, windowDays: o.credits === 5 ? 45 : 90 }));
  const t = textOf(await renderForm(BADMINTON, null, odd));
  assert.match(t, /5 credits .* Books 45 days ahead/);
  assert.match(t, /10 credits .* Books 90 days ahead/);
  assert.ok(t.includes("Book up to 45 days ahead with a 5-pack, or 90 with a 10-pack (card bookings open 30 days ahead)."));
  assert.ok(t.includes("Every game must fall within your pack's 45 or 90 days from your first game."));
  assert.doesNotMatch(t, /\b(60|120) days\b/);
  // One size on sale: the box names that size only.
  const five = OFFERS.offers.filter((o) => o.sportId === CRICKET && o.credits === 5);
  const one = textOf(await renderForm(CRICKET, null, five));
  assert.ok(one.includes("Book up to 60 days ahead with a 5-pack (card bookings open 30 days ahead)."));
  assert.ok(one.includes("Every game must fall within your pack's 60 days from your first game."));
  assert.doesNotMatch(one, /10-pack|120/);
});

test("bookingAndChanges: sizes in order, one window said once, 'an' where English wants it (2026-10-22)", () => {
  const P = C.FALLBACK_PHONE;
  assert.deepEqual(C.bookingAndChanges([{ credits: 5, windowDays: 60 }, { credits: 10, windowDays: 120 }]), BOX_EXTON);
  assert.equal(C.bookingAndChanges([{ credits: 5, windowDays: 60 }, { credits: 10, windowDays: 60 }], P)[0],
    "Book up to 60 days ahead with a court pack (card bookings open 30 days ahead).");
  assert.equal(C.bookingAndChanges([{ credits: 5, windowDays: 60 }, { credits: 8, windowDays: 90 }, { credits: 10, windowDays: 120 }], P)[0],
    "Book up to 60 days ahead with a 5-pack, 90 with an 8-pack, or 120 with a 10-pack (card bookings open 30 days ahead).");
  assert.equal(C.bookingAndChanges([{ credits: 5, windowDays: 60 }, { credits: 8, windowDays: 90 }, { credits: 10, windowDays: 120 }], P)[1],
    "Every game must fall within your pack's 60, 90 or 120 days from your first game.");
  assert.equal(C.bookingAndChanges([{ credits: 11, windowDays: 60 }], P)[0],
    "Book up to 60 days ahead with an 11-pack (card bookings open 30 days ahead).");
  // The card window and the cutoff are parameters, so a sentence never disagrees with them.
  const other = C.bookingAndChanges([{ credits: 5, windowDays: 60 }], "610-555-0100", 14, 48);
  assert.match(other[0], /\(card bookings open 14 days ahead\)\.$/);
  assert.equal(other[3], "Cancel online up to 48 hours before and the credit goes back on your pack.");
  assert.equal(other[4], "Inside 48 hours, the desk can help: call 610-555-0100.");
  assert.equal(C.CARD_WINDOW_DAYS, 30);
  // No sizes: only the lines that do not depend on one.
  assert.deepEqual(C.bookingAndChanges([], P), BOX_EXTON.slice(2));
});

test("BuyForm: a size the sport does not sell picks its smallest; changing sport keeps the size when it can (initialChoice / pickSize)", async () => {
  const F = await mod("app/court-packs/BuyForm.tsx");
  for (const c of [null, 7, 20, 0]) assert.deepEqual(checkedSize(await renderForm(BADMINTON, c)), ["5"], String(c));
  assert.deepEqual(F.initialChoice(OFFERS.offers, CRICKET, 10), { sportId: CRICKET, credits: 10 });
  assert.deepEqual(F.initialChoice(OFFERS.offers, null, 10), { sportId: BADMINTON, credits: 10 });
  assert.deepEqual(F.initialChoice(OFFERS.offers, CRICKET, 3), { sportId: CRICKET, credits: 5 });
  // Switching sport (pickSize is what the sport tile's onChange runs): 10 stays 10 …
  assert.equal(F.pickSize(OFFERS.offers, CRICKET, 10), 10);
  // … unless the new sport has no 10-pack.
  const onlyFive = OFFERS.offers.filter((o) => !(o.sportId === CRICKET && o.credits === 10));
  assert.equal(F.pickSize(onlyFive, CRICKET, 10), 5);
  assert.equal(F.pickSize(OFFERS.offers, SQUASH, 5), null);
});

test("BuyForm: Pay posts the chosen offer's sport AND size to this site's relay — never a price", () => {
  const src = code(read("app/court-packs/BuyForm.tsx"));
  assert.match(src, /postJson\("\/api\/court-packs\/checkout", \{\s*sportId: offer\.sportId,\s*credits: offer\.credits,\s*email,\s*agreeTerms: true,\s*termsVersion,\s*\}\)/);
  assert.doesNotMatch(src, /priceCents:\s*offer|amount/);
  // Tiles are keyed by the pair, so React never merges the 5-pack and the 10-pack of a sport.
  assert.match(src, /key=\{`\$\{o\.sportId\}:\$\{o\.credits\}`\}/);
  // No page-wide window: what you get is the chosen offer's own.
  assert.match(src, /whatYouGet\(offer\)/);
  assert.doesNotMatch(src, /\bwindowDays\b|\bunusedMonths\b/);
});

test("BuyForm: the corrected copy — no 'proposed' tags, the COURT PACK terms (not the booking waiver)", async () => {
  const html = await renderForm(BADMINTON);
  const t = textOf(html);
  assert.doesNotMatch(t, /45 days|proposed/i);
  assert.doesNotMatch(t, /disclosure and waiver/);
  assert.match(t, /I agree to the court pack terms/);
  assert.ok(hrefs(html).includes("/court-packs/terms"));
  assert.match(t, /Pay \$200\.00/);
  assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.emailHelp)));
});

test("BuyForm: no ?sport picks the first sport; the email field is a real email field", async () => {
  assert.deepEqual(checkedSport(await renderForm(null)), [BADMINTON]);
  assert.deepEqual(checkedSize(await renderForm(null)), ["5"]);
  const html = await renderForm(null);
  const email = html.match(/<input[^>]*name="email"[^>]*>/)?.[0] ?? "";
  assert.match(email, /type="email"/);
  assert.match(email, /autoComplete="email"|autocomplete="email"/);
  // The address lives in the form only — never in the page's links.
  assert.equal(hrefs(html).some((u) => /@/.test(u)), false);
});

test("BuyForm: a ?sport= not on sale (squash, since 2026-10-22) picks NOTHING and says what packs are for — never a quiet switch to badminton", async () => {
  for (const s of [SQUASH, "not-a-sport", "aaaaaaaa-0000-4000-8000-000000000000"]) {
    const html = await renderForm(s);
    const t = textOf(html);
    assert.deepEqual(checkedSport(html), [], String(s));
    assert.deepEqual(radios(html, "size"), [], String(s));
    assert.match(t, /Court packs are for badminton and cricket\./, String(s));
    // No offer is chosen, so Pay cannot be pressed and names no price.
    assert.match(html, /<button[^>]*type="submit"[^>]*disabled/);
    assert.match(t, new RegExp(esc(C.PACK_BUY_COPY.choose)));
    assert.doesNotMatch(t, /Pay \$/);
    assert.doesNotMatch(t, /squash/i);
  }
  // A real sport says nothing of the sort.
  assert.doesNotMatch(textOf(await renderForm(CRICKET)), /Court packs are for/);
});

test("BuyForm: 'Already have a pack? Book a court…' quotes the app's switch, 'My court pack', and goes to the form in pack mode", async () => {
  const html = await renderForm(CRICKET);
  assert.match(textOf(html), /Already have a pack\? Book a court and choose “My court pack” when you pay\./);
  assert.ok(hrefs(html).includes(B.bookWithPackUrl(CRICKET)));
  // With no sport chosen, the form opens for the guest to pick.
  assert.ok(hrefs(await renderForm(SQUASH)).includes(B.bookWithPackUrl()));
});

test("BuyForm.stripeHref: the browser follows https://checkout.stripe.com and nothing else", async () => {
  const { stripeHref } = await mod("app/court-packs/BuyForm.tsx");
  assert.equal(stripeHref(STRIPE), new URL(STRIPE).href);
  for (const bad of [
    "http://checkout.stripe.com/c/pay/x", "https://checkout.stripe.com.evil.example/x", "https://evil.example/?checkout.stripe.com",
    "javascript:alert(1)", "https://user:pw@checkout.stripe.com/x", "https://checkout.stripe.com:8443/x", "//checkout.stripe.com/x",
    "", 42, null, undefined, "x".repeat(5000),
  ]) {
    assert.equal(stripeHref(bad), null, String(bad).slice(0, 60));
  }
});

/* ── /court-packs ───────────────────────────────────────────────────────── */

async function renderBuyPage(searchParams = {}) {
  const Page = (await mod("app/court-packs/page.tsx")).default;
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(searchParams) }));
}

test("/court-packs: the public offers, the mock's header, and the form — ?sport= and ?credits= pick the tiles", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: OFFERS_JSON }));
  const html = await renderBuyPage({ sport: CRICKET, credits: "10" });
  const t = textOf(html);
  for (const s of [C.PACK_BUY_COPY.chip, C.PACK_BUY_COPY.title, C.PACK_BUY_COPY.titleAccent, C.PACK_BUY_COPY.lead]) {
    assert.match(t, new RegExp(esc(s)));
  }
  assert.match(t, /Court packs\./);
  assert.match(t, /Five or ten one-hour bookings/);
  assert.deepEqual(checkedSport(html), [CRICKET]);
  assert.deepEqual(checkedSize(html), ["10"]);
  assert.match(t, /Pay \$500\.00/);
  assert.match(t, /Use within 120 days of your first game/);
  // 2026-10-22: how far ahead each size books, and the Booking and changes box.
  assert.match(t, /Books 60 days ahead/);
  assert.match(t, /Books 120 days ahead/);
  for (const line of BOX_EXTON) assert.ok(t.includes(line), line);
  assert.equal(calls.length, 1);
  // The PUBLIC variant: no desk=1 (that one needs only court_packs, not court_packs_public).
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports");
  assert.equal(calls[0].init.headers["x-exton-client-ip"], "203.0.113.9");
});

test("/court-packs: a ?credits= that is not a whole number is ignored (the smallest size); a squash ?sport= picks nothing", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  stubFetch(() => ({ status: 200, body: OFFERS_JSON }));
  for (const credits of ["ten", "10.5", "-10", "010", ["10", "5"], ""]) {
    assert.deepEqual(checkedSize(await renderBuyPage({ sport: BADMINTON, credits })), ["5"], JSON.stringify(credits));
  }
  const squash = await renderBuyPage({ sport: SQUASH, credits: "5" });
  assert.deepEqual(checkedSport(squash), []);
  assert.match(textOf(squash), /Court packs are for badminton and cricket\./);
});

test("/court-packs fails closed: off, down, a bad answer or no secret all read 'not on sale', with no form", async () => {
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

test("/court-packs: stays out of search until PACKS_LIVE, with its own canonical and the product's name", async () => {
  const { metadata } = await mod("app/court-packs/page.tsx");
  assert.equal(metadata.alternates.canonical, "/court-packs");
  assert.equal(metadata.title, "Court packs");
  assert.equal(B.PACKS_LIVE, false);
  assert.equal(metadata.robots.index, false);
  const terms = (await mod("app/court-packs/terms/page.tsx")).metadata;
  assert.equal(terms.alternates.canonical, "/court-packs/terms");
  assert.equal(terms.title, "Court pack terms");
  assert.equal(terms.description, "The terms of an Exton Sports Center court pack.");
  assert.equal(terms.robots.index, false);
});

/* ── /court-packs/terms ─────────────────────────────────────────────────── */

async function renderTerms() {
  const Page = (await mod("app/court-packs/terms/page.tsx")).default;
  return renderToStaticMarkup(await Page());
}

test("/court-packs/terms: the platform's pack terms, as text, from the DESK variant (a desk sale links here first)", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: OFFERS_JSON }));
  const html = await renderTerms();
  const t = textOf(html);
  assert.match(t, /Exton Sports — court pack terms/);
  assert.match(t, /One sport A pack covers one sport\./);
  assert.match(t, /Packs are non-refundable\. The club may refund at its discretion\./);
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/offers?club=exton-sports&desk=1");
  // Text only: whatever the sections said, no link of theirs reaches the page.
  assert.equal(hrefs(html).some((u) => /platform\.test|javascript:/.test(u)), false);
});

test("/court-packs/terms: off, down or unconfigured — it says so, with the phone, and shows no terms", async () => {
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
// A 5-pack purchase from a platform that sends neither sportId nor windowDays: the page
// matches it to the Badminton 5-pack offer by sport and size.
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

test("ready: a 10-pack is 'Valid 120 days' — matched to its offer by sport AND size, never the sport's first (5-pack) offer (2026-10-22)", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const TEN = { state: "active", sport: "Badminton", credits: 10, priceCents: 35000, maskedEmail: "a•••@example.com", sportId: BADMINTON, name: "Badminton 10-pack" };
  stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: TEN } : { status: 200, body: OFFERS_JSON }));
  const html = await renderReady({ cs: CS });
  const t = textOf(html);
  assert.match(t, /Pack Badminton 10-pack/);
  assert.match(t, /Credits 10 of 10/);
  assert.match(t, /Valid 120 days from your first game/);
  assert.doesNotMatch(t, /60 days/);
  assert.match(t, /Paid \$350\.00 by card/);
  assert.equal([...html.matchAll(/data-credit="left"/g)].length, 10);
  // An older answer (no sport id or name): the offer is still found by sport AND size.
  stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: { ...TEN, sportId: undefined, name: undefined } } : { status: 200, body: OFFERS_JSON }));
  const old = await renderReady({ cs: CS });
  assert.match(textOf(old), /Pack Badminton 10-pack/);
  assert.match(textOf(old), /Valid 120 days from your first game/);
  assert.ok(hrefs(old).includes(B.bookWithPackUrl(BADMINTON)));
  // No size from the platform and two sizes on sale: no guess at the window, but the sport still.
  stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: { ...TEN, credits: undefined, name: undefined } } : { status: 200, body: OFFERS_JSON }));
  const unsized = await renderReady({ cs: CS });
  assert.doesNotMatch(textOf(unsized), /days from your first game/);
  assert.ok(hrefs(unsized).includes(B.bookWithPackUrl(BADMINTON)));
});

test("ready: the purchase's own windowDays wins, and then the offers are not asked for at all (2026-10-22)", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const TEN = { state: "active", sport: "Cricket", credits: 10, priceCents: 50000, maskedEmail: "a•••@example.com", sportId: CRICKET, name: "Cricket 10-pack", windowDays: 120 };
  const calls = stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: TEN } : { status: 200, body: OFFERS_JSON }));
  const t = textOf(await renderReady({ cs: CS }));
  assert.match(t, /Valid 120 days from your first game/);
  assert.match(t, /Pack Cricket 10-pack/);
  assert.equal(calls.length, 1, calls.map((c) => c.url).join(" "));
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
