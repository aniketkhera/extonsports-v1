/* extonsports.com/waiver → the open waiver-signing page in the app, 2026-11-15
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node --test; see package.json)

   The front-desk QR (orangish-app, Admin → Waivers → Signing links by email → Open link)
   encodes https://www.extonsports.com/waiver, so this one rule in next.config.ts is the only
   thing between a printed code and the signing page. What is pinned, each of which `tsc`
   would wave through when broken:
     • it is 307 (permanent: false), never a 308 a browser would cache for good;
     • it sits ABOVE the apex -> www rule, so the apex takes one hop, not two;
     • /waiver/ reaches the same place (Next's own trailing-slash 308, then this rule);
     • /waiver/<anything> is not forwarded, and nothing in the nav, footer or sitemap links it.

   The chains are walked with Next's OWN pieces — loadCustomRoutes (which adds the
   trailing-slash redirect ahead of every rule), the router's matcher (strict path-to-regexp,
   as node_modules/next/dist/server/lib/router-utils/filesystem.js builds it), matchHas for
   the host rule and prepareDestination for the Location — in the order resolve-routes.js
   tries them. Not covered, because it is not this code: http -> https, which Vercel's edge
   answers (308) before Next sees the request. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "package.json"));
const loadCustomRoutes = require("next/dist/lib/load-custom-routes").default;
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match");
const { matchHas, prepareDestination } = require("next/dist/shared/lib/router/utils/prepare-destination");
const { getRedirectStatus } = require("next/dist/lib/redirect-status");

const TARGET = "https://app.orangish.io/sign-waiver/exton-sports";

const config = async () => (await import(pathToFileURL(join(ROOT, "next.config.ts")).href)).default;

/** The redirects as the router holds them: Next's internal ones first, then next.config's. */
async function routerRedirects() {
  const { redirects } = await loadCustomRoutes(await config());
  return redirects.map((r) => ({ ...r, match: getPathMatch(r.source, { strict: true, removeUnnamedParams: true }) }));
}

/** One request through the redirects: { status, location } for the first that matches, or null. */
function answer(redirects, url) {
  const u = new URL(url);
  const query = Object.fromEntries(u.searchParams);
  const req = { headers: { host: u.host } };
  for (const r of redirects) {
    let params = r.match(u.pathname);
    if (params && (r.has || r.missing)) {
      const extra = matchHas(req, query, r.has, r.missing);
      params = extra ? Object.assign(params, extra) : false;
    }
    if (!params) continue;
    const { parsedDestination: d } = prepareDestination({ appendParamsToQuery: false, destination: r.destination, params, query });
    const search = new URLSearchParams(d.query).toString();
    const location = (d.hostname ? `${d.protocol}//${d.host ?? d.hostname}` : "") + d.pathname + (search ? `?${search}` : "");
    return { status: getRedirectStatus(r), location };
  }
  return null;
}

/** Every hop from `url` until an answer is not a redirect or leaves this site. */
function chain(redirects, url) {
  const hops = [];
  for (let at = url; hops.length < 5; ) {
    const a = answer(redirects, at);
    if (!a) return hops;
    hops.push(a);
    const next = new URL(a.location, at);
    if (!/^(www\.)?extonsports\.com$/.test(next.hostname)) return hops;
    at = next.href;
  }
  throw new Error(`more than 5 hops from ${url}`);
}

test("next.config: /waiver is ONE temporary (307) rule to the app's open signing page, above the apex rule", async () => {
  const rules = await (await config()).redirects();
  const at = rules.findIndex((r) => r.source === "/waiver");
  assert.deepEqual(rules[at], { source: "/waiver", destination: TARGET, permanent: false });
  assert.ok(at < rules.findIndex((r) => r.source === "/:path*"), "/waiver must come before the apex -> www rule");
  // No second rule for the slash form or anything under it: the slash form is Next's, and
  // /waiver/<anything> stays a 404 here.
  assert.deepEqual(rules.filter((r) => r.source.startsWith("/waiver")).map((r) => r.source), ["/waiver"]);
});

test("www and the apex both reach the signing page in one 307 hop, the query carried", async () => {
  const R = await routerRedirects();
  for (const host of ["www.extonsports.com", "extonsports.com"]) {
    assert.deepEqual(chain(R, `https://${host}/waiver`), [{ status: 307, location: TARGET }], host);
    // A flyer's ?utm_source= survives, as for /pay and /field (Next passes the query through).
    assert.deepEqual(chain(R, `https://${host}/waiver?utm_source=desk`), [{ status: 307, location: `${TARGET}?utm_source=desk` }], host);
  }
});

test("/waiver/ is Next's trailing-slash 308 to /waiver on the same host, then the same 307", async () => {
  const R = await routerRedirects();
  for (const host of ["www.extonsports.com", "extonsports.com"]) {
    assert.deepEqual(chain(R, `https://${host}/waiver/`), [
      { status: 308, location: "/waiver" },
      { status: 307, location: TARGET },
    ], host);
  }
});

test("nothing under /waiver/ is forwarded, and the apex -> www rule still answers every other path", async () => {
  const R = await routerRedirects();
  assert.equal(answer(R, "https://www.extonsports.com/waiver/abc123"), null);
  assert.equal(answer(R, "https://www.extonsports.com/waivers"), null);
  assert.deepEqual(chain(R, "https://extonsports.com/waiver/abc123"), [{ status: 308, location: "https://www.extonsports.com/waiver/abc123" }]);
  assert.deepEqual(chain(R, "https://extonsports.com/badminton"), [{ status: 308, location: "https://www.extonsports.com/badminton" }]);
  assert.equal(answer(R, "https://www.extonsports.com/badminton"), null);
  // The rule it sits beside, unchanged: /pay is still one 307 hop from the apex.
  assert.deepEqual(chain(R, "https://extonsports.com/pay"), [{ status: 307, location: "https://app.orangish.io/pay/exton-sports" }]);
});

test("/waiver is a redirect, not a page: no route, nothing in public/, not in the sitemap, nav or footer", () => {
  // A page or a public file at /waiver would never be reached (redirects run before the
  // filesystem), so one appearing means somebody expects it to be.
  for (const p of ["app/waiver", "public/waiver", "public/waiver.html"]) assert.equal(existsSync(join(ROOT, p)), false, p);
  for (const f of ["app/sitemap.ts", "app/components/Nav.tsx", "app/components/Footer.tsx", "app/components/CalendarFooterLink.tsx"]) {
    assert.doesNotMatch(readFileSync(join(ROOT, f), "utf8"), /["'`/]waiver(?:["'`/?#]|$)/m, f);
  }
});
