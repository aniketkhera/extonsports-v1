/* A coupon code on the court pack buy page, 2026-10-29.
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   Aniket, 2026-10-29, on /court-packs: "on this, let's add a textbox that accepts a COUPON
   CODE." Then "actually, change the coupon code to DIWALI2026 - and change the expiration
   date to Sun Nov 8th midnight." Then "make the discount 5% pls..". The platform holds the
   code, its percent and its end (orangish-app supabase/migrate_court_pack_coupons.sql); this
   site holds none of them, so the fixtures below are the platform's answers as its contract
   writes them — POST /api/public/court-packs/quote → 200 {code, percentOff, validUntil,
   prices:[{sportId, credits, listPriceCents, priceCents}]} · 400 {error:'coupon_invalid'} · 404
   · 429 · 503 — and the four Exton prices at 5%: Badminton 5-pack $200 → $190, 10-pack $350 →
   $332.50; Cricket 5-pack $275 → $261.25, 10-pack $500 → $475, in exact cents.

   The app endpoints are not in production yet, so nothing here calls them: global fetch is
   stubbed and the pages are rendered with react-dom/server (the pack-buy harness). What is
   pinned, each of which `tsc` would wave through when broken:
     • the code is read the platform's way (trim, upper, ^[A-Z0-9]{4,32}$), and a bad one never
       leaves this site;
     • a quote reaches a page only through the allow-list — the code asked about, prices below
       their list price, in whole cents a credit, and as far off as the percent says;
     • the relay and the two routes: the secret and the IP, the guards in the house order, the
       limit before the call, one refusal for every code the platform will not take;
     • the form: the field after the email and before the tick, every price on it the
       coupon's once applied — tiles struck through, "You save $17.50", "Pay $332.50" — and a
       price the quote does not cover left at its list price, with no code sent for it;
     • the ready page's Coupon row, and the theme-safe classes. */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/* ── the harness (as lib/my-bookings/pack-buy.test.mjs), plus one knob ─────────
   BuyForm.tsx's applied-coupon state hook starts from globalThis.__test.coupon, so the
   APPLIED form can be rendered without a browser: nothing is pressed and nothing is posted.
   Exactly one such hook, or the knob would turn nothing and the rendered tests be vacuous. */

const COUPON_HOOK = "useState<CouponQuoteView | null>(null)";
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
    let src = readFileSync(file, "utf8");
    if (file.endsWith("BuyForm.tsx")) {
      if (src.split(COUPON_HOOK).length !== 2) throw new Error(`${file}: expected the one applied-coupon hook, ${COUPON_HOOK}`);
      src = src.replace(COUPON_HOOK, "useState<CouponQuoteView | null>(globalThis.__test?.coupon ?? null)");
    }
    const out = ts.transpileModule(src, {
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
const K = await import("./coupon.ts");
const V = await import("./view.ts");
const C = await import("./copy.ts");
const P = await import("./platform.ts");
const G = await import("./guard.ts");

const mod = (p) => import(`../../${p}`);
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function textOf(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:a|span|b|strong|em|s)\b[^>]*>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
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
const CRICKET = "4b0c1d1b-3333-4c2b-9e1f-0a1b2c3d4e5f";
const STRIPE = "https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpxYHZxWjA0";
const CODE = "DIWALI2026";

// The four Exton offers (2026-10-22), as pack-buy.test.mjs has them.
const OFFERS_JSON = {
  offers: [
    { sportId: BADMINTON, sport: "Badminton", name: "Badminton 5-pack", credits: 5, priceCents: 20000, perHourCents: 4000, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 60, unusedMonths: 12 },
    { sportId: BADMINTON, sport: "Badminton", name: "Badminton 10-pack", credits: 10, priceCents: 35000, perHourCents: 3500, cardStandardCents: 4000, cardPeakCents: 4500, windowDays: 120, unusedMonths: 12 },
    { sportId: CRICKET, sport: "Cricket", name: "Cricket 5-pack", credits: 5, priceCents: 27500, perHourCents: 5500, cardStandardCents: 5500, cardPeakCents: 6500, windowDays: 60, unusedMonths: 12 },
    { sportId: CRICKET, sport: "Cricket", name: "Cricket 10-pack", credits: 10, priceCents: 50000, perHourCents: 5000, cardStandardCents: 5500, cardPeakCents: 6500, windowDays: 120, unusedMonths: 12 },
  ],
  terms: { version: "2026-10-22-1", title: "Exton Sports — court pack terms", sections: [{ heading: "One sport", body: "A pack covers one sport." }] },
};
const OFFERS = V.toOffers(OFFERS_JSON);
assert.ok(OFFERS && OFFERS.offers.length === 4, "offer fixture must pass the allow-list");
const offerOf = (sportId, credits) => OFFERS.offers.find((o) => o.sportId === sportId && o.credits === credits);

// The app's quote 200, exactly as the contract writes it (5%, valid until Sun 8 Nov 2026
// 11:59 PM Eastern — valid_until 2026-11-09T00:00:00-05:00, exclusive).
const QUOTE_JSON = {
  code: CODE,
  percentOff: 5,
  validUntil: "2026-11-09T05:00:00.000Z",
  prices: [
    { sportId: BADMINTON, credits: 5, listPriceCents: 20000, priceCents: 19000 },
    { sportId: BADMINTON, credits: 10, listPriceCents: 35000, priceCents: 33250 },
    { sportId: CRICKET, credits: 5, listPriceCents: 27500, priceCents: 26125 },
    { sportId: CRICKET, credits: 10, listPriceCents: 50000, priceCents: 47500 },
  ],
};
const QUOTE = V.toCouponQuote(QUOTE_JSON, CODE);
assert.ok(QUOTE, "quote fixture must pass the allow-list");

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
  globalThis.__test = { cookies: {}, headers: { "x-real-ip": "203.0.113.9" }, coupon: null };
  delete process.env.EXTON_RELAY_SECRET;
  G.resetLimits();
  stubFetch(() => new Error("no network in tests"));
});

/* ── the code, read the platform's way ─────────────────────────────────── */

test("normaliseCouponCode: blank is no coupon; trimmed and upper-cased; the platform's shape or 'bad'", () => {
  for (const none of [undefined, null, "", "   ", "\t\n"]) assert.deepEqual(K.normaliseCouponCode(none), { kind: "none" }, JSON.stringify(none));
  for (const [raw, want] of [["DIWALI2026", CODE], [" diwali2026 ", CODE], ["Diwali2026", CODE], ["ABCD", "ABCD"], ["A".repeat(32), "A".repeat(32)]]) {
    assert.deepEqual(K.normaliseCouponCode(raw), { kind: "ok", code: want }, raw);
  }
  for (const bad of ["ABC", "A".repeat(33), "DIWALI-2026", "DIWALI 2026", "diwali_2026", "DÏWALI2026", 2026, true, {}, ["DIWALI2026"]]) {
    assert.deepEqual(K.normaliseCouponCode(bad), { kind: "bad" }, JSON.stringify(bad));
  }
  // The same shape as the platform's CHECK (court_pack_coupons.code ~ '^[A-Z0-9]{4,32}$').
  assert.equal(K.COUPON_CODE_RE.source, "^[A-Z0-9]{4,32}$");
});

test("normaliseCouponCode: ASCII first, THEN upper case — the platform's order, so non-ASCII never upper-cases INTO a code (2026-10-29 review)", () => {
  // Each of these upper-cases to ASCII under String.prototype.toUpperCase, and so passed the
  // shape when the site upper-cased first; orangish-app's normaliseCouponCode refuses them.
  for (const raw of ["dıwalı2026", "DıWALı2026", "ßßßß", "ﬀﬀ", "ﬁﬁ"]) {
    assert.ok(/^[A-Z0-9]{4,32}$/.test(raw.toUpperCase()), `${raw} is the trap: it upper-cases into the shape`);
    assert.deepEqual(K.normaliseCouponCode(raw), { kind: "bad" }, raw);
    assert.equal(K.couponFromQuery(raw), null, `?code=${raw}`);
  }
  // ASCII is untouched by the order: the same answers as before.
  assert.deepEqual(K.normaliseCouponCode(" diwali2026\t"), { kind: "ok", code: CODE });
  const src = code(read("lib/my-bookings/coupon.ts"));
  assert.ok(src.indexOf("/^[A-Za-z0-9]{4,32}$/.test(typed)") < src.indexOf("typed.toUpperCase()"), "the ASCII test runs before upper-casing");
});

test("couponTyped: the field upper-cases ASCII a–z only, so it never turns a typed 'ı' or 'ß' into ASCII (2026-10-29 review)", () => {
  assert.equal(K.couponTyped("diwali2026"), CODE);
  assert.equal(K.couponTyped("dıwalı2026"), "DıWALı2026");
  assert.equal(K.couponTyped("ßßßß"), "ßßßß");
  // …and what it leaves is refused, not quietly made into a code.
  assert.deepEqual(K.normaliseCouponCode(K.couponTyped("dıwalı2026")), { kind: "bad" });
});

test("?code=: one string, upper-cased, the coupon shape or nothing; the field types in capitals", () => {
  assert.equal(K.couponFromQuery("diwali2026"), CODE);
  assert.equal(K.couponFromQuery(CODE), CODE);
  for (const v of [undefined, null, "", "x", "DIWALI 2026", [CODE, CODE], ["DIWALI2026"], "A".repeat(33)]) {
    assert.equal(K.couponFromQuery(v), null, JSON.stringify(v));
  }
  assert.equal(K.couponTyped("diwali2026"), CODE);
  assert.equal(K.couponTyped("x".repeat(60)).length, 40);
});

test("no coupon is written on this site: no code, percent or end date in the pack pages' code", () => {
  // Aniket changed the code, its date and its percent within the hour (2026-10-29); every one
  // is the platform's row. The code appears in comments quoting him, never in code.
  const files = [
    ...walk(join(ROOT, "app", "court-packs")),
    ...walk(join(ROOT, "app", "api", "court-packs")),
    ...walk(join(ROOT, "app", "my-bookings")),
    ...walk(join(ROOT, "lib", "my-bookings")),
  ].filter((f) => /\.(ts|tsx)$/.test(f));
  assert.ok(files.length >= 25, String(files.length));
  for (const f of files) {
    const src = code(readFileSync(f, "utf8"));
    assert.doesNotMatch(src, /DIWALI|percentOff\s*[:=]\s*\d|2026-11-0[89]/i, f);
  }
});

/* ── the quote, through the allow-list ─────────────────────────────────── */

test("toCouponQuote: the contract's answer — the four Exton prices at 5%, in exact cents", () => {
  assert.deepEqual(QUOTE, QUOTE_JSON);
  assert.deepEqual(QUOTE.prices.map((p) => p.priceCents), [19000, 33250, 26125, 47500]);
  // Anything else the platform sends never reaches a page.
  const extra = V.toCouponQuote({ ...QUOTE_JSON, couponId: "never", prices: QUOTE_JSON.prices.map((p) => ({ ...p, offerId: "x" })) }, CODE);
  assert.deepEqual(extra, QUOTE_JSON);
});

test("toCouponQuote: refuses an answer about another code, a bad percent or date, or no prices", () => {
  assert.equal(V.toCouponQuote(QUOTE_JSON, "OTHER2026"), null);
  assert.equal(V.toCouponQuote(QUOTE_JSON, "diwali2026"), null, "the asked code is already normalised");
  for (const percentOff of [0, 51, 5.5, "5", null]) assert.equal(V.toCouponQuote({ ...QUOTE_JSON, percentOff }, CODE), null, String(percentOff));
  for (const validUntil of ["", "soon", 1762664400000, null, "x".repeat(41)]) assert.equal(V.toCouponQuote({ ...QUOTE_JSON, validUntil }, CODE), null, String(validUntil));
  for (const prices of [[], null, "all", {}, Array(41).fill(QUOTE_JSON.prices[0])]) assert.equal(V.toCouponQuote({ ...QUOTE_JSON, prices }, CODE), null);
  assert.equal(V.toCouponQuote(null, CODE), null);
  assert.equal(V.toCouponQuote([QUOTE_JSON], CODE), null);
});

test("toCouponQuote: ONE bad row rejects the whole answer — never a coupon applied to some sizes", () => {
  const withRow = (i, patch) => ({ ...QUOTE_JSON, prices: QUOTE_JSON.prices.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  for (const [patch, why] of [
    [{ priceCents: 35000 }, "not below the list price"],
    [{ priceCents: 36000 }, "above the list price"],
    [{ priceCents: 33251 }, "not whole cents a credit"],
    [{ listPriceCents: 35001 }, "list not whole cents a credit"],
    [{ priceCents: 31500 }, "10% off, while the answer says 5%"],
    [{ priceCents: 33240 }, "a cent a credit further off than rounding"],
    [{ sportId: "badminton" }, "not a sport id"],
    [{ credits: 0 }, "no credits"],
    [{ credits: 21 }, "over the platform's bound"],
    [{ priceCents: 0 }, "free"],
    [{ priceCents: -1 }, "negative"],
  ]) {
    assert.equal(V.toCouponQuote(withRow(1, patch), CODE), null, why);
  }
  // A repeated (sport, size): the site cannot tell which price is real.
  assert.equal(V.toCouponQuote({ ...QUOTE_JSON, prices: [...QUOTE_JSON.prices, QUOTE_JSON.prices[0]] }, CODE), null);
});

test("toCouponQuote: rounding DOWN to a whole cent a credit (cp_coupon_unit, the buyer's favour) passes; up never does", () => {
  // A 5-pack at $33.33 a credit: 3333 × 95 / 100 = 3166.35 → 3166 a credit, 15830 the pack.
  const odd = { sportId: BADMINTON, credits: 5, listPriceCents: 16665, priceCents: 15830 };
  assert.ok(V.toCouponQuote({ ...QUOTE_JSON, prices: [odd] }, CODE));
  assert.equal(V.toCouponQuote({ ...QUOTE_JSON, prices: [{ ...odd, priceCents: 15835 }] }, CODE), null, "rounded up");
});

/* ── laying the quote over the offers ──────────────────────────────────── */

test("couponPriceFor / pricedOffer: each offer's coupon price, per hour and saving — Badminton 10-pack $332.50, $17.50 off", () => {
  const want = [
    [BADMINTON, 5, 20000, 19000, 3800, 1000],
    [BADMINTON, 10, 35000, 33250, 3325, 1750],
    [CRICKET, 5, 27500, 26125, 5225, 1375],
    [CRICKET, 10, 50000, 47500, 4750, 2500],
  ];
  for (const [sport, credits, list, price, perHour, saves] of want) {
    const o = offerOf(sport, credits);
    assert.deepEqual(K.couponPriceFor(o, QUOTE), { listPriceCents: list, priceCents: price, perHourCents: perHour, savesCents: saves });
    const p = K.pricedOffer(o, QUOTE);
    assert.equal(p.offer.priceCents, price);
    assert.equal(p.offer.perHourCents, perHour);
    // Everything else is the offer's own, and the offer itself is untouched.
    assert.equal(p.offer.windowDays, o.windowDays);
    assert.equal(p.offer.name, o.name);
    assert.equal(o.priceCents, list);
  }
  // The 10-pack's coupon credit is under the $35 badminton hire floor — allowed for coupons
  // only, by the coupon's own percent (Aniket: "Allow it, coupons only"; 3500 × 95 / 100).
  assert.equal(K.couponPriceFor(offerOf(BADMINTON, 10), QUOTE).perHourCents, (3500 * 95) / 100);
});

test("couponPriceFor: no quote, no row, or a stale list price → no coupon for that offer (its list price, and no code sent)", () => {
  const o = offerOf(BADMINTON, 10);
  assert.equal(K.couponPriceFor(o, null), null);
  assert.deepEqual(K.pricedOffer(o, null), { offer: o, coupon: null });
  const noTen = { ...QUOTE, prices: QUOTE.prices.filter((p) => !(p.sportId === BADMINTON && p.credits === 10)) };
  assert.equal(K.couponPriceFor(o, noTen), null);
  // The page's offers changed after it loaded: never two packs' numbers side by side.
  assert.equal(K.couponPriceFor({ ...o, priceCents: 36000 }, QUOTE), null);
  assert.equal(K.couponCoversAny(OFFERS.offers, QUOTE), true);
  assert.equal(K.couponCoversAny(OFFERS.offers.map((x) => ({ ...x, priceCents: x.priceCents + 100 })), QUOTE), false);
  assert.equal(K.couponCoversAny(OFFERS.offers, null), false);
});

/* ── the words ─────────────────────────────────────────────────────────── */

test("copy: the applied line, the saving, Pay, the ready row and the one refusal sentence", () => {
  assert.equal(C.couponApplied(CODE, 5), "DIWALI2026 — 5% off");
  assert.equal(C.youSave(1750), "You save $17.50");
  assert.equal(C.payButton(33250), "Pay $332.50");
  assert.equal(C.payButton(26125), "Pay $261.25");
  assert.equal(C.money(26125), "$261.25", "exact cents, no rounding");
  assert.equal(C.couponPaidLine(CODE, 35000, 33250), "DIWALI2026 — you saved $17.50");
  assert.equal(C.PACK_BUY_COPY.couponLabel, "Coupon code");
  assert.equal(C.PACK_BUY_COPY.couponInvalid, "That code isn't valid or has expired.");
  assert.equal(C.couponMessage("coupon_invalid"), "That code isn't valid or has expired.");
  assert.equal(C.checkoutMessage("coupon_invalid"), "That code isn't valid or has expired. Nothing was charged.");
  // Network and the rest: the form's existing try-again sentence, the phone a tel: link.
  assert.equal(C.couponMessage("try_again"), C.checkoutMessage("try_again"));
  assert.equal(C.couponMessage("slow_down"), C.COPY.tooMany);
  assert.equal(C.couponMessage("off"), C.checkoutMessage("off"));
  assert.match(C.couponMessage("try_again"), /you haven't been charged/);
});

/* ── the browser's reading of this site's own quote route ──────────────── */

test("fromSiteCouponQuote: the quote re-checked for the code asked; only the platform (or the shape) says 'not valid'", () => {
  assert.deepEqual(V.fromSiteCouponQuote(200, QUOTE_JSON, CODE), { ok: true, view: QUOTE });
  for (const [status, body, error] of [
    [200, { error: "coupon_invalid" }, "coupon_invalid"],
    [200, { error: "off" }, "off"],
    [200, { error: "slow_down" }, "slow_down"],
    [200, { error: "try_again" }, "try_again"],
    [200, { error: "weird" }, "try_again"],
    [200, { ...QUOTE_JSON, code: "OTHER2026" }, "try_again"],
    [200, null, "try_again"],
    [400, { error: "coupon_invalid" }, "coupon_invalid"],
    [400, { error: "bad_request" }, "try_again"],
    [403, { error: "forbidden" }, "try_again"],
    [429, { error: "slow_down" }, "slow_down"],
    [0, null, "try_again"],
    [503, null, "try_again"],
  ]) {
    assert.deepEqual(V.fromSiteCouponQuote(status, body, CODE), { ok: false, error }, `${status} ${JSON.stringify(body)}`);
  }
});

/* ── the purchase answer ───────────────────────────────────────────────── */

test("toPurchase: the coupon code and list price, both or neither — and no new holder field", () => {
  const base = { state: "active", sport: "Badminton", credits: 10, priceCents: 33250, maskedEmail: "a•••@example.com", sportId: BADMINTON, name: "Badminton 10-pack" };
  const v = V.toPurchase({ ...base, couponCode: CODE, listPriceCents: 35000, couponId: "never", percentOff: 5 });
  assert.equal(v.couponCode, CODE);
  assert.equal(v.listPriceCents, 35000);
  assert.equal("couponId" in v || "percentOff" in v, false);
  for (const [patch, why] of [
    [{ couponCode: null, listPriceCents: null }, "no coupon"],
    [{ couponCode: CODE }, "a code without a list price"],
    [{ listPriceCents: 35000 }, "a list price without a code"],
    [{ couponCode: CODE, listPriceCents: 33250 }, "a list price not above the price paid"],
    [{ couponCode: "diwali 2026", listPriceCents: 35000 }, "not the coupon shape"],
    [{ couponCode: CODE, listPriceCents: "35000" }, "a list price that is not cents"],
  ]) {
    const x = V.toPurchase({ ...base, ...patch });
    assert.equal(x.couponCode, null, why);
    assert.equal(x.listPriceCents, null, why);
    assert.equal(x.priceCents, 33250, `${why}: the price paid is shown regardless`);
  }
});

/* ── the relays (no call leaves this machine) ──────────────────────────── */

test("packCouponQuote: with no relay secret nothing is called; a code not in the coupon shape never leaves the site", async () => {
  const calls = stubFetch(() => ({ status: 200, body: QUOTE_JSON }));
  assert.deepEqual(await P.packCouponQuote(CODE, "203.0.113.9"), { ok: false, error: "try_again" });
  process.env.EXTON_RELAY_SECRET = SECRET;
  for (const bad of ["diwali2026", "AB", "DIWALI 2026", "", 42, null]) {
    assert.deepEqual(await P.packCouponQuote(bad, "203.0.113.9"), { ok: false, error: "coupon_invalid" }, String(bad));
  }
  assert.equal(calls.length, 0);
});

test("packCouponQuote: POSTs {club, code} with the secret and the IP, and answers only the allow-listed quote", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { ...QUOTE_JSON, couponId: "never-shown" } }));
  const r = await P.packCouponQuote(CODE, "203.0.113.9");
  assert.deepEqual(r, { ok: true, view: QUOTE });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://platform.test/api/public/court-packs/quote");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.headers["x-exton-relay-secret"], SECRET);
  assert.equal(calls[0].init.headers["x-exton-client-ip"], "203.0.113.9");
  assert.equal(calls[0].init.headers.Authorization, undefined, "buying needs no sign-in: no device token");
  assert.deepEqual(JSON.parse(calls[0].init.body), { club: "exton-sports", code: CODE });
});

test("packCouponQuote: the platform's answers map to one closed set — 400 coupon_invalid is the only 'not valid'", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  for (const [reply, error] of [
    [{ status: 400, body: { error: "coupon_invalid" } }, "coupon_invalid"],
    [{ status: 400, body: { error: "bad_request" } }, "try_again"],
    [{ status: 404, body: { error: "not_available" } }, "off"],
    [{ status: 429, body: { error: "slow_down" } }, "slow_down"],
    [{ status: 503, body: { error: "try_again" } }, "try_again"],
    [{ status: 403, body: { error: "forbidden" } }, "try_again"],
    [{ status: 200, body: { ...QUOTE_JSON, code: "OTHER2026" } }, "try_again"],
    [{ status: 200, body: { ...QUOTE_JSON, prices: [] } }, "try_again"],
    [new Error("timeout"), "try_again"],
  ]) {
    stubFetch(() => reply);
    assert.deepEqual(await P.packCouponQuote(CODE, "203.0.113.9"), { ok: false, error }, JSON.stringify(reply));
  }
});

test("packCheckout: couponCode goes as a CODE when there is one; none sends the call exactly as before; a bad one is never sent", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const BUY = { sportId: BADMINTON, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "2026-10-22-1" };
  const PLAIN = { club: "exton-sports", sportId: BADMINTON, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "2026-10-22-1" };
  let calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  assert.deepEqual(await P.packCheckout({ ...BUY, couponCode: CODE }, "203.0.113.9"), { ok: true, url: STRIPE });
  assert.deepEqual(JSON.parse(calls[0].init.body), { ...PLAIN, couponCode: CODE });
  for (const none of [undefined, null, ""]) {
    calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
    await P.packCheckout({ ...BUY, couponCode: none }, "203.0.113.9");
    assert.deepEqual(JSON.parse(calls[0].init.body), PLAIN, JSON.stringify(none));
  }
  calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  for (const bad of ["diwali2026", "AB", "DIWALI 2026", 42]) {
    assert.deepEqual(await P.packCheckout({ ...BUY, couponCode: bad }, "203.0.113.9"), { ok: false, error: "coupon_invalid" }, String(bad));
  }
  assert.equal(calls.length, 0);
  // The platform's refusal at Pay is ITS coupon_invalid, from a 400.
  stubFetch(() => ({ status: 400, body: { error: "coupon_invalid" } }));
  assert.deepEqual(await P.packCheckout({ ...BUY, couponCode: CODE }, "203.0.113.9"), { ok: false, error: "coupon_invalid" });
  // No price in the call, ever.
  assert.doesNotMatch(code(read("lib/my-bookings/platform.ts")).slice(code(read("lib/my-bookings/platform.ts")).indexOf("export async function packCheckout")), /priceCents|amount/);
});

/* ── POST /api/court-packs/quote ────────────────────────────────────────── */

function req(path, body, headers = {}) {
  return new Request(`${OWN}${path}`, {
    method: "POST",
    headers: { origin: OWN, "content-type": "application/json", "x-real-ip": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const quoteRoute = () => mod("app/api/court-packs/quote/route.ts");
const checkoutRoute = () => mod("app/api/court-packs/checkout/route.ts");

test("quote route: a cross-site call, a bad body, and a blank or malformed code are refused before the platform", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: QUOTE_JSON }));
  const { POST } = await quoteRoute();
  for (const hdrs of [{ origin: "https://evil.example" }, { origin: "" }, { "content-type": "text/plain" }, { "sec-fetch-site": "cross-site" }]) {
    assert.equal((await POST(req("/api/court-packs/quote", { code: CODE }, hdrs))).status, 403, JSON.stringify(hdrs));
  }
  const bodyRes = await POST(req("/api/court-packs/quote", "[1,2]"));
  assert.equal(bodyRes.status, 400);
  assert.deepEqual(await bodyRes.json(), { error: "bad_request" });
  for (const c of [undefined, "", "  ", "AB", "DIWALI-2026", 42, null]) {
    G.resetLimits();
    const res = await POST(req("/api/court-packs/quote", { code: c }));
    assert.equal(res.status, 400, JSON.stringify(c));
    assert.deepEqual(await res.json(), { error: "coupon_invalid" }, JSON.stringify(c));
  }
  assert.equal(calls.length, 0);
});

test("quote route: a code is normalised, relayed once with the IP, and answered as the allow-listed quote, private", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 200, body: { ...QUOTE_JSON, couponId: "never-shown" } }));
  const { POST } = await quoteRoute();
  const res = await POST(req("/api/court-packs/quote", { code: " diwali2026 ", price: 1 }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), QUOTE_JSON);
  assert.equal(res.headers.get("cache-control"), "private, no-store");
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].init.body), { club: "exton-sports", code: CODE });
  assert.equal(calls[0].init.headers["x-exton-client-ip"], "203.0.113.9");
});

test("quote route: every platform outcome is 200 {error} — one 'coupon_invalid' for every code it will not take", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const { POST } = await quoteRoute();
  for (const [reply, error] of [
    [{ status: 400, body: { error: "coupon_invalid" } }, "coupon_invalid"],
    [{ status: 404, body: { error: "not_available" } }, "off"],
    [{ status: 429 }, "slow_down"],
    [{ status: 503 }, "try_again"],
    [new Error("timeout"), "try_again"],
  ]) {
    G.resetLimits();
    stubFetch(() => reply);
    const res = await POST(req("/api/court-packs/quote", { code: CODE }));
    assert.equal(res.status, 200, JSON.stringify(reply));
    assert.deepEqual(await res.json(), { error }, JSON.stringify(reply));
  }
  // With no relay secret: nothing called, try again.
  delete process.env.EXTON_RELAY_SECRET;
  G.resetLimits();
  const calls = stubFetch(() => ({ status: 200, body: QUOTE_JSON }));
  assert.deepEqual(await (await POST(req("/api/court-packs/quote", { code: CODE }))).json(), { error: "try_again" });
  assert.equal(calls.length, 0);
});

test("quote route: 10 per 10 minutes per IP, before the platform is called; another visitor is not held up", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  const calls = stubFetch(() => ({ status: 400, body: { error: "coupon_invalid" } }));
  const { POST } = await quoteRoute();
  for (let i = 0; i < 10; i++) assert.equal((await POST(req("/api/court-packs/quote", { code: `GUESS${i}0` }))).status, 200, `call ${i + 1}`);
  const res = await POST(req("/api/court-packs/quote", { code: CODE }));
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: "slow_down" });
  assert.equal(calls.length, 10);
  assert.equal((await POST(req("/api/court-packs/quote", { code: CODE }, { "x-real-ip": "198.51.100.7" }))).status, 200);
});

test("quote route: guards in the house order, and only route fields exported", () => {
  const src = code(read("app/api/court-packs/quote/route.ts"));
  const order = ["refuseCrossSite(req)", "readJsonBody(req)", "hit(`coupon:${ip}`", "normaliseCouponCode(body.code)", "packCouponQuote("].map((s) => src.indexOf(s));
  assert.ok(order.every((i) => i > 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(src, /packCouponQuote\(code\.code, ip\)/);
  for (const n of [...src.matchAll(/export (?:async )?(?:const|function) (\w+)/g)].map((m) => m[1])) {
    assert.ok(["runtime", "dynamic", "maxDuration", "POST"].includes(n), n);
  }
  const max = Number(src.match(/export const maxDuration = (\d+)/)?.[1]);
  assert.ok(max > 10 && max <= 60, `maxDuration ${max} must outlast packCouponQuote's 10 s`);
});

/* ── POST /api/court-packs/checkout, with a coupon ──────────────────────── */

const BUY = { sportId: BADMINTON, credits: 10, email: "guest@example.com", agreeTerms: true, termsVersion: "2026-10-22-1" };

test("checkout route: couponCode is normalised and passed on; a malformed one is 400 coupon_invalid with no call", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  let calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  const { POST } = await checkoutRoute();
  const res = await POST(req("/api/court-packs/checkout", { ...BUY, couponCode: " diwali2026 " }));
  assert.deepEqual(await res.json(), { url: STRIPE });
  assert.equal(JSON.parse(calls[0].init.body).couponCode, CODE);
  // Blank or absent: the call is the coupon-less one.
  for (const none of [undefined, null, "", "   "]) {
    G.resetLimits();
    calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
    await POST(req("/api/court-packs/checkout", { ...BUY, couponCode: none }));
    assert.equal("couponCode" in JSON.parse(calls[0].init.body), false, JSON.stringify(none));
  }
  calls = stubFetch(() => ({ status: 200, body: { url: STRIPE } }));
  for (const bad of ["AB", "DIWALI-2026", 42, {}]) {
    G.resetLimits();
    const r = await POST(req("/api/court-packs/checkout", { ...BUY, couponCode: bad }));
    assert.equal(r.status, 400, JSON.stringify(bad));
    assert.deepEqual(await r.json(), { error: "coupon_invalid" });
  }
  assert.equal(calls.length, 0);
  // The tick still comes first: no tick, no call, whatever the coupon.
  G.resetLimits();
  assert.deepEqual(await (await POST(req("/api/court-packs/checkout", { ...BUY, agreeTerms: false, couponCode: "AB" }))).json(), { error: "terms_required" });
});

test("checkout route: the platform's coupon_invalid at Pay comes back as a word the form knows", async () => {
  process.env.EXTON_RELAY_SECRET = SECRET;
  stubFetch(() => ({ status: 400, body: { error: "coupon_invalid" } }));
  const { POST } = await checkoutRoute();
  const res = await POST(req("/api/court-packs/checkout", { ...BUY, couponCode: CODE }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { error: "coupon_invalid" });
});

/* ── the form, rendered ────────────────────────────────────────────────── */

async function renderForm({ sport = BADMINTON, credits = null, coupon = null, initialCode = null, offers = OFFERS.offers } = {}) {
  globalThis.__test.coupon = coupon;
  const Form = (await mod("app/court-packs/BuyForm.tsx")).default;
  return renderToStaticMarkup(h(Form, { offers, termsVersion: OFFERS.terms.version, initialSportId: sport, initialCredits: credits, initialCode }));
}
const couponInput = (html) => html.match(/<input[^>]*id="buy-coupon"[^>]*>/)?.[0] ?? null;
const buttonOf = (html, label) => html.match(new RegExp(`<button[^>]*>${esc(label)}</button>`))?.[0] ?? null;

test("BuyForm: a 'Coupon code' field after the email and before the tick — optional, typed in capitals, no autocomplete", async () => {
  const html = await renderForm();
  const t = textOf(html);
  const input = couponInput(html);
  assert.ok(input, "the coupon field");
  assert.match(input, /type="text"/);
  assert.match(input, /autoComplete="off"|autocomplete="off"/);
  assert.match(input, /autoCapitalize="characters"|autocapitalize="characters"/);
  assert.match(input, /placeholder="Optional"/);
  assert.match(input, /value=""/);
  assert.match(html, /<label[^>]*for="buy-coupon"[^>]*>Coupon code<\/label>/);
  // Order: YOUR EMAIL (its help line) → COUPON CODE → the price box and the tick.
  assert.ok(t.indexOf(C.PACK_BUY_COPY.emailHelp) < t.indexOf("Coupon code"));
  assert.ok(t.indexOf("Coupon code") < t.indexOf("I agree to the court pack terms"));
  // Under the field, Aniket's line (2026-10-29), with the club's address as a mailto link.
  const claim = "Want a coupon code for additional discount? Email info@extonsports.com to claim yours.";
  assert.ok(t.replace(/\s+/g, " ").includes(claim), "the claim line, word for word");
  assert.match(html, /<a href="mailto:info@extonsports\.com\?subject=Court%20pack%20coupon%20code"[^>]*>info@extonsports\.com<\/a>/);
  assert.ok(t.indexOf("Coupon code") < t.indexOf("Want a coupon code") && t.indexOf("Want a coupon code") < t.indexOf("I agree to the court pack terms"));
  assert.equal(C.PACK_BUY_COPY.couponClaimEmail, "info@extonsports.com");
  // Only while no coupon is applied.
  assert.match(code(read("app/court-packs/BuyForm.tsx")), /\{!coupon && \(\s*<p[^>]*>\s*\{PACK_BUY_COPY\.couponClaimBefore\}/);
  assert.ok(html.indexOf('id="buy-email"') < html.indexOf('id="buy-coupon"'));
  // Apply is its own button (never the form's submit), and waits for something to apply.
  const apply = buttonOf(html, "Apply");
  assert.ok(apply);
  assert.match(apply, /type="button"/);
  assert.match(apply, /disabled/);
  // Without a coupon, the form is what it was: list prices, no saving.
  assert.match(t, /Pay \$200\.00/);
  assert.doesNotMatch(t, /You save|% off|Was \$/);
});

test("BuyForm: ?code= pre-fills the field, says 'Checking…', and holds Pay until the answer is back", async () => {
  const html = await renderForm({ initialCode: CODE });
  assert.match(couponInput(html), new RegExp(`value="${CODE}"`));
  const checking = buttonOf(html, "Checking…");
  assert.ok(checking, "Apply reads Checking… from the first render");
  assert.match(checking, /disabled/);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled/);
  // The page passes ?code= through couponFromQuery, so only a coupon-shaped code arrives.
  const page = code(read("app/court-packs/page.tsx"));
  assert.match(page, /const code = couponFromQuery\(sp\.code\);/);
  assert.match(page, /initialCode=\{code\}/);
});

test("BuyForm, applied: every price is the coupon's — tiles struck through, 'You save $17.50', 'Pay $332.50' (Badminton 10-pack)", async () => {
  const html = await renderForm({ credits: 10, coupon: QUOTE });
  const t = textOf(html);
  assert.match(t, /DIWALI2026 — 5% off Remove/);
  assert.equal(couponInput(html), null, "the field gives way to the applied code");
  assert.ok(buttonOf(html, "Remove"));
  // The sport tiles: from the coupon's smallest.
  assert.match(t, /Badminton from \$190\.00/);
  assert.match(t, /Cricket from \$261\.25/);
  // Each size tile: the list price struck (read out as "Was"), then the coupon price and per hour.
  assert.match(t, /5 credits Was \$200\.00 \$190\.00 \$38\.00 an hour Books 60 days ahead/);
  assert.match(t, /10 credits Was \$350\.00 \$332\.50 \$33\.25 an hour Books 120 days ahead/);
  assert.equal([...html.matchAll(/<s class="[^"]*line-through[^"]*">\$350\.00<\/s>/g)].length, 3, "the tile, the card and the Pay box");
  // The card and the Pay box.
  assert.match(t, /Per hour \$33\.25 — peak hours are \$45\.00 by card/);
  assert.match(t, /Badminton 10-pack Was \$350\.00 \$332\.50 You save \$17\.50/);
  assert.match(t, /Pay \$332\.50/);
  assert.doesNotMatch(t, /Pay \$350\.00/);
});

test("BuyForm, applied: the Cricket 5-pack is exactly $261.25 — $13.75 off, $52.25 an hour", async () => {
  const t = textOf(await renderForm({ sport: CRICKET, credits: 5, coupon: QUOTE }));
  assert.match(t, /5 credits Was \$275\.00 \$261\.25 \$52\.25 an hour/);
  assert.match(t, /10 credits Was \$500\.00 \$475\.00 \$47\.50 an hour/);
  assert.match(t, /You save \$13\.75/);
  assert.match(t, /Per hour \$52\.25 — peak hours are \$65\.00 by card/);
  assert.match(t, /Pay \$261\.25/);
});

test("BuyForm, applied: a size the quote does not price keeps its list price, nothing struck — and Pay names it", async () => {
  const noTen = { ...QUOTE, prices: QUOTE.prices.filter((p) => !(p.sportId === BADMINTON && p.credits === 10)) };
  const t = textOf(await renderForm({ credits: 10, coupon: noTen }));
  assert.match(t, /10 credits \$350\.00 \$35\.00 an hour/);
  assert.match(t, /5 credits Was \$200\.00 \$190\.00/);
  assert.match(t, /Pay \$350\.00/);
  assert.doesNotMatch(t, /You save/);
});

test("BuyForm: Pay sends the code only while it is applied AND prices the chosen offer; Apply and Enter never submit", () => {
  const src = code(read("app/court-packs/BuyForm.tsx"));
  assert.match(src, /const couponCode = coupon && saving \? coupon\.code : null;/);
  assert.equal(src.match(/\.\.\.\(couponCode \? \{ couponCode \} : \{\}\)/g).length, 1, "spread into the checkout body once");
  assert.equal(src.match(/const couponCode =/g).length, 1);
  // The checkout answer coupon_invalid drops the applied coupon in the same branch, and marks
  // the code tried, so the next Pay buys at the list price the button then shows.
  assert.match(src, /if \(why === "coupon_invalid" && coupon\) \{\s*setCoupon\(null\);\s*setCouponNote\(""\);\s*setTried\(coupon\.code\);/);
  // Enter in the coupon field applies; it never reaches pay().
  assert.match(src, /onKeyDown=\{\(e\) => \{\s*if \(e\.key !== "Enter"\) return;\s*e\.preventDefault\(\);\s*applyCoupon\("field"\);/);
  // A typed but unapplied code is applied first, never paid past — once per code: one that
  // already failed lets Pay go on at the price shown (no dead end while the platform is down).
  assert.match(src, /const typed = code\.trim\(\);\s*if \(!coupon && typed !== "" && typed !== tried\) return applyCoupon\("pay"\);/);
  assert.match(src, /setCoupon\(null\);\s*setTried\(asked\);/, "every failed Apply marks its code tried");
  // ?code= is applied once on load; Apply asks this site's route, never the platform.
  assert.match(src, /if \(loadApplied\.current \|\| initialCode === null\) return;\s*loadApplied\.current = true;/);
  assert.match(src, /postJson\("\/api\/court-packs\/quote", \{ code \}\)/);
  assert.doesNotMatch(src, /orangish|\/api\/public\//i);
  // No price is ever posted: the code, the sport, the size, the address and the tick.
  assert.doesNotMatch(src, /priceCents:\s*|listPriceCents:\s*|amount/);
});

test("BuyForm, keyboard and screen readers: one always-mounted live region; the heading labels the applied block (2026-10-29 review)", async () => {
  const liveRegions = (html) => [...html.matchAll(/<p class="sr-only" role="status" aria-live="polite">([^<]*)<\/p>/g)];
  for (const [state, html] of [["not applied", await renderForm()], ["applied", await renderForm({ credits: 10, coupon: QUOTE })], ["?code= on load", await renderForm({ initialCode: CODE })]]) {
    const live = liveRegions(html);
    assert.equal(live.length, 1, `${state}: exactly one coupon live region, mounted from the first render`);
    assert.equal(live[0][1], "", `${state}: empty at first, so its first sentence is a change that is read out`);
  }
  // Not applied: the label points at the field, and the field is not marked invalid.
  const plain = await renderForm();
  assert.match(plain, /<label id="buy-coupon-label" for="buy-coupon"[^>]*>Coupon code<\/label>/);
  assert.doesNotMatch(couponInput(plain), /aria-invalid|aria-describedby/);
  // Applied: no <label> left pointing at nothing; the heading labels the applied block, which
  // is a group, not a status region mounted already holding its sentence.
  const applied = await renderForm({ credits: 10, coupon: QUOTE });
  assert.doesNotMatch(applied, /<label[^>]*>Coupon code<\/label>/);
  assert.match(applied, /<p id="buy-coupon-label"[^>]*>Coupon code<\/p>/);
  assert.match(applied, /<div class="[^"]*" role="group" aria-labelledby="buy-coupon-label"><span[^>]*>DIWALI2026 — 5% off<\/span><button/);
  assert.equal([...applied.matchAll(/role="status"/g)].length, 1, "the live region is the only status region while applied");
});

test("BuyForm, keyboard and screen readers: focus follows the swap, the field names its refusal (2026-10-29 review)", () => {
  const src = code(read("app/court-packs/BuyForm.tsx"));
  // Apply from the field → Remove; refused from the field → the field; Remove → the field;
  // Pay's Apply → back to Pay only if focus was lost; ?code= on load → not moved.
  assert.match(src, /setCouponLive\(couponAppliedNotice\(a\.view\.code, a\.view\.percentOff\)\);\s*focusNext\.current = from === "field" \? "remove" : from === "pay" \? "pay" : null;/);
  assert.match(src, /setCouponLive\(""\);\s*focusNext\.current = from === "field" \? "input" : from === "pay" \? "pay" : null;/);
  assert.match(src, /setCouponLive\(PACK_BUY_COPY\.couponRemoved\);\s*focusNext\.current = "input";/);
  assert.match(src, /settleCoupon\(a, c, "load"\)/);
  assert.match(src, /if \(want !== "pay" \|\| lost\) el\.focus\(\);/);
  assert.match(src, /<button ref=\{couponRemoveRef\} type="button"/);
  assert.match(src, /<input\s+ref=\{couponInputRef\}\s+id="buy-coupon"/);
  assert.match(src, /<button type="submit" ref=\{payRef\}/);
  // The Apply button passes its origin; it is never handed the click event as one.
  assert.match(src, /onClick=\{\(\) => applyCoupon\("field"\)\}/);
  assert.doesNotMatch(src, /onClick=\{applyCoupon\}/);
  // The field is described by the line under it, and invalid only while that line is the refusal.
  assert.match(src, /aria-describedby=\{couponNote \? "buy-coupon-note" : undefined\}/);
  assert.match(src, /aria-invalid=\{couponNote === PACK_BUY_COPY\.couponInvalid \? true : undefined\}/);
  // The checkout's refusal clears "applied" from the live region (its alert says why).
  assert.match(src, /setTried\(coupon\.code\);\s*setCouponLive\(""\);/);
});

test("copy: what the live region says when a coupon applies and when it is removed (2026-10-29 review)", () => {
  assert.equal(C.couponAppliedNotice(CODE, 5), "Coupon applied: DIWALI2026 — 5% off. The prices shown now include it.");
  assert.equal(C.PACK_BUY_COPY.couponRemoved, "Coupon removed. The prices shown are the full prices again.");
});

test("BuyForm: every refusal of a code renders through PhoneText, and no message is a bare child", () => {
  const src = code(read("app/court-packs/BuyForm.tsx"));
  assert.match(src, /\{couponNote && \(\s*<p id="buy-coupon-note" className=\{ERROR\} role="alert">\s*<PhoneText text=\{couponNote\} phone=\{phone\} \/>/);
  assert.doesNotMatch(src, />\s*\{couponNote\}\s*</);
  assert.doesNotMatch(src, />\s*\{\s*couponMessage\(/);
});

test("light AND dark: every text-white/NN on the buy page is a step the light theme remaps, and the struck price uses one", () => {
  const css = read("app/globals.css");
  const remapped = new Set([...css.matchAll(/\[data-theme="light"\] \.text-white\\\/(\d+)\s/g)].map((m) => m[1]));
  assert.ok(remapped.has("60"));
  for (const f of walk(join(ROOT, "app", "court-packs")).filter((x) => /\.tsx?$/.test(x))) {
    for (const m of code(readFileSync(f, "utf8")).matchAll(/(?<![:\w-])text-white\/(\d+)/g)) {
      assert.ok(remapped.has(m[1]), `${f}: text-white/${m[1]} is not remapped for the light theme`);
    }
  }
  const src = code(read("app/court-packs/BuyForm.tsx"));
  // Off a picked tile the struck price is text-white/60; on the ember tile, the tile's black, dimmed.
  assert.match(src, /<s className=\{`\$\{STRUCK\} \$\{on \? "opacity-70" : "text-white\/60"\}`\}>/);
  assert.match(src, /const STRUCK = "line-through decoration-1";/);
  // The saving is the ember token, which the light theme remaps to its ink.
  assert.ok(css.includes(':root[data-theme="light"] .text-\\[var\\(--color-ember\\)\\] { color: var(--ember-ink); }'));
  assert.match(src, /text-\[var\(--color-ember\)\][^"]*">\{youSave\(saving\.savesCents\)\}/);
});

/* ── /my-bookings/pack/ready ───────────────────────────────────────────── */

async function renderReady(purchase) {
  process.env.EXTON_RELAY_SECRET = SECRET;
  stubFetch((url) => (/purchase$/.test(url) ? { status: 200, body: purchase } : { status: 200, body: OFFERS_JSON }));
  const Page = (await mod("app/my-bookings/pack/ready/page.tsx")).default;
  return textOf(renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ cs: "cs_test_a1B2c3" }) })));
}
const TEN = { state: "active", sport: "Badminton", credits: 10, priceCents: 33250, maskedEmail: "a•••@example.com", sportId: BADMINTON, name: "Badminton 10-pack", windowDays: 120 };

test("ready: a coupon pack shows its code beside the price paid — 'Paid $332.50 by card', then 'Coupon DIWALI2026 — you saved $17.50'", async () => {
  const t = await renderReady({ ...TEN, couponCode: CODE, listPriceCents: 35000 });
  assert.match(t, /Paid \$332\.50 by card Coupon DIWALI2026 — you saved \$17\.50 Email a•••@example\.com/);
});

test("ready: without a coupon (or with half of one) there is no Coupon row", async () => {
  for (const extra of [{}, { couponCode: null, listPriceCents: null }, { couponCode: CODE }, { listPriceCents: 35000 }]) {
    const t = await renderReady({ ...TEN, priceCents: 35000, ...extra });
    assert.match(t, /Paid \$350\.00 by card Email/, JSON.stringify(extra));
    assert.doesNotMatch(t, /Coupon|saved/, JSON.stringify(extra));
  }
});
