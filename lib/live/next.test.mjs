/* The next-stream line on the off-air watch page (lib/live/next.ts).
   Run:  npm test */
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

const { parseNext, nextWords, clock, dayLabel, upcomingStream, forgetNext } = await import('./next.ts')

const TONIGHT = {
  date: '2026-11-13', start: '18:00', end: '20:00',
  sides: [{ sport: 'cricket', start: '18:00', end: '20:00' }],
}

test('reads the platform answer', () => {
  assert.deepEqual(parseNext({ next: TONIGHT, nextReadFailed: false }), TONIGHT)
  assert.equal(parseNext({ next: null, nextReadFailed: false }), null)
})

test('a failed read, a missing field or a strange shape is unknown, never "none"', () => {
  assert.equal(parseNext({ next: null, nextReadFailed: true }), 'unknown')
  assert.equal(parseNext({ stream: false }), 'unknown')
  assert.equal(parseNext(null), 'unknown')
  assert.equal(parseNext({ next: { ...TONIGHT, start: '6pm' }, nextReadFailed: false }), 'unknown')
  assert.equal(parseNext({ next: { ...TONIGHT, sides: [] }, nextReadFailed: false }), 'unknown')
  assert.equal(
    parseNext({ next: { ...TONIGHT, sides: [{ sport: 'squash', start: '18:00', end: '19:00' }] }, nextReadFailed: false }),
    'unknown',
  )
})

test('clock times read the way the club writes them', () => {
  assert.equal(clock('18:00'), '6:00 pm')
  assert.equal(clock('09:30'), '9:30 am')
  assert.equal(clock('12:00'), '12:00 pm')
  assert.equal(clock('24:00'), 'midnight')
})

test('days are today, tomorrow, or named', () => {
  assert.equal(dayLabel('2026-11-13', '2026-11-13'), 'today')
  assert.equal(dayLabel('2026-11-14', '2026-11-13'), 'tomorrow')
  assert.equal(dayLabel('2026-11-16', '2026-11-13'), 'Monday 16 November')
})

test('tonight, one sport', () => {
  assert.deepEqual(nextWords(TONIGHT, '2026-11-13'), {
    headline: 'Next session: today at 6:00 pm.',
    lines: ['Cricket 6:00 pm – 8:00 pm'],
    newLinkNeeded: false,
  })
})

test('a later day says a new link is needed, and both sports get their own hours', () => {
  const w = nextWords(
    {
      date: '2026-11-16', start: '17:00', end: '20:00',
      sides: [
        { sport: 'badminton', start: '17:00', end: '19:30' },
        { sport: 'cricket', start: '18:00', end: '20:00' },
      ],
    },
    '2026-11-13',
  )
  assert.equal(w.headline, 'Next session: on Monday 16 November at 5:00 pm.')
  assert.deepEqual(w.lines, ['Badminton 5:00 pm – 7:30 pm', 'Cricket 6:00 pm – 8:00 pm'])
  assert.equal(w.newLinkNeeded, true)
})

test('nothing this week is said; unknown says nothing', () => {
  assert.match(nextWords(null, '2026-11-13').headline, /next seven days/)
  assert.equal(nextWords('unknown', '2026-11-13'), null)
})

test('a fetch that throws or fails is unknown', async () => {
  forgetNext()
  assert.equal(await upcomingStream(async () => { throw new Error('down') }, 1), 'unknown')
  forgetNext()
  assert.equal(await upcomingStream(async () => new Response('', { status: 500 }), 2), 'unknown')
  forgetNext()
  const ok = async () => new Response(JSON.stringify({ next: TONIGHT, nextReadFailed: false }))
  assert.deepEqual(await upcomingStream(ok, 3), TONIGHT)
})
