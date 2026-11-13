// Does the extend panel fit the badminton TV? (orangish-app docs/court-extend.md §10.9, decision 2:
// "just make sure it fits the TV".) A port of the 2026-11-02 mock-up tools (mockups/tvb.mjs +
// inject-b.js) onto the REAL component: it loads this site's /badminton with a screen key, routes
// the keyed court-board to each scenario's answer (scenarios.mjs), freezes the clock, and measures
// what the page itself drew.
//
//   node scripts/tv-fit/fit.mjs [--base http://localhost:3123] [--out <dir>] [--sizes 1280x720@1.5,1920x1080@1] [scenario ...]
//   python scripts/tv-fit/decode.py <dir>          # then decode every code from the screenshots
//
// Needs a running build of this site (next build && next start, or next dev) at --base, and
// Playwright and qrcode, which this site does not depend on: they are loaded from TV_FIT_FROM, a
// folder whose node_modules has both — by default the orangish-app checkout, whose qrcode@1.5.4
// is the very encoder the platform draws the TV's codes with. Chromium from `npx playwright install`.
//
// For each scenario × size it writes <out>/<size>/<scenario>.png and one report.json, and prints a
// line per face. A face FAILS when anything inside the panel lies outside it, any text is cut, the
// panel leaves its cell, anything in the NOW column runs past the column, or the band still shows
// its booking QR beside the panel. 1280x720@1.5 is the VIZIO M55Q6-L4's CSS viewport as measured on
// the reception set (same model); the badminton set's own is still to be read (§11.2 step 5).
//
// Re-run on any change to the panel, the code text, SportBoard's SCALE or BookingBand.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SCENARIOS, payload, instantOf } from './scenarios.mjs'

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v }
const base = opt('--base', 'http://localhost:3123').replace(/\/$/, '')
const out = opt('--out', join(process.env.TEMP || '/tmp', 'tv-fit'))
const sizes = opt('--sizes', '1280x720@1.5,1920x1080@1').split(',').map((s) => {
  const [, w, h, dpr] = /^(\d+)x(\d+)@([\d.]+)$/.exec(s) || []
  if (!w) throw new Error(`bad size ${s}`)
  return { w: +w, h: +h, dpr: +dpr, tag: s.replace('@', 'at') }
})
const only = args

const from = process.env.TV_FIT_FROM || 'C:/Users/rkher/orangish-app'
const require = createRequire(join(from, 'package.json'))
const { chromium } = require('playwright')
const QRCode = require('qrcode')

/** orangish-app lib/court-extend-code.ts extendQr, line for line: byte mode, ECC M, version 3
 *  forced, dark modules walked into runs, offset by a 2-module quiet zone in a 33-unit viewBox. */
function qrFor(text) {
  const qr = QRCode.create([{ data: new Uint8Array(Buffer.from(text, 'utf8')), mode: 'byte' }], { errorCorrectionLevel: 'M', version: 3 })
  const n = qr.modules.size
  if (n !== 29) throw new Error(`${n} modules`)
  const parts = []
  for (let y = 0; y < n; y++) {
    let x = 0
    while (x < n) {
      if (!qr.modules.get(y, x)) { x++; continue }
      let run = 1
      while (x + run < n && qr.modules.get(y, x + run)) run++
      parts.push(`M${x + 2} ${y + 2}h${run}v1h-${run}z`)
      x += run
    }
  }
  return { size: n + 4, d: parts.join('') }
}

/** Measured in the page: every check §10.9 asks for, on what the component drew. */
function measure() {
  const r = (el) => el.getBoundingClientRect()
  const bad = []
  const short = (el) => `${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 48)}"`
  const wrap = document.querySelector('[data-extend-panel]')
  /* The NOW column is the board grid's first cell, found from its ON NOW / UP NEXT line, so it
     is measured with no panel up too (the MOVE TO COURT 3 face comes after the offer is gone). */
  const slot = [...document.querySelectorAll('div')].find((d) => /^(ON NOW|UP NEXT)/.test(d.textContent.trim()) && d.children.length === 0 || (d.childNodes[0]?.nodeType === 3 && /^(ON NOW|UP NEXT)/.test(d.childNodes[0].textContent)))
  let now = slot
  while (now && now.parentElement && getComputedStyle(now.parentElement).display !== 'grid') now = now.parentElement
  const grid = wrap?.parentElement ?? now?.parentElement
  const res = { viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}`, layout: wrap?.dataset.extendPanel ?? null }
  if (wrap) {
    const panel = wrap.firstElementChild
    const p = r(panel)
    const cs = getComputedStyle(panel)
    // The content box: inside the border and the padding.
    const box = {
      l: p.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft) - 0.5,
      t: p.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop) - 0.5,
      r: p.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) + 0.5,
      b: p.bottom - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingBottom) + 0.5,
    }
    for (const el of panel.querySelectorAll('*')) {
      const e = r(el)
      if (!e.width && !e.height) continue
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue
      if (e.left < box.l || e.right > box.r || e.top < box.t || e.bottom > box.b) bad.push(`${short(el)} OUTSIDE the panel`)
      if (el.scrollWidth > el.clientWidth + 1 && el.children.length === 0) bad.push(`${short(el)} CUT (${el.scrollWidth} > ${el.clientWidth})`)
    }
    const g = r(grid)
    if (p.right > g.right + 0.5 || p.bottom > g.bottom + 0.5 || p.top < g.top - 0.5) bad.push('the panel leaves its cell')
    res.panelCss = [Math.round(p.width), Math.round(p.height)]
    /* Spare room under the last thing in the panel: how close to the edge this face is. The
       tiles of `one` and the cards of `cards-one-code` stretch to fill, so they are held at
       their natural height for this one reading, then let go. */
    const grown = [...panel.querySelectorAll('*')].filter((el) => parseFloat(getComputedStyle(el).flexGrow) > 0)
    grown.forEach((el) => { el.dataset.fitFlex = el.style.flex; el.style.flex = 'none' })
    const last = Math.max(...[...panel.children].map((c) => r(c).bottom))
    res.spareCss = Math.round(box.b - last)
    grown.forEach((el) => { el.style.flex = el.dataset.fitFlex; delete el.dataset.fitFlex })
    res.codes = [...panel.querySelectorAll('svg')].map((s) => {
      const q = r(s)
      const pad = r(s.parentElement)
      return { css: +q.width.toFixed(1), x: pad.left, y: pad.top, w: pad.width, h: pad.height }
    })
    // A 55" 16:9 panel is 121.8 cm across the whole viewport.
    res.moduleMm = res.codes.length ? +Math.min(...res.codes.map((c) => (c.css / 33) * (1218 / innerWidth))).toFixed(2) : null
    res.codeCm = res.codes.length ? +Math.min(...res.codes.map((c) => c.css * (121.8 / innerWidth))).toFixed(1) : null
  }
  if (now) {
    const c = r(now)
    for (const el of now.querySelectorAll('*')) {
      const e = r(el)
      if (!e.width && !e.height) continue
      if (e.right > c.right + 0.5) bad.push(`${short(el)} runs past the NOW column`)
      /* Text that spills out of its own box is clipped by the column (NowArea hides its
         overflow) even though the box itself fits: so measure the text's own right edge.
         Missed on the first run of 2026-11-03, which passed a cut "MOVE TO COURT 3 AT 2:0". */
      else if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && e.left + el.scrollWidth > c.right + 0.5) bad.push(`${short(el)} CUT by the NOW column (${Math.round(e.left + el.scrollWidth - c.right)} px over)`)
      if (el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && getComputedStyle(el).overflow !== 'visible') bad.push(`${short(el)} CUT in the NOW column`)
    }
    res.nowText = [...now.querySelectorAll('div')].filter((d) => d.children.length === 0 && d.textContent.trim()).map((d) => d.textContent.trim())
    res.notes = [...now.querySelectorAll('span')].map((s) => s.textContent.trim()).filter((t) => /FREE AFTER|NEXT GROUP|MOVE TO/.test(t))
  }
  const bandQr = document.querySelector('img[src="/reception/book-qr.svg"]')
  const orScan = [...document.querySelectorAll('span')].some((s) => s.textContent.trim() === 'or scan')
  res.bandQr = !!bandQr
  if (wrap && (bandQr || orScan)) bad.push('the band still shows its booking QR beside the panel')
  if (!wrap && !bandQr) bad.push('no panel, yet the band QR is hidden')
  /* The music code (MusicQr.tsx, 2026-11-13): it goes and comes back with the booking QR, and
     sits wholly between the orangish.io pill and the booking line — never over either. */
  const musicQr = document.querySelector('[data-music-qr]')
  res.musicQr = !!musicQr
  if (wrap && musicQr) bad.push('the band shows the music QR beside the panel')
  if (!wrap && !musicQr) bad.push('no panel, yet the music QR is hidden')
  if (musicQr) {
    const m = r(musicQr)
    const book = document.querySelector('a[aria-label="Book a court or lane at Exton Sports"]')
    const pill = book?.parentElement?.firstElementChild
    const band = book?.parentElement
    if (pill && m.left < r(pill).right + 4) bad.push(`the music QR overlaps the orangish.io pill (${Math.round(r(pill).right + 4 - m.left)} px)`)
    if (book && m.right > r(book).left - 4) bad.push(`the music QR overlaps the booking line (${Math.round(m.right - r(book).left + 4)} px)`)
    if (band && (m.top < r(band).top - 0.5 || m.bottom > r(band).bottom + 0.5)) bad.push('the music QR leaves the band')
    const img = musicQr.querySelector('img')
    res.music = { left: Math.round(m.left), right: Math.round(m.right), qrCss: img ? +r(img).width.toFixed(1) : null,
      pillRight: pill ? Math.round(r(pill).right) : null, bookLeft: book ? Math.round(r(book).left) : null }
  }
  res.bad = bad
  return res
}

const browser = await chromium.launch()
const report = {}
let failed = 0
for (const size of sizes) {
  mkdirSync(join(out, size.tag), { recursive: true })
  for (const [name, s] of Object.entries(SCENARIOS)) {
    if (only.length && !only.includes(name)) continue
    const { body, texts } = payload(name, s, qrFor)
    const t = instantOf(s)
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.dpr })
    const page = await ctx.newPage()
    await page.clock.install({ time: t })
    await page.clock.pauseAt(t)
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
    // The keyed feed and the heartbeat only; anything else from the platform (the orangish.io
    // pill's font) loads as on the TV.
    await page.route('https://app.orangish.io/api/public/**', (route) => {
      const req = route.request()
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      if (req.url().includes('/api/public/court-board')) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
      return route.fulfill({ status: 204, headers: cors }) // the heartbeat
    })
    await page.route('**/api/screen-version**', (route) => route.fulfill({ contentType: 'application/json', body: '{"version":"tv-fit"}' }))
    // A screen key in the fragment, as tv-keeper opens a keyed TV: the page reads the keyed feed.
    await page.goto(`${base}/badminton#k=${'f'.repeat(43)}`, { waitUntil: 'networkidle' })
    await page.clock.runFor(2000)
    await page.waitForTimeout(500)
    // The border pulse, held at its brightest so every run draws the same pixels. Only that one:
    // the orangish.io pill's spin, frozen mid-turn, would read as a broken pill.
    await page.evaluate(() => document.getAnimations()
      .filter((a) => /extend-pulse/.test(a.animationName || ''))
      .forEach((a) => { a.pause(); a.currentTime = 1000 }))
    const m = await page.evaluate(measure)
    m.expect = texts
    const file = join(out, size.tag, `${name}.png`)
    await page.screenshot({ path: file })
    m.png = file
    report[`${size.tag}/${name}`] = m
    const ok = !m.bad.length && (s.offers.length ? m.layout : !m.layout)
    if (!ok) failed++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${size.tag.padEnd(14)} ${name.padEnd(20)} ${String(m.layout).padEnd(15)} panel ${m.panelCss?.join('x') ?? '-'} spare ${m.spareCss ?? '-'}px  codes ${m.codes?.map((c) => c.css).join('/') ?? '-'} css px (${m.codeCm ?? '-'} cm, module ${m.moduleMm ?? '-'} mm)${m.bad.length ? `\n     ${m.bad.join('\n     ')}` : ''}`)
    await ctx.close()
  }
}
/* THE GATE. The same answer, offers and all, on the screens that must never draw them: the
   cricket TV and reception (and the vestibule, which shares reception's parts). No panel, the
   band's booking QR as it was (the vestibule never had one), and the entry's line FREE AFTER
   alone (Q19). Last, the badminton TV UNKEYED, as it is today: its page reads the site's relay,
   here answering with offers it would never forward — still nothing, because an unkeyed page
   does not read `extend` at all. */
/* The music code (2026-11-13) is the badminton TV's alone: none on the other three, and on the
   unkeyed badminton page it shows (it is static and needs no feed). */
for (const [path, bandQr, keyed, musicQr] of [['/cricket', true, true, false], ['/reception', true, true, false], ['/vestibule', false, true, false], ['/badminton', true, false, true]]) {
  const s = SCENARIOS.one
  const { body } = payload('one', s, qrFor)
  const t = instantOf(s)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 })
  const page = await ctx.newPage()
  await page.clock.install({ time: t })
  await page.clock.pauseAt(t)
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' }
  await page.route('https://app.orangish.io/api/public/**', (route) => route.request().method() === 'OPTIONS' || !route.request().url().includes('court-board')
    ? route.fulfill({ status: 204, headers: cors })
    : route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) }))
  await page.route('**/api/screen-version**', (route) => route.fulfill({ contentType: 'application/json', body: '{"version":"tv-fit"}' }))
  await page.route('**/api/court-slots**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }))
  await page.goto(`${base}${path}${keyed ? `#k=${'f'.repeat(43)}` : ''}`, { waitUntil: 'networkidle' })
  await page.clock.runFor(2000)
  await page.waitForTimeout(500)
  const g = await page.evaluate(() => ({
    panel: !!document.querySelector('[data-extend-panel]'),
    bandQr: !!document.querySelector('img[src="/reception/book-qr.svg"]'),
    scan: document.body.innerText.includes('SCAN TO EXTEND'),
    freeAfter: document.body.innerText.includes('FREE AFTER'),
    inApp: document.body.innerText.includes('EXTEND IN THE APP'),
    musicQr: !!document.querySelector('[data-music-qr]'),
  }))
  const ok = !g.panel && g.bandQr === bandQr && !g.scan && !g.inApp && g.musicQr === musicQr
  if (!ok) failed++
  report[`gate${path}${keyed ? '' : ' (unkeyed)'}`] = g
  console.log(`${ok ? 'ok  ' : 'FAIL'} gate ${(path + (keyed ? '' : ' unkeyed')).padEnd(19)} panel ${g.panel} · band QR ${g.bandQr} · music QR ${g.musicQr} · SCAN TO EXTEND ${g.scan} · FREE AFTER ${g.freeAfter} · IN THE APP ${g.inApp}`)
  await page.screenshot({ path: join(out, `gate-${path.slice(1)}${keyed ? '' : '-unkeyed'}.png`) })
  await ctx.close()
}

await browser.close()
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2))
console.log(`\n${failed ? `${failed} FAILED` : 'every face fits'} — ${join(out, 'report.json')}`)
process.exitCode = failed ? 1 : 0
