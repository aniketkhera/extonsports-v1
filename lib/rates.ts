// Published court rates for Exton Sports Center.
//
// Exton is provisioned pay-per-use on the platform — `locations.features` for
// the club carries `pay_per_use_courts: true`, `guest_booking: true` and
// `public_join: false`, so there is no membership to sell and the court rate is
// the whole offer. That is why the hero publishes this table instead of a list
// of membership tiers.
//
// ⛔ THE WINDOWS BELOW WERE WRONG UNTIL 2026-08-30, AND WRONG IN THE DIRECTION
// THAT COSTS MONEY. Every disagreement with the platform UNDER-stated the
// price, so the page advertised less than a booking would actually charge:
//
//   weekday 9–10pm      said late night  $35   →  actually peak      $45
//   weekend 4–8pm       said off-peak $40   →  actually peak      $45
//   Fri/Sat 10pm–12am   said late night  $35   →  actually off-peak  $40
//
// Harmless while Exton has taken no bookings. A mispriced sale the moment it
// takes one. Corrected below against the live `court_rate_rules` grid.
//
// ── TWO BANDS FROM 2026-10-08. LATE NIGHT IS GONE. ─────────────────────────
// Aniket's call: "we do not have late night". There were three bands; the
// cheap 10pm–6am one is abolished and those hours are simply off-peak now.
//
//   Peak      4pm–10pm Mon–Fri · 8am–8pm Sat/Sun
//   Off-peak  every other hour
//
// ⚠️ THAT IS A PRICE RISE, NOT A RELABEL. An hour that was late night now
// costs the off-peak rate — badminton and squash $35 → $40, cricket $45 → $50.
// The peak windows did NOT move; they were already 4–10pm and 8am–8pm, so the
// only thing that changed in the grid is the disappearance of the third band.
// Matched in the same change by 42 rows in the platform's court_rate_rules,
// which is the grid that actually charges.
//
// Note the weekend inversion, which survives: Saturday and Sunday mornings are
// peak, weekday mornings are not.
//
// ── CRICKET $55 / $65 FROM 2026-10-10 ──────────────────────────────────────
// Aniket: "change those to $65 and $55 for peak and off-peak ... keep the peak
// and non-peak hours same". Cricket only — badminton and squash stay $40/$45.
//
//   Cricket   off-peak $50 → $55   peak $55 → $65
//
// The platform's 42 published cricket rows in court_rate_rules were changed
// FIRST, the same day, because that grid is what charges; for the few minutes
// between the two deploys this page under-stated the price, which is the
// direction the 2026-08-30 note above warns about. Bands untouched: still
// 54 peak hours and 114 off-peak a week. Peak is now $10 over off-peak where it
// was $5, so cricket is the one sport whose two numbers are not $5 apart —
// nothing here derives one from the other, but check before assuming it.
//
// ── WEEKEND PEAK TO 10PM FROM 2026-10-14 ───────────────────────────────────
// Aniket: "change peak hours for sat and sun from 8am to 10pm. change on the
// website, and orangish app". Saturday and Sunday peak was 8am–8pm; the 8am start
// stands and the end moves to 10pm, so it matches the weekday 10pm end.
//
//   Peak      4pm–10pm Mon–Fri · 8am–10pm Sat/Sun
//   Off-peak  every other hour — from 10pm every night
//
// ⚠️ A PRICE RISE, NOT A RELABEL. Sat/Sun 8–10pm moves off-peak → peak:
// badminton and squash $40 → $45, cricket $55 → $65 an hour. Per sport the week
// goes from 54 to 58 peak hours and 114 to 110 off-peak. THIS PAGE CHANGED FIRST,
// the platform's six court_rate_rules rows (Sat/Sun 20:00–22:00, two per sport)
// straight after it — so for the minutes between, this page over-stated the price
// rather than under-stating it, which is the safe direction the 2026-08-30 note
// above asks for. Record: orangish-app supabase/migrate_exton_weekend_peak_to_22.sql.
//
// ── PEAK NARROWS TO 5PM–9PM WEEKDAYS, 8AM–9PM WEEKENDS, FROM 2026-10-15 ─────
// Aniket: "make weekdays 5pm to 9pm peak hours, weekends 8am to 9pm peak hours.
// All else off-peak ... for all sports." Prices do not move; only the edges do.
//
//   Peak      5pm–9pm Mon–Fri · 8am–9pm Sat/Sun
//   Off-peak  every other hour — from 9pm every night
//
// ⚠️ A PRICE CUT, NOT A RELABEL. Mon–Fri 4–5pm and 9–10pm, and Sat/Sun 9–10pm,
// move peak → off-peak: badminton and squash $45 → $40, cricket $65 → $55 an
// hour. No hour gets dearer. Per sport the week goes from 58 to 46 peak hours and
// 110 to 122 off-peak. Because it is a cut, the order is the REVERSE of
// 2026-10-14: the platform's court_rate_rules changed FIRST (18:00 UTC) and this
// page straight after, so for the minutes between this page over-stated the price —
// the safe direction the 2026-08-30 note above asks for.
// Record: orangish-app supabase/migrate_exton_peak_17_21.sql.
//
// ── WHY THIS IS STILL A HARDCODED COPY, AND WHAT REPLACES IT ────────────────
// (Stale since 2026-10-08, kept for the history: the platform had FOUR day-kinds
// — Mon–Thu, Fri, Sat and Sun — while late night existed. Since then it is exactly
// two — from 2026-10-15 Mon–Fri peak 5pm–9pm, Sat/Sun peak 8am–9pm, off-peak every
// other hour — which this two-column model expresses exactly.)
//
// The durable fix is not to widen this table: it is to stop retyping the hours.
// orangish-app now serves `court_band_windows` (already coalesced, 42 rows to
// 27) alongside the rate card on the public club endpoint, plus `max_players`
// per (sport, band). Once that is deployed, RATE_BANDS and the footnote should
// be RENDERED from it and this block deleted. Keeping the prices as a fallback
// is fine; keeping the hours is what drifted.

export type BandKey = 'offPeak' | 'peak'

export type Band = {
  key: BandKey
  /** Column heading. */
  label: string
  /** Window, spelled out for the footnote. */
  weekday: string
  weekend: string
}

/* Column order — PEAK FIRST, then off-peak, then late night. Deliberately not
   cheapest-to-dearest, which is how it read until 2026-10-01: peak is the band
   most people are actually shopping for, so it leads and late night (a genuine
   edge case) trails. Both the hero rate card and the footer map this array, so
   changing the order here moves both — which is the point, they should agree.
   `5pm–9pm` is spelled with both meridiems on purpose: `5–9pm` can be read as
   5am. `8am–9pm` (weekend peak, from 2026-10-15) needs both for the same reason. */
export const RATE_BANDS: Band[] = [
  { key: 'peak', label: 'Peak', weekday: '5pm–9pm', weekend: '8am–9pm' },
  /* Off-peak is now "whatever peak is not", and is written that way rather
     than as a window. The honest window wraps midnight — weekday 9pm–5pm,
     weekend 9pm–8am (from 2026-10-15; before that 10pm–4pm and 10pm–8am) — and a
     reader parses that as a typo before they parse it as a wrap. */
  { key: 'offPeak', label: 'Off-peak', weekday: 'all other hours', weekend: 'all other hours' },
]

/**
 * How many people a court holds, per sport, per band — INCLUDING the booker.
 *
 * The page used to say "the court rate covers everyone on it". That is true
 * about the PRICE and false about the HEADCOUNT: peak seats half what off-peak
 * does, and someone who books a squash court at 5pm for four people is turned
 * away at the door. Mirrors `court_player_limits` on the platform.
 */
export type SportCap = {
  /** Cap for a one-hour booking. */
  base: number
  /** Extra people admitted per hour beyond the first. */
  step: number
}

/**
 * ⚠️ THE CAP HAS TWO DIMENSIONS, not one. It moves with the BAND and with the
 * LENGTH of the booking, because a three-hour court is people rotating on and
 * off rather than the same four standing still.
 *
 * The step is per sport on purpose: a cricket lane over three hours is a squad
 * rotating through, where a squash court is a few pairs. An earlier version of
 * this note said off-peak "doubles" the peak number, which was true of squash
 * and of nothing else.
 *
 * Mirrors `court_player_limits` on the platform, which is the row set that
 * actually refuses people. Same standing caveat as the rates above: this is a
 * hardcoded copy, and the durable fix is to render it from the club endpoint
 * rather than retype it here.
 */
// Re-copied from the live rows 2026-10-13, when cricket came down to 8 a lane (+4 an
// hour: 8 / 12 / 16) — Aniket: "cricket - change 10 to 8 ... and change 2 and 3 hours
// in the same proportion". Squash and badminton were already one cap all day on the
// platform (4 / 6 / 8 and 6 / 8 / 10); this copy still had their old, lower peak figures.
// Lanes booked TOGETHER seat fewer than lanes x this (two cricket lanes 15, three 20, for
// an hour): GROUP_CAPS below. Not rendered since 2026-10-13 — the footer publishes a
// recommendation (4 / 6 / 8) instead of any caps; see lib/club-pricing.ts.
export const PLAYER_CAPS: Record<string, { peak: SportCap; offPeak: SportCap }> = {
  Squash: { peak: { base: 4, step: 2 }, offPeak: { base: 4, step: 2 } },
  Badminton: { peak: { base: 6, step: 2 }, offPeak: { base: 6, step: 2 } },
  Cricket: { peak: { base: 8, step: 4 }, offPeak: { base: 8, step: 4 } },
}

/** How many the court seats for a booking of `hours`, including the booker. */
export function capFor(cap: SportCap, hours: number): number {
  return cap.base + Math.max(0, Math.floor(hours) - 1) * cap.step
}

/** Courts of one sport booked TOGETHER, as one booking: how many, and the ONE-HOUR
 *  total for the lot, including the booker. */
export type GroupCap = { courts: number; base: number }

/**
 * Where courts booked together seat FEWER than that many single courts — Aniket,
 * 2026-10-13: "cricket - change 10 to 8, 20 to 15 and 30 to 20". Two lanes take 15 for
 * an hour, not 2 x 8 = 16; three take 20, not 24. Only these are listed; any other
 * number of courts is that many times one court.
 *
 * Mirrors `court_group_player_limits` on the platform, which the guest booking page
 * enforces. Same standing caveat as PLAYER_CAPS: a copy, used only when the club card
 * cannot be read (lib/club-pricing.ts).
 */
export const GROUP_CAPS: Record<string, GroupCap[]> = {
  Cricket: [{ courts: 2, base: 15 }, { courts: 3, base: 20 }],
}

/**
 * How many courts booked together seat for a booking of `hours`: the one-hour total
 * grown as ONE court of the sport grows, rounded down. Cricket two lanes: 15, then
 * 15 x 12/8 = 22.5 -> 22, then 15 x 16/8 = 30. The same arithmetic, and the same
 * rounding, as the platform's cb_group_player_cap_for_slot, so this table and the
 * booking page cannot disagree.
 */
export function groupCapFor(group: GroupCap, cap: SportCap, hours: number): number {
  const each = capFor(cap, hours)
  const one = capFor(cap, 1)
  const scaled = one > 0 ? Math.floor((group.base * each) / one) : group.base
  // Never more than that many single courts: the booking checks EACH court against its
  // own cap as well, so a together total above courts x one court could never be seated
  // (a group row left at 20 after a lane dropped to 8 would print 20 where 16 is the
  // most). The booking page clamps the same way (orangish-app groupPlayerCaps).
  return Math.min(scaled, group.courts * each)
}

/** The durations the booking sheet actually offers. */
export const CAP_HOURS = [1, 2, 3] as const

export type SportRate = {
  sport: string
  /** One line under the sport's name in the rate card: what the space is.
      Aniket's wording, 2026-10-22. */
  feature: string
} & Record<BandKey, number>

/* Cricket, badminton, squash — the club's own order, matching the academies
   panel in the hero. Not alphabetical and not cheapest-first; changing it here
   changes the hero table, and SPORT_ORDER below keeps the footer in step. */
export const COURT_RATES: SportRate[] = [
  { sport: 'Cricket', feature: '100-foot lanes', offPeak: 55, peak: 65 },
  { sport: 'Badminton', feature: 'Wood-sprung floors', offPeak: 40, peak: 45 },
  { sport: 'Squash', feature: 'All-glass squash courts', offPeak: 40, peak: 45 },
]

/** One order for every sport list on the site. */
export const SPORT_ORDER = COURT_RATES.map((r) => r.sport)

/** Cheapest hour on the board — the "from $X" figure.
    Reads off-peak now that late night is gone, so it moved $35 -> $40. */
export const RATE_FROM = Math.min(...COURT_RATES.map((r) => r.offPeak))

/**
 * The hero's one line. Deliberately short.
 *
 * The band hours went through the column headers (three lines deep — the table
 * is a PRICE table) and a run-on sentence (four rules nobody finishes) before
 * landing in the footer, where there is room to explain them properly. What
 * stays here is only what a buyer needs AT the moment they read a price: the
 * rate is per COURT, and it moves with the clock.
 */
// "a longer booking can take more people" came out 2026-10-13 with the footer's players
// tables (Aniket: "let's not put these numbers up"); the footer now gives one flat
// recommendation, so the old half of this sentence pointed at nothing.
export const RATE_FOOTNOTE =
  'One rate covers the whole court, not per person. Rates change with the time ' +
  'of day — explained below.'

/**
 * ⛔ RATE_FEES_NOTE WAS HERE AND IS DELETED, 2026-09-30.
 *
 * It read "Stripe fee (2.9% + 30¢) not included." and sat under the court rate
 * card. That was true while Exton's `fee_processing_mode` was 'pass' — a $40
 * court really was $41.50 at checkout. Aniket moved the club to 'absorb': a
 * $45 listing charges $45 and STE eats the 2.9% + 30c. `fee_platform_mode`
 * moved with it, which changes no price (every `platform_fee_*` column is
 * 0.00) but drops the platform's own `fees_extra` flag to false so the booking
 * calendar stops carrying the matching caveat.
 *
 * Deleted rather than reworded. The interim wording was "The price shown is
 * what you pay — no card fee added.", which is word-for-word CLASS_FEES_NOTE:
 * two constants, one sentence, on one page. A rate card that has nothing to
 * disclose should say nothing, not say it twice.
 *
 * ── WHY THIS IS RECORDED AT ALL ─────────────────────────────────────────────
 * The string was wrong twice in four weeks, always because the club's fee
 * treatment is RETYPED here rather than read:
 *   2026-09-03  the 75c platform fee was dropped (`platform_fee_fixed` = 0.00)
 *   2026-09-09  `fee_processing_absorb_surfaces` = ["program","lesson"], so
 *               classes began absorbing while courts still passed — which is
 *               the only reason CLASS_FEES_NOTE exists as a separate string
 *   2026-09-30  courts joined them, club-wide, and the note went
 *
 * ⚠️ IF A FEE NOTE IS EVER NEEDED AGAIN, DERIVE IT — do not retype it.
 * orangish-app publishes `hourly_rate_all_in` beside `hourly_rate` on
 * /api/public/clubs/<slug>; equal means absorbed. lib/club-pricing.ts already
 * fetches that endpoint for the player caps and needs only the extra field.
 *
 * ⚠️ And note the 2026-09-30 change was made club-wide, NOT by adding "court"
 * to fee_processing_absorb_surfaces, because orangish-app's
 * lib/court-booking-pricing.ts resolves fee modes without passing a surface —
 * a "court" entry there is a silent no-op on the charge path. So the surfaces
 * array is not a reliable place to read courts' treatment from either.
 */

/**
 * The studio classes and their packs, where the club EATS the card fee.
 *
 * Exton lists "program" in `locations.fee_processing_absorb_surfaces`, so
 * orangish-app resolves processing to 'absorb' on this surface: the flyer says
 * $25 and the card says $25.
 *
 * ⚠️ NO LONGER THE ODD ONE OUT, AND NOW THE ONLY ONE. This was written on
 * 2026-09-09 as the exception — two products, two conventions on one page,
 * justified only because telling somebody a number they will not be charged is
 * worse. On 2026-09-30 courts moved to absorb too. Rather than leave two
 * constants holding one identical sentence, RATE_FEES_NOTE was deleted; the
 * court rate card now carries no fee line at all, which says the same thing by
 * saying nothing.
 *
 * This one survives because it earns its place on a PACK price, where "$80"
 * next to "4 sessions" invites the question of what is added at checkout. The
 * answer is nothing, and saying so is worth a line. A court rate card already
 * reads as a price per hour and raises no such question.
 *
 * VERIFIED against the live club endpoint 2026-09-09, not inferred:
 * /api/public/clubs/exton-sports returns member_all_in === member_rate (25) and
 * packs with all_in === rate (80 and 125). If a future payload ever disagrees,
 * that endpoint is the truth and this string is the stale copy.
 *
 * Carries no number on purpose, so a price change cannot falsify it — which is
 * why it survived 2026-09-30 untouched while RATE_FEES_NOTE, which carried
 * "2.9% + 30¢", did not.
 */
export const CLASS_FEES_NOTE =
  'The price shown is what you pay — no card fee added.'

/** A sentence per band for the footer, where there is space to say why. */
export const BAND_BLURB: Record<BandKey, string> = {
  peak: 'Evenings after work, and all day at the weekend.',
  /* Covers the small hours now that late night is gone (2026-10-08), so it has
     to mention them — the club is open 24/7 and someone reading "weekday
     daytime" would not know what a 2am court costs. */
  /* "The weekend wind-down" (Sat/Sun 8–10pm) came out on 2026-10-14, when those
     hours became peak — the weekend's only off-peak now is overnight. */
  /* "Every hour overnight" became "every night from 9pm" on 2026-10-15, when 9–10pm
     turned off-peak on all seven days — 9pm is not overnight, and it is the new
     cheap hour worth naming. It still covers the small hours. */
  offPeak: 'Weekday daytime until 5pm, and every night from 9pm.',
}
