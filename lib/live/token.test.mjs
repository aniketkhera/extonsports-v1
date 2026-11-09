/* The day pass behind extonsports.com/live (lib/live/token.ts).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test   (node:test on the .ts sources; see app/board/board-lib.test.mjs for
   why this repo has no test runner)

   Aniket, 2026-11-09: "let's have a new link every day". These are the rules that make
   that true, and the ones that keep a parent's address out of the link. Every rule below
   fails the test when broken. */
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

const { clubDay, mintToken, readToken, normaliseEmail, watchUrl } = await import('./token.ts')

const KEY = 'test-key-not-a-real-one'
const OTHER = 'a-different-key'
const DAY = '2026-11-09'

test('a fresh token reads back on the day it was minted', () => {
  const t = mintToken('Parent@Example.com', KEY, DAY)
  const r = readToken(t, KEY, DAY)
  assert.equal(r.ok, true)
  assert.equal(r.day, DAY)
})

test('the address is never in the token, in any casing', () => {
  const t = mintToken('Parent@Example.com', KEY, DAY)
  assert.ok(!t.toLowerCase().includes('parent'))
  assert.ok(!t.includes('@'))
  assert.ok(!t.toLowerCase().includes('example'))
})

test('the same address mints the same holder id whatever the casing or spacing', () => {
  const a = mintToken('Parent@Example.com', KEY, DAY)
  const b = mintToken('  parent@example.com  ', KEY, DAY)
  assert.equal(a, b)
  assert.equal(normaliseEmail('  Parent@Example.COM '), 'parent@example.com')
})

test('two different addresses get different tokens on the same day', () => {
  assert.notEqual(mintToken('a@example.com', KEY, DAY), mintToken('b@example.com', KEY, DAY))
})

test("yesterday's token is expired today, which is the whole point", () => {
  const t = mintToken('parent@example.com', KEY, '2026-11-08')
  const r = readToken(t, KEY, DAY)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'expired')
})

test("tomorrow's token does not work early either", () => {
  const t = mintToken('parent@example.com', KEY, '2026-11-10')
  assert.equal(readToken(t, KEY, DAY).reason, 'expired')
})

test('a token signed with another key is refused as a bad signature, not as expired', () => {
  const t = mintToken('parent@example.com', OTHER, DAY)
  const r = readToken(t, KEY, DAY)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'bad_signature')
})

test('a forged token is never told that its date was the problem', () => {
  // Signature is checked first, so an attacker probing dates learns nothing from the reason.
  const t = mintToken('parent@example.com', OTHER, '2026-11-08')
  assert.equal(readToken(t, KEY, DAY).reason, 'bad_signature')
})

test('tampering with the day breaks the signature', () => {
  const t = mintToken('parent@example.com', KEY, '2026-11-08')
  const moved = t.replace('2026-11-08', DAY)
  assert.equal(readToken(moved, KEY, DAY).reason, 'bad_signature')
})

test('rubbish is malformed, and nothing throws', () => {
  for (const bad of ['', 'x', '1.2.3', '....', 'a.b.c.d', '1.2026-11-09.short.sig', null, undefined, 42]) {
    const r = readToken(bad, KEY, DAY)
    assert.equal(r.ok, false, String(bad))
    assert.equal(r.reason, 'malformed', String(bad))
  }
})

test('no key means no pass, rather than an unsigned one', () => {
  assert.equal(readToken(mintToken('a@b.com', KEY, DAY), '', DAY).reason, 'malformed')
  assert.throws(() => mintToken('a@b.com', '', DAY))
})

test('the club day is the club\'s, not UTC — a 9pm ET class is still today', () => {
  // 2026-11-10T02:30:00Z is 9:30 pm on 9 Nov in New York.
  const at = new Date('2026-11-10T02:30:00Z')
  assert.equal(clubDay(at), '2026-11-09')
  assert.equal(clubDay(at, 'UTC'), '2026-11-10')
})

test('the club day rolls at midnight local, not at 00:00 UTC', () => {
  assert.equal(clubDay(new Date('2026-11-10T04:59:00Z')), '2026-11-09') // 11:59 pm ET
  assert.equal(clubDay(new Date('2026-11-10T05:01:00Z')), '2026-11-10') // 12:01 am ET
})

test('the watch url is built one way and tolerates a trailing slash', () => {
  const t = mintToken('a@b.com', KEY, DAY)
  assert.equal(watchUrl('https://extonsports.com', t), `https://extonsports.com/live/${t}`)
  assert.equal(watchUrl('https://extonsports.com/', t), `https://extonsports.com/live/${t}`)
})
