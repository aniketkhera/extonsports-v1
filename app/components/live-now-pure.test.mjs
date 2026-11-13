/* The LIVE NOW badge's rules (app/components/live-now-pure.ts).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   The badge tells a visitor that cameras are live on children at their coaching session.
   Everything here is about it being silent unless that is certainly true, and about a
   failing endpoint not turning every open tab into a retry loop. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (err?.code !== 'ERR_MODULE_NOT_FOUND' || /\.[cm]?[jt]sx?$/.test(specifier)) throw err
      return nextResolve(specifier + (/^\.{1,2}\//.test(specifier) ? '.ts' : '.js'), context)
    }
  },
})

const { parseLiveStatus, pollDelayMs, POLL_OK_MS, POLL_MAX_MS, LIVE_STATUS_PATH, LIVE_NOW_COPY } =
  await import('./live-now-pure.ts')

test('only a real boolean true lights the badge', () => {
  assert.equal(parseLiveStatus({ live: true }), true)
})

test('false, and every shape that is not the answer, keeps it dark', () => {
  for (const body of [
    { live: false },
    {}, // the field missing entirely
    null,
    undefined,
    'live', // a string body
    42,
    [], // an array is an object; .live is undefined
    { Live: true }, // wrong case
    { live: null },
  ]) {
    assert.equal(parseLiveStatus(body), false, `expected dark for ${JSON.stringify(body)}`)
  }
})

test('truthy-but-not-true never counts, because a camera is on children', () => {
  // The dangerous near-misses: an endpoint that starts answering a string, or a 1, must
  // not quietly start claiming the club is live.
  for (const body of [{ live: 'true' }, { live: 1 }, { live: 'yes' }, { live: {} }]) {
    assert.equal(parseLiveStatus(body), false, `expected dark for ${JSON.stringify(body)}`)
  }
})

test('a healthy endpoint is asked on a steady, unhurried cadence', () => {
  assert.equal(pollDelayMs(0), POLL_OK_MS)
  assert.equal(pollDelayMs(-1), POLL_OK_MS)
})

test('failures back off, so an outage does not become a retry storm', () => {
  assert.equal(pollDelayMs(1), POLL_OK_MS * 2)
  assert.equal(pollDelayMs(2), POLL_OK_MS * 4)
  assert.ok(pollDelayMs(3) > pollDelayMs(2))
})

test('the backoff is capped, and a long outage cannot overflow back to a short delay', () => {
  assert.equal(pollDelayMs(9), POLL_MAX_MS)
  assert.equal(pollDelayMs(1000), POLL_MAX_MS)
  // 2 ** 1000 is Infinity; the exponent is clamped BEFORE the multiply so this stays finite.
  assert.ok(Number.isFinite(pollDelayMs(Number.MAX_SAFE_INTEGER)))
  assert.equal(pollDelayMs(Number.MAX_SAFE_INTEGER), POLL_MAX_MS)
})

test('the badge asks the status endpoint, which is not the watch page', () => {
  assert.equal(LIVE_STATUS_PATH, '/api/live/status')
  assert.equal(LIVE_NOW_COPY.href, '/live')
  // The badge must never carry the way in; it points at the door, not the picture.
  assert.ok(!LIVE_STATUS_PATH.includes('token'))
  assert.ok(!JSON.stringify(LIVE_NOW_COPY).includes('youtube'))
})
