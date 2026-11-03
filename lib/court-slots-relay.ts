import type { CourtSlots } from '../app/api/court-slots/route'
import { publicLights } from './public-lights'

// What the public relay (app/api/court-slots/route.ts) forwards of the platform's
// court-slots answer. Moved out of the route unchanged on 2026-11-03, so a test can prove
// what it drops without a network call — the lib/public-lights.ts precedent (a Next.js
// route module may export only route fields).
//
// ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH, and it must stay one. Since 2026-11-03 the
// platform's KEYED court board can carry `extend`: live codes that hold courts and open a
// Checkout for somebody's booking, with its courts, end time and price (orangish-app
// docs/court-extend.md §7.4). The platform never puts it on the public court-slots this
// relays — and if it ever did, this rebuild would still drop it, because every field
// below is copied by name. The relay is cached and serves the unkeyed /badminton, the
// public /calendar and a calendar emailed to a mailing list: an unkeyed TV therefore
// shows today's board and no code. lib/court-slots-relay.test.mjs pins it.

export const EMPTY: CourtSlots = { timeZone: 'America/New_York', days: [], courts: [], blocks: [] }

/** The keys this proxy will forward. Anything else is dropped silently.
    'throwball' (2026-10-23): Reshma's team's Sunday 18:30-20:30 series, which Aniket
    asked the calendar to name. A fixed word from the platform's closed vocabulary,
    like the four partners — never the event's own title. */
const PARTNERS = ['squashtigers', 'ccca', 'philadelphia-badminton', 'sera', 'throwball'] as const
const SESSIONS = ['junior-coaching', 'open-play', 'free-girls-class'] as const

/** The upstream answer, rebuilt from the allow-list — or EMPTY when it is not the shape. */
export function relaySlots(raw: unknown, wantLights: boolean): CourtSlots {
  const body = (raw ?? {}) as Partial<CourtSlots>
  if (!Array.isArray(body.days) || !Array.isArray(body.courts) || !Array.isArray(body.blocks)) {
    return EMPTY
  }

  // Re-shaped rather than forwarded: the upstream may grow fields, and the
  // overlay should only ever receive what it renders.
  return {
    timeZone: typeof body.timeZone === 'string' ? body.timeZone : EMPTY.timeZone,
    days: body.days.filter((d) => typeof d === 'string'),
    courts: body.courts
      .filter((c) => c && typeof c.id === 'string' && typeof c.sport === 'string')
      .map((c) => ({
        id: c.id,
        sport: c.sport,
        sportId: String(c.sportId ?? ''),
        name: String(c.name ?? ''),
        label: String(c.label ?? ''),
      })),
    blocks: body.blocks
      .filter((b) => b && typeof b.date === 'string' && typeof b.courtId === 'string'
        && typeof b.from === 'number' && typeof b.to === 'number'
        && (b.kind === 'booking' || b.kind === 'programme'))
      .map((b) => {
        // ⛔ AN ALLOW-LIST, NOT A PASS-THROUGH, and that is the whole guard:
        // whatever the upstream sends, the only identity that can reach this
        // public page is one of the fixed keys in PARTNERS. The previous version capped
        // `who` at four characters on the same reasoning — the upstream was
        // meant to have reduced it to initials, and forwarding a full name to
        // a public page on the strength of a remote response is the mistake
        // worth refusing locally. Now nothing textual is forwarded at all.
        const org = PARTNERS.find((k) => k === b.org)
        // Same rule for the session: one of three fixed words, or nothing.
        const session = SESSIONS.find((k) => k === b.session)
        /* The true edges (2026-10-25): a number, or nothing — and only one inside
           the block's own first or last half hour, which is all the platform ever
           sends. Anything else is dropped rather than trusted, so a bad value can
           only cost the countdown its precision, never move a booking. */
        const exactFrom = typeof b.exactFrom === 'number' && b.exactFrom > b.from && b.exactFrom < b.from + 30 ? b.exactFrom : undefined
        const exactTo = typeof b.exactTo === 'number' && b.exactTo < b.to && b.exactTo > b.to - 30 ? b.exactTo : undefined
        return {
          date: b.date, courtId: b.courtId, from: b.from, to: b.to, kind: b.kind,
          ...(org ? { org } : {}),
          ...(session ? { session } : {}),
          ...(exactFrom !== undefined ? { exactFrom } : {}),
          ...(exactTo !== undefined ? { exactTo } : {}),
          ...(b.continues === true ? { continues: true as const } : {}),
        }
      }),
    ...(wantLights && publicLights(body.lights) ? { lights: publicLights(body.lights) } : {}),
  } satisfies CourtSlots
}
