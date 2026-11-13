/* Which sport the club TVs may name (lib/live/sports.ts).
   ──────────────────────────────────────────────────────────────────────────────
   Run:  npm test

   A sign on the wall that names a court is a claim that children on that court are on the
   internet right now. Every case here is a way of getting that claim wrong. */
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

const { parseSports, sportsOnAir, bandLine, NO_SPORTS } = await import('./sports.ts')

const ON = { on: true }
const OFF = { on: false, reason: 'no PBA booking' }

test('the platform answer is read side by side', () => {
  assert.deepEqual(parseSports({ badminton: OFF, cricket: ON, readFailed: false }), {
    badminton: false,
    cricket: true,
  })
})

test('a platform that could not read its own bookings names nothing', () => {
  // It sends the sides as false anyway, but relying on that would make this silently
  // dependent on a detail of someone else's route.
  assert.deepEqual(parseSports({ badminton: ON, cricket: ON, readFailed: true }), NO_SPORTS)
})

test('every shape that is not the answer names nothing', () => {
  for (const body of [null, undefined, 'live', 42, [], {}, { cricket: true }, { cricket: 'on' }]) {
    assert.deepEqual(parseSports(body), NO_SPORTS, `expected nothing for ${JSON.stringify(body)}`)
  }
})

test('truthy-but-not-true never lights a court', () => {
  assert.deepEqual(parseSports({ cricket: { on: 'true' }, badminton: { on: 1 } }), NO_SPORTS)
})

test('no broadcast means no sport, whatever the calendar says', () => {
  // The encoder is the thing actually serving video. A booked session with a dead push
  // must not put a sign up.
  assert.deepEqual(sportsOnAir(false, { badminton: true, cricket: true }), NO_SPORTS)
})

test('a broadcast names only the sides the schedule has on', () => {
  assert.deepEqual(sportsOnAir(true, { badminton: false, cricket: true }), {
    badminton: false,
    cricket: true,
  })
})

test('the line names what is on, and stays vague when it cannot tell', () => {
  assert.equal(bandLine({ badminton: false, cricket: true }), 'Cricket is streaming')
  assert.equal(bandLine({ badminton: true, cricket: false }), 'Badminton is streaming')
  assert.equal(bandLine({ badminton: true, cricket: true }), 'Cricket and badminton are streaming')
  // Broadcast up, schedule unreadable: still true, and claims nothing about which court.
  assert.equal(bandLine(NO_SPORTS), 'A coaching session is streaming')
})

test('the vague line never names a court', () => {
  const line = bandLine(NO_SPORTS).toLowerCase()
  assert.ok(!line.includes('cricket'))
  assert.ok(!line.includes('badminton'))
})
