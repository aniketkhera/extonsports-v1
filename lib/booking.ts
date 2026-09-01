// Where "book" goes.
//
// Court booking and class booking both live on the platform, behind sign-in.
// Until the club opens there is nothing to book, so every booking CTA falls
// back to the waitlist rather than dropping someone on a login screen for a
// club that has no slots yet.

import { isOpen } from './opening'

const APP_URL = (process.env.NEXT_PUBLIC_ORANGISH_APP_URL || 'https://app.orangish.io').replace(/\/$/, '')

export const BOOK_COURTS_URL = `${APP_URL}/book/courts`
export const BOOK_CLASSES_URL = `${APP_URL}/book/events`

/** The booking CTA target, and whether it leaves the site. */
export function bookingTarget(url: string): { href: string; external: boolean } {
  return isOpen() ? { href: url, external: true } : { href: '#waitlist', external: false }
}
