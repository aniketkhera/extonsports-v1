// Whether the site is taking job applications, in one place.
//
// /api/apply is public and unauthenticated: it takes a multipart upload and
// forwards the attachment straight to info@ and paul@ over Resend, with only a
// honeypot field between a bot and those inboxes. There is no rate limit and no
// captcha. Between postings nothing on the site points at it, so it is pure
// attack surface — and robots.ts disallowing /api/ is a crawler hint, not
// access control.
//
// So the endpoint is CLOSED unless APPLICATIONS_OPEN says otherwise. Opening it
// for the next posting is one env var; the route, the form and the job-posting
// layout all read this same flag, so they cannot disagree.

/** Values that count as open. Anything else — including unset — is closed. */
const TRUTHY = ['1', 'true', 'yes', 'on']

/** Read inside the function, not at module scope, so the force-dynamic route
    picks up the current value on every request rather than one frozen at
    import. Statically rendered pages still bake it in at build time. */
export function applicationsOpen(): boolean {
  return TRUTHY.includes((process.env.APPLICATIONS_OPEN || '').trim().toLowerCase())
}

/** The 410 body, and the heading shown in place of the form. */
export const APPLICATIONS_CLOSED_MESSAGE = 'Applications are closed.'
