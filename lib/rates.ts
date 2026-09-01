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
// Three bands, cheapest first, so the table reads left to right as the price
// climbing toward prime time:
//
//   Late night 10pm–6am Mon–Thu · 10pm–8am Sat/Sun   (the club is 24/7; almost
//                                                     nobody wants 3am, so it
//                                                     is priced to move)
//   Off-peak   6am–4pm Mon–Fri · 8–10pm Sat/Sun
//   Peak       4–10pm Mon–Fri  · 8am–8pm Sat/Sun
//
// Note the weekend inversion: Saturday and Sunday mornings are peak, weekday
// mornings are not.
//
// ── WHY THIS IS STILL A HARDCODED COPY, AND WHAT REPLACES IT ────────────────
// The platform actually has FOUR day-kinds, not two — Mon–Thu, Fri, Sat and Sun
// each differ — so this two-column model cannot express it exactly. The Fri/Sat
// late-night premium is carried as one exception line instead, which is honest
// and far more readable than a four-column table.
//
// The durable fix is not to widen this table: it is to stop retyping the hours.
// orangish-app now serves `court_band_windows` (already coalesced, 42 rows to
// 27) alongside the rate card on the public club endpoint, plus `max_players`
// per (sport, band). Once that is deployed, RATE_BANDS and the footnote should
// be RENDERED from it and this block deleted. Keeping the prices as a fallback
// is fine; keeping the hours is what drifted.

export type BandKey = 'lateNight' | 'offPeak' | 'peak'

export type Band = {
  key: BandKey
  /** Column heading. */
  label: string
  /** Window, spelled out for the footnote. */
  weekday: string
  weekend: string
}

/** Column order — cheapest to dearest. */
export const RATE_BANDS: Band[] = [
  { key: 'lateNight', label: 'Late night', weekday: '10pm–6am', weekend: '10pm–8am' },
  { key: 'offPeak', label: 'Off-peak', weekday: '6am–4pm', weekend: '8–10pm' },
  { key: 'peak', label: 'Peak', weekday: '4–10pm', weekend: '8am–8pm' },
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
export const PLAYER_CAPS: Record<string, { peak: SportCap; offPeak: SportCap }> = {
  Squash: { peak: { base: 2, step: 2 }, offPeak: { base: 4, step: 2 } },
  Badminton: { peak: { base: 4, step: 2 }, offPeak: { base: 6, step: 2 } },
  Cricket: { peak: { base: 6, step: 2 }, offPeak: { base: 10, step: 5 } },
}

/** How many the court seats for a booking of `hours`, including the booker. */
export function capFor(cap: SportCap, hours: number): number {
  return cap.base + Math.max(0, Math.floor(hours) - 1) * cap.step
}

/** The durations the booking sheet actually offers. */
export const CAP_HOURS = [1, 2, 3] as const

export type SportRate = {
  sport: string
} & Record<BandKey, number>

/* Cricket, badminton, squash — the club's own order, matching the academies
   panel in the hero. Not alphabetical and not cheapest-first; changing it here
   changes the hero table, and SPORT_ORDER below keeps the footer in step. */
export const COURT_RATES: SportRate[] = [
  { sport: 'Cricket', lateNight: 45, offPeak: 50, peak: 55 },
  { sport: 'Badminton', lateNight: 35, offPeak: 40, peak: 45 },
  { sport: 'Squash', lateNight: 35, offPeak: 40, peak: 45 },
]

/** One order for every sport list on the site. */
export const SPORT_ORDER = COURT_RATES.map((r) => r.sport)

/** Cheapest hour on the board — the "from $X" figure. */
export const RATE_FROM = Math.min(...COURT_RATES.map((r) => r.lateNight))

/**
 * The hero's one line. Deliberately short.
 *
 * The band hours went through the column headers (three lines deep — the table
 * is a PRICE table) and a run-on sentence (four rules nobody finishes) before
 * landing in the footer, where there is room to explain them properly. What
 * stays here is only what a buyer needs AT the moment they read a price: the
 * rate is per COURT, and it moves with the clock.
 */
export const RATE_FOOTNOTE =
  'One rate covers the whole court, not per person. Rates change with the time ' +
  'of day, and a longer booking can take more people — both are explained below.'

/**
 * The fee disclosure, kept OUT of RATE_FOOTNOTE on purpose.
 *
 * The rate card is the base rate. Exton passes both fees on
 * (`fee_processing_mode` and `fee_platform_mode` are both 'pass' on the
 * platform), so a $40 court is $42.28 at checkout — $0.75 platform plus the
 * grossed-up Stripe fee. Appending that to the footnote would have buried a
 * price disclosure at the end of a sentence about player caps; it gets its own
 * line so it reads as a term, not a footnote to a footnote.
 *
 * The same sentence appears on the booking calendar in orangish-app, above the
 * per-slot prices, which are also pre-fee.
 *
 * ⚠️ THESE NUMBERS MUST MATCH lib/billing-math.ts ON THE PLATFORM, which is what
 * actually charges the card: STRIPE_PCT = 0.029 and STRIPE_FIXED = 0.30. That
 * is 2.9% and 30c, NOT 2.5% — one global constant, no per-club override, so a
 * site quoting a lower rate under-states every single charge.
 *
 * The 75c is Exton's `platform_fee_fixed`, passed to the customer because
 * `fee_platform_mode` is 'pass'. Both verified live on 2026-09-01.
 *
 * Retyped here, which is the same drift risk as the rates above. If they move,
 * the honest fix is to serve them from the club endpoint, not edit this string.
 */
export const RATE_FEES_NOTE =
  'Stripe fee (2.9% + 30¢) and platform fee (75¢) not included.'

/** A sentence per band for the footer, where there is space to say why. */
export const BAND_BLURB: Record<BandKey, string> = {
  peak: 'Evenings after work, and all day at the weekend.',
  offPeak: 'Weekday daytime, and the late-evening wind-down at weekends.',
  lateNight: 'We are open 24/7, and almost nobody wants a 3am court — so it is priced to move.',
}
