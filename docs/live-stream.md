# extonsports.com/live — watching today's coaching

2026-11-09. Parents of children at a PBA or CCCA session ask for a link at
`extonsports.com/live`, and we email them one that works for **that day only**.

The video is an **unlisted YouTube broadcast**. The club's uplink was measured at
32.5–38.9 Mbps and the composite stream is 5 Mbps, so about four viewers pulling from the
N95 would saturate a circuit that also carries the booking system, the card terminal and
the phones. YouTube does the fan-out; the box pushes exactly one copy out, as it already
does. That is the whole reason YouTube is in this picture, and it is why there is no relay.

## What a parent sees

1. `/live` — one field, a ticked-by-default mailing-list box, Send. The page looks the same
   whether or not a class is on, deliberately: telling a visitor "nothing is on now" before
   they have identified themselves publishes the club's timetable to anyone who asks.
2. An email with a link to `/live/<token>`. **The YouTube address is never in the email.**
3. `/live/<token>` — the broadcast if one is live, or one of three honest endings:
   *expired* (your link is old), *off air* (your link is fine, no class is running), or
   *we can't tell* (our fault, say so). The third is not folded into the second, because a
   parent in the car park must not be told their child's class is not happening when it is.

## A new link every day

Aniket, 2026-11-09: *"let's have a new link every day"*. It is true twice over.

- The token (`lib/live/token.ts`) is an **HMAC with the club's calendar date inside it**. It
  is checked against today in `America/New_York`, not UTC — a 9 pm class in Exton is already
  tomorrow in UTC, and a UTC day would expire a parent's link three hours into the session.
- Each day is **its own YouTube broadcast**, so yesterday's video id is dead regardless.

There is no table and no reaper: the only two facts a watch link carries are "this address
asked" and "on this day", and an HMAC carries both and expires by arithmetic. The address is
**hashed into** the token, never carried in it — the link ends up in an inbox, a browser
history and our logs, and none of those needs a parent's address in the clear.

**There is no revocation inside a day, by design.** To cut every link off at once the owner
ends the YouTube broadcast; every page then says "no session is on air", because the page
renders whatever `liveBroadcasts` says and nothing else.

## Setting up the YouTube OAuth

The broadcasts are **unlisted**, so a plain API key cannot find them — `search.list` only
sees public videos. `liveBroadcasts.list` authenticated **as the channel** returns the
channel's own broadcasts whatever their privacy, and that is the only reason this OAuth
exists. We ask for the read-only scope and nothing more.

Channel: `UCdMOVp8clDNiQ4F4OdSqP_A` (aniket@extonsports.com).

### As set up, 2026-11-09 — done, and verified

| | |
|---|---|
| Cloud project | `exton-live`, number `462042750302`, under the **extonsports.com** organisation |
| Consent screen | Google Auth Platform, audience **Internal** — so no seven-day token expiry |
| Scope | `youtube.readonly`, and nothing else |
| OAuth client | type **Desktop app**, named `exton-live cli` |
| Client ID | `462042750302-7qrcmo2hrsdo9feqehp7u4ehhu5l83t1.apps.googleusercontent.com` |
| Secret and refresh token | in `.env.local` (gitignored), written by the login script |

Verified the same day with `node scripts/youtube-auth.mjs check`: the refresh token
exchanges for an access token and `liveBroadcasts.list` answers. **Not yet verified: that an
UNLISTED broadcast is visible to it.** Nothing was on air at the time, and that is the one
assumption the whole OAuth rests on — run `check` once with a live unlisted broadcast before
a parent is ever sent a link.

1. In the Google Cloud console, make a project (or reuse one) and **enable the YouTube Data
   API v3**.
2. OAuth consent screen: **User type "Internal"**, and the single scope
   `https://www.googleapis.com/auth/youtube.readonly`.

   Internal is available because the project sits under the **extonsports.com Google
   Workspace organization** (chosen at project creation, 2026-11-09, and not changeable
   afterwards). Only accounts in that org can consent, which is exactly the one account we
   need. Take it over External wherever it is offered: an Internal app has no publishing
   status, so there is no verification, no test-user list, and no "unverified app" warning.
3. **⚠️ ONLY IF THE PROJECT IS NOT UNDER THE ORGANISATION** and you are forced to use
   **External**: you must then **publish the app to "In production"**. Google expires
   refresh tokens after **seven days** while an External app sits in "Testing", so the
   feature would work for a week of classes and then fail on a Tuesday evening with nobody
   watching the logs. An Internal app is not subject to this, which is the main reason to
   prefer it. `scripts/youtube-auth.mjs` names this cause when a token is refused.
4. Create an **OAuth client ID** of type *Desktop app*. Note the client id and secret.
5. Run the consent flow once, signed in as the channel owner, and keep the **refresh token**.
6. Put these on the Vercel project:

   | Variable | What it is |
   |---|---|
   | `YOUTUBE_CLIENT_ID` | from step 4 |
   | `YOUTUBE_CLIENT_SECRET` | from step 4 |
   | `YOUTUBE_REFRESH_TOKEN` | from step 5 |
   | `LIVE_LINK_KEY` | a long random string; signs the day tokens. Changing it expires every outstanding link immediately, which is the emergency stop. |

`RESEND_API_KEY` and `NEXT_PUBLIC_APP_URL` are already set.

Quota is not a concern: 10,000 units a day, `liveBroadcasts.list` costs about 1, and the
answer is cached for 30 seconds, so a hundred parents refreshing at 6 pm is a handful of
calls. A failure is cached for the same 30 seconds, so Google being down does not turn a
hundred refreshes into a hundred outbound requests.

## ⚠️ The rule nobody is enforcing yet

Checked against the booking calendar on 2026-11-09: over the following ten days PBA and CCCA
run **concurrently** every day, Monday to Saturday, and during **every** academy window no
court is held by anyone else. So the six-court grid shows only academy children, and both
partners have taken parental waivers.

That is a fact about the current schedule, not a property of the system. **One private hire
booked into an academy window would quietly put a stranger on YouTube.** The safety rule is
not "an academy is on" but **"only academies are on"**, and nothing checks it today, because
the stream goes live when the box starts pushing rather than from the calendar.

Before this runs unattended, either the push should be gated on that check (the platform has
the booking data and already derives the lights this way) or the owner should confirm by eye
each time. Noted here rather than in a comment because it is a fact about the outside world,
which goes stale: re-check it whenever the academies' schedule changes.

## What this does not do

- It does not stop a parent forwarding their link to a grandparent, and is not meant to. The
  link dies at midnight at the club and the broadcast behind it is a different video the
  next day. That is the control.
- It does not stop a determined person screen-recording.
- Anything stronger needs per-viewer streams, which needs our own relay. Scoped, not built.

## Files

| Path | What |
|---|---|
| `lib/live/token.ts` | the day pass: mint, read, club-day arithmetic. Pure. |
| `lib/live/token.test.mjs` | its rules, including the two time-zone cases |
| `lib/live/youtube.ts` | access-token refresh, `liveBroadcasts.list`, 30 s cache |
| `lib/live/link-email.ts` | the email's words. Pure, no Resend. |
| `app/api/live/request/route.ts` | the POST: honeypot, two rate limits, mint, send |
| `app/components/live-pure.ts` | the copy and the fetch, reusing `sendWithOptin` |
| `app/components/LiveGate.tsx` | the form |
| `app/live/page.tsx` | the door, `noindex` |
| `app/live/[token]/page.tsx` | the watch page and its three endings |
