/* The club's mark as a globe — the drawing (2026-10-16). LogoGlobe.tsx schedules it.
   ──────────────────────────────────────────────────────────────────────────
   Aniket picked this from three mocked treatments (a coin, a globe, a glass orb):
   "globe." The emblem is printed on a glossy navy ball that makes a half turn about
   its vertical axis, then rests face-on. Each pixel is ray-cast against a unit sphere
   from a perspective camera, carried back into the ball's own frame, looked up in the
   logo, and lit. Plain canvas 2D and arithmetic — no library, nothing to install in a
   node_modules that is shared between checkouts.

   Choices that matter:
   - The print is a PROJECTIVE decal: a point's texture coordinate is where that point
     sat on screen at rest. So the rest pose is the flat logo, texel for pixel, and only
     the turn bends it. (Wrapping the logo round the ball by angle would bulge the
     lettering even at rest.)
   - The far side carries the same print turned 180 degrees about the axis, so it reads
     un-mirrored from behind. Each turn is a half turn, and the frame at 180 degrees is
     the frame at 0 exactly: the loop is seamless and the logo is never missing.
   - The lights are fixed in the room, as they are for a real globe. Everything that
     depends only on the ball (soft key, terminator, the window's crescent, glint,
     Fresnel, orange rim) is computed once per size; what moves is the print under that
     light — it dims into the terminator, flares under the crescent (the ink is glossier
     than the navy), and its slightly raised edges turn against a hard key from up-left.
   - Filtering uses a pyramid built at THIS canvas's pixel size, so the rest pose reads
     one level 1:1 (crisp) and the foreshortened limb picks coarser ones (no shimmer).
   - The texture is /logo-globe.webp: 640px, cut from the 1254px mark around its disc,
     with everything past 0.95 of the radius filled with the logo's exact navy, so no
     white corner can bleed in. LogoGlobe shows the same file flat until the first frame.

   Cost, measured in headless Chromium on a dev laptop: ~2.6 ms per turning frame at 134
   device px (the 4K TV), ~0.5 ms at 67. A turn is 2.6 s in every 10, and nothing is drawn
   in between. */

export const GLOBE_TEXTURE = "/logo-globe.webp";

const CYCLE = 10000;      // ms: one half turn per cycle
const TURN_AT = 3600;     // ms into the cycle the turn starts
const TURN_MS = 2600;     // ms the half turn takes
const D = 5.0;            // camera distance, in ball radii (sets the perspective)
const TILT = 7 * Math.PI / 180;   // camera a little above the equator, as you look at a desk globe
const EMBOSS = 0.30;      // how raised the print is

// ── timing: unhurried start, long settle, no overshoot (a globe on a good bearing) ──
function cubicBezier(x1, y1, x2, y2) {
  const X = (t) => 3 * x1 * t * (1 - t) * (1 - t) + 3 * x2 * t * t * (1 - t) + t * t * t;
  const Y = (t) => 3 * y1 * t * (1 - t) * (1 - t) + 3 * y2 * t * t * (1 - t) + t * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (X(m) < x) lo = m; else hi = m; }
    return Y((lo + hi) / 2);
  };
}
const ease = cubicBezier(0.6, 0.0, 0.2, 1.0);

/** The ball's angle at wall-clock time `ms` — so every screen turns at the same moment.
 *  0 and PI draw the same frame. */
export function globeAngleAt(ms) {
  const m = ((ms % CYCLE) + CYCLE) % CYCLE;
  const p = Math.min(1, Math.max(0, (m - TURN_AT) / TURN_MS));
  return Math.PI * ease(p);
}

/** How long the ball stays still from `ms`; 0 while it is turning. */
export function msUntilNextTurn(ms) {
  const m = ((ms % CYCLE) + CYCLE) % CYCLE;
  if (m < TURN_AT - 50) return TURN_AT - 50 - m;
  if (m > TURN_AT + TURN_MS + 50) return CYCLE - m + TURN_AT - 50;
  return 0;
}

// ── colour ──────────────────────────────────────────────────────────────
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
// linear -> sRGB over [0, 1.5], with a soft shoulder so highlights roll off instead of clipping flat
const LUTN = 4096, LUTK = LUTN / 1.5, SRGB = new Uint8ClampedArray(LUTN + 1);
for (let i = 0; i <= LUTN; i++) {
  let l = i / LUTK;
  if (l > 0.85) l = 0.85 + 0.15 * (1 - Math.exp(-(l - 0.85) / 0.15));
  const s = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  SRGB[i] = Math.round(Math.min(1, s) * 255);
}
const enc = (l) => SRGB[l <= 0 ? 0 : l >= 1.5 ? LUTN : (l * LUTK) | 0];

// ── lights (world space, fixed in the room) ─────────────────────────────
const norm = (x, y, z) => { const k = 1 / Math.sqrt(x * x + y * y + z * z); return [x * k, y * k, z * k]; };
// A big soft source just up-left of the camera: flat across the face, so the lettering keeps
// its white, then falling away toward the limb into a terminator at lower right.
const FL = norm(-0.25, 0.30, 1.0), BASE = 1.04, LIMB = 0.70, LIMB_P = 2.4, FLOOR = 0.06, KEYC = [1.0, 0.98, 0.95];
// A harder key from up-left that only the print's raised edges answer to.
const KEY = norm(-0.5, 0.6, 0.62), BEVEL = 1.0;
// Brand orange from behind right: the ring's glow, caught on the limb.
const RIML = norm(0.85, -0.2, -0.45), RIMC = [0.94, 0.30, 0.12], RIM = 1.2;
// A big soft light behind the ball, up and to the left. The clear coat shows it as a crescent
// hugging the upper-left limb (what tells the eye that a navy this dark is a glossy ball), with
// a small glint in it. Both sit clear of the ink at rest.
const ARC = norm(-0.55, 0.70, -0.45), ARC_C0 = Math.cos(0.62), ARC_C1 = Math.cos(0.30), ARC_I = 0.50, ARCC = [0.86, 0.93, 1.0];
const HOT = norm(-0.62, 0.74, -0.25), HOT_I = 0.9, HOT_S2 = 2 * 0.05 * 0.05;
const ENV_HI = 0.20;       // the ceiling, seen at grazing angles along the top
const INK_GLOSS = 1.2;     // ink reflects (1 + this) times as much as the navy

// ── texture: decoded once per page, shared by every globe on it ─────────
let texture = null;
/** @returns {Promise<{ n: number, rgb: Float32Array }>} the texture in linear light */
export function loadGlobeTexture() {
  if (!texture) {
    texture = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const n = im.naturalWidth, c = document.createElement("canvas");
        c.width = c.height = n;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (!g) { rej(new Error("no 2d context")); return; }
        g.drawImage(im, 0, 0);
        const d = g.getImageData(0, 0, n, n).data, rgb = new Float32Array(n * n * 3);
        for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { rgb[j] = LIN[d[i]]; rgb[j + 1] = LIN[d[i + 1]]; rgb[j + 2] = LIN[d[i + 2]]; }
        res({ n, rgb });
      };
      im.onerror = () => rej(new Error("globe texture failed to load"));
      im.src = GLOBE_TEXTURE;
    });
    // A failed load is not cached: the next globe to mount tries again.
    texture.catch(() => { texture = null; });
  }
  return texture;
}

// area-average resample of a square ch-channel image, one axis at a time
function taps(sn, dn) {
  const out = [], sc = sn / dn;
  for (let o = 0; o < dn; o++) {
    const t = [];
    if (sc >= 1) {
      const a = o * sc, b = a + sc;
      for (let s = Math.floor(a); s < Math.ceil(b); s++) { const w = Math.min(b, s + 1) - Math.max(a, s); if (w > 1e-6) t.push(Math.min(sn - 1, s), w / sc); }
    } else {
      const x = (o + 0.5) * sc - 0.5, x0 = Math.floor(x), f = x - x0;
      t.push(Math.max(0, Math.min(sn - 1, x0)), 1 - f, Math.max(0, Math.min(sn - 1, x0 + 1)), f);
    }
    out.push(t);
  }
  return out;
}
function resample(src, sn, ch, dn) {
  const tx = taps(sn, dn), mid = new Float32Array(dn * sn * ch), dst = new Float32Array(dn * dn * ch);
  for (let y = 0; y < sn; y++) for (let o = 0; o < dn; o++) {
    const t = tx[o];
    for (let c = 0; c < ch; c++) { let a = 0; for (let k = 0; k < t.length; k += 2) a += src[(y * sn + t[k]) * ch + c] * t[k + 1]; mid[(y * dn + o) * ch + c] = a; }
  }
  for (let o = 0; o < dn; o++) { const t = tx[o]; for (let x = 0; x < dn; x++) for (let c = 0; c < ch; c++) {
    let a = 0; for (let k = 0; k < t.length; k += 2) a += mid[(t[k] * dn + x) * ch + c] * t[k + 1]; dst[(o * dn + x) * ch + c] = a; } }
  return dst;
}
// One level, 6 floats a texel: r, g, b (linear), the print's height gradient along u and v
// (per texel of this level, so the relief reads the same width on screen at any level), height.
function makeLevel(src, n) {
  const rgb = resample(src.rgb, src.n, 3, n), L = new Float32Array(n * n * 6), h = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const m = Math.max(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
    const t = Math.min(1, Math.max(0, (m - 0.03) / 0.32)); h[i] = t * t * (3 - 2 * t);
  }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, o = i * 6;
    L[o] = rgb[i * 3]; L[o + 1] = rgb[i * 3 + 1]; L[o + 2] = rgb[i * 3 + 2];
    const xl = x > 0 ? i - 1 : i, xr = x < n - 1 ? i + 1 : i, yu = y > 0 ? i - n : i, yd = y < n - 1 ? i + n : i;
    L[o + 3] = (h[xr] - h[xl]) * 0.5; L[o + 4] = (h[yd] - h[yu]) * 0.5; L[o + 5] = h[i];
  }
  return { n, L };
}

/** One globe on one canvas. draw(theta) sizes itself to the canvas's box first.
 *  @param {HTMLCanvasElement} cv
 *  @param {{ n: number, rgb: Float32Array }} src from loadGlobeTexture() */
export function createGlobe(cv, src) {
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  let S = null;

  // Per size: the pyramid, and everything about the ball that the spin cannot change.
  // Returns true when it rebuilt (the size changed).
  function setup() {
    const W = Math.max(8, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)));
    if (S && S.W === W) return false;
    cv.width = cv.height = W;
    // level 1 is the canvas size exactly (the rest pose); level 0 is twice that, for the limb's stretch
    const levels = [];
    for (let k = 0; ; k++) {
      const n = Math.min(src.n, Math.max(2, Math.round(W * Math.pow(2, 1 - k))));
      levels.push(makeLevel(src, n));
      if (n <= 4) break;
    }
    const N = W * W, F = () => new Float32Array(N);
    const st = { W, levels, img: ctx.createImageData(W, W), U: F(), V: F(), SG: new Int8Array(N), A: new Uint8Array(N),
      NX: F(), NY: F(), NZ: F(), Q0Y: F(), Q0Z: F(), LIT: F(), NK: F(), TVK: F(), SPR: F(), SPG: F(), SPB: F(), ADR: F(), ADG: F(), ADB: F() };
    const rs = W / 2, tanA = 1 / Math.sqrt(D * D - 1), f = rs / tanA, c2 = D * D - 1;
    const ca = Math.cos(TILT), sa = Math.sin(TILT);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const p = j * W + i;
      let dx = i + 0.5 - rs, dy = rs - (j + 0.5);
      const r = Math.sqrt(dx * dx + dy * dy), cov = rs - r + 0.5;
      if (cov <= 0) { st.A[p] = 0; continue; }
      st.A[p] = Math.round(Math.min(1, cov) * 255);
      const lim = rs - 0.6;
      if (r > lim) { const k = lim / r; dx *= k; dy *= k; }
      // ray from the camera through this pixel, onto the ball
      let x = dx / f, y = dy / f; const inv = 1 / Math.sqrt(x * x + y * y + 1); x *= inv; y *= inv; const z = -inv;
      const b = D * z; let disc = b * b - c2; if (disc < 0) disc = 0;
      const t = -b - Math.sqrt(disc);
      const Nx = t * x, Ny = t * y, Nz = D + t * z;
      st.NX[p] = Nx; st.NY[p] = Ny; st.NZ[p] = Nz;
      st.Q0Y[p] = Ny * ca + Nz * sa; st.Q0Z[p] = -Ny * sa + Nz * ca;   // the camera tilt, undone
      let vx = -Nx, vy = -Ny, vz = D - Nz; const vl = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz); vx *= vl; vy *= vl; vz *= vl;
      let NV = Nx * vx + Ny * vy + Nz * vz; if (NV < 0) NV = 0;
      // soft key: flat in the middle, terminator at the lower-right limb
      let u = 1 - (Nx * FL[0] + Ny * FL[1] + Nz * FL[2]); if (u < 0) u = 0; else if (u > 1.3) u = 1.3;
      st.LIT[p] = BASE * (1 - LIMB * Math.pow(u, LIMB_P));
      // for the relief: the hard key against the normal, and against the print's v direction
      const NK = Nx * KEY[0] + Ny * KEY[1] + Nz * KEY[2];
      const tvx = 0, tvy = -ca, tvz = -sa, NTv = Ny * tvy + Nz * tvz;
      st.NK[p] = NK; st.TVK[p] = (tvx * KEY[0] + tvy * KEY[1] + tvz * KEY[2]) - NTv * NK;
      // clear coat
      const rx = 2 * NV * Nx - vx, ry = 2 * NV * Ny - vy, rz = 2 * NV * Nz - vz;
      const om = 1 - NV, om2 = om * om, fres = 0.04 + 0.96 * om2 * om2 * om;
      let win = 0, hot = 0;
      { let c = (rx * ARC[0] + ry * ARC[1] + rz * ARC[2] - ARC_C0) / (ARC_C1 - ARC_C0);
        if (c > 0) { c = c > 1 ? 1 : c; win = ARC_I * c * c * (3 - 2 * c) * (0.12 + 0.88 * fres); } }
      { const qx = rx - HOT[0], qy = ry - HOT[1], qz = rz - HOT[2], q2 = qx * qx + qy * qy + qz * qz;
        if (q2 < 9 * HOT_S2) hot = HOT_I * Math.exp(-q2 / HOT_S2) * (0.3 + 0.7 * fres); }
      st.SPR[p] = win * ARCC[0] + hot; st.SPG[p] = win * ARCC[1] + hot; st.SPB[p] = win * ARCC[2] + hot;
      let e = (ry + 0.1) / 0.9; e = e < 0 ? 0 : e > 1 ? 1 : e; e = e * e * (3 - 2 * e);
      const env = ENV_HI * e * fres;
      let rl = (Nx * RIML[0] + Ny * RIML[1] + Nz * RIML[2] + 0.3) / 1.3; if (rl < 0) rl = 0;
      const rim = RIM * om2 * om2 * om * rl;
      st.ADR[p] = env + rim * RIMC[0]; st.ADG[p] = env + rim * RIMC[1]; st.ADB[p] = env * 1.03 + rim * RIMC[2];
    }
    S = st;
    return true;
  }

  // bilinear tap of one level into acc[0..5], weighted
  const acc = new Float32Array(6);
  function bilerp(lv, x, y, w) {
    const n = lv.n, L = lv.L;
    x -= 0.5; y -= 0.5;
    let x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    let x1 = x0 + 1, y1 = y0 + 1;
    if (x0 < 0) x0 = 0; else if (x0 > n - 1) x0 = n - 1;
    if (x1 < 0) x1 = 0; else if (x1 > n - 1) x1 = n - 1;
    if (y0 < 0) y0 = 0; else if (y0 > n - 1) y0 = n - 1;
    if (y1 < 0) y1 = 0; else if (y1 > n - 1) y1 = n - 1;
    const a = (y0 * n + x0) * 6, b = (y0 * n + x1) * 6, c = (y1 * n + x0) * 6, d = (y1 * n + x1) * 6;
    const wa = (1 - fx) * (1 - fy) * w, wb = fx * (1 - fy) * w, wc = (1 - fx) * fy * w, wd = fx * fy * w;
    acc[0] += L[a] * wa + L[b] * wb + L[c] * wc + L[d] * wd;
    acc[1] += L[a + 1] * wa + L[b + 1] * wb + L[c + 1] * wc + L[d + 1] * wd;
    acc[2] += L[a + 2] * wa + L[b + 2] * wb + L[c + 2] * wc + L[d + 2] * wd;
    acc[3] += L[a + 3] * wa + L[b + 3] * wb + L[c + 3] * wc + L[d + 3] * wd;
    acc[4] += L[a + 4] * wa + L[b + 4] * wb + L[c + 4] * wc + L[d + 4] * wd;
    acc[5] += L[a + 5] * wa + L[b + 5] * wb + L[c + 5] * wc + L[d + 5] * wd;
  }

  // one frame
  function frame(theta) {
    const { W, U, V, SG, A, NX, NY, NZ, Q0Y, Q0Z, LIT, NK, TVK, SPR, SPG, SPB, ADR, ADG, ADB, img, levels } = S;
    const N = W * W, tanA = 1 / Math.sqrt(D * D - 1);
    const ct = Math.cos(theta), st = Math.sin(theta), ca = Math.cos(TILT), sa = Math.sin(TILT);

    // pass 1: where on the print each pixel lands
    for (let p = 0; p < N; p++) {
      if (!A[p]) { SG[p] = 0; continue; }
      const Px = NX[p], q0y = Q0Y[p], q0z = Q0Z[p];
      const Qx = Px * ct - q0z * st, Qz = Px * st + q0z * ct;   // the spin, undone
      const sg = Qz >= 0 ? 1 : -1;            // the front print, or the far one (turned 180, so not mirrored)
      const Hz = sg * Qz;
      const wy = q0y * ca - Hz * sa, wz = q0y * sa + Hz * ca;   // where that point sat on screen at rest
      const den = 1 / ((D - wz) * tanA);
      U[p] = (0.5 + 0.5 * sg * Qx * den) * W; V[p] = (0.5 - 0.5 * wy * den) * W;
      SG[p] = sg;
    }

    // pass 2: filter, light, write
    const out = img.data, nLv = levels.length, lvS = levels.map((lv) => lv.n / W);
    const cK = ct * KEY[0] + st * sa * KEY[1] - st * ca * KEY[2];   // the print's u direction against the hard key
    const k = EMBOSS * BEVEL;
    for (let p = 0, i = 0; p < N; p++, i = i + 1 === W ? 0 : i + 1) {
      const o = p * 4, sg = SG[p];
      if (!sg) { out[o + 3] = 0; continue; }
      // this pixel's footprint on the print, in level-1 texels -> level of detail
      let ux, vx, uy, vy;
      if (i + 1 < W && SG[p + 1] === sg) { ux = U[p + 1] - U[p]; vx = V[p + 1] - V[p]; }
      else if (i > 0 && SG[p - 1] === sg) { ux = U[p] - U[p - 1]; vx = V[p] - V[p - 1]; } else { ux = 1; vx = 0; }
      if (p + W < N && SG[p + W] === sg) { uy = U[p + W] - U[p]; vy = V[p + W] - V[p]; }
      else if (p >= W && SG[p - W] === sg) { uy = U[p] - U[p - W]; vy = V[p] - V[p - W]; } else { uy = 0; vy = 1; }
      const fp = Math.max(ux * ux + vx * vx, uy * uy + vy * vy);
      let lod = 1 + 0.5 * Math.log2(fp + 1e-12);
      if (lod < 0) lod = 0; else if (lod > nLv - 1) lod = nLv - 1;
      const l0 = lod | 0, fr = lod - l0;
      acc[0] = acc[1] = acc[2] = acc[3] = acc[4] = acc[5] = 0;
      bilerp(levels[l0], U[p] * lvS[l0], V[p] * lvS[l0], 1 - fr);
      if (fr > 1e-4) bilerp(levels[l0 + 1], U[p] * lvS[l0 + 1], V[p] * lvS[l0 + 1], fr);

      // relief: the normal leans away from the ink's slope; only the hard key sees it
      const Nx = NX[p], Ny = NY[p], Nz = NZ[p];
      const tuk = sg * (cK - (ct * Nx + st * (sa * Ny - ca * Nz)) * NK[p]);
      let lit = LIT[p] - k * (acc[3] * tuk + acc[4] * TVK[p]);
      if (lit < FLOOR) lit = FLOOR;
      const gl = 1 + INK_GLOSS * acc[5];
      out[o] = enc(acc[0] * lit * KEYC[0] + SPR[p] * gl + ADR[p]);
      out[o + 1] = enc(acc[1] * lit * KEYC[1] + SPG[p] * gl + ADG[p]);
      out[o + 2] = enc(acc[2] * lit * KEYC[2] + SPB[p] * gl + ADB[p]);
      out[o + 3] = A[p];
    }
    ctx.putImageData(img, 0, 0);
  }

  return {
    /** Rebuild for a new pixel size if the box changed; true when it did. */
    resized: setup,
    /** Draw the ball turned `theta` radians (0..PI), at the canvas's current size. */
    draw(theta) { setup(); frame(theta); },
    /** Drop the per-size buffers (a megabyte or two on the 4K TV). */
    destroy() { S = null; },
  };
}
