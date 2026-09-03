import { NextResponse } from 'next/server'
import { fetchProgramSchedules, programSlug } from '../../../lib/club-schedule'

// GET /api/featured
// ---------------------------------------------------------------------------
// Schedule and price for the sessions on the hero's Featured rail. The site
// deliberately holds none of this: a class time or a drop-in price written into
// the marketing copy goes stale the moment someone reschedules on the platform,
// and the visitor finds out only at checkout. So the card renders the name and
// the description from this repo and asks Orangish for everything that moves.
//
// ⛔ THIS ROUTE WAS DEAD FROM THE DAY IT SHIPPED. It was written against
//
//   GET /api/public/sessions?club=<uuid>&slugs=<a,b,c>
//
// which was never built and still 404s, so https://extonsports.com/api/featured
// returned {"sessions":[]} in production and the rail never showed a schedule.
// It also read EXTON_CLUB_ID, which is set nowhere, so it short-circuited to
// empty before even attempting the fetch.
//
// It now reads the endpoint that exists, via lib/club-schedule.ts — the same
// source /api/schedule uses, so the hero roster and the Featured rail cannot
// disagree about when a class runs.
//
// Programmes are matched to the rail by SLUG, derived from the platform's
// programme name ("Bollywood Dance" → "bollywood-dance") rather than a second
// hardcoded table that would need keeping in step with FEATURES in
// app/components/Featured.tsx.

export const revalidate = 300

export type FeaturedSession = {
  slug: string
  /** "Tuesdays & Thursdays · 7:00 PM", or null when unscheduled. */
  when: string | null
  /** "$25 drop-in", or null when the platform has no price. */
  price: string | null
  /** "Starts Sep 15" while the programme has not begun, else null. */
  startsOn: string | null
  /** Null hides the hint entirely rather than implying an empty class. */
  spotsLeft: number | null
}

export type FeaturedPayload = { sessions: FeaturedSession[] }

/** Slugs the Featured rail asks about. Keep in step with FEATURES. */
const FEATURED_SLUGS = ['bollywood-dance']

export async function GET() {
  const programs = await fetchProgramSchedules()

  const sessions: FeaturedSession[] = programs
    .filter((p) => FEATURED_SLUGS.includes(programSlug(p.program)))
    .map((p) => ({
      slug: programSlug(p.program),
      when: p.when,
      // The rail says "drop-in" because that is what a single session is; the
      // number itself is the platform's, never retyped here.
      price: p.price ? `${p.price} drop-in` : null,
      startsOn: p.startsOn,
      // The club runs hide_schedule_details, so the platform withholds the
      // roster and sends an authoritative is_full instead of a count. There is
      // no honest "3 spots left" to publish — only "full" or nothing.
      spotsLeft: null,
    }))

  return NextResponse.json({ sessions } satisfies FeaturedPayload)
}
