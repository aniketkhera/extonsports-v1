// "Is a class on air, and which broadcast is it?" — asked of YouTube, not of a calendar.
// 2026-11-09.
//
// WHY YOUTUBE AND NOT THE BOOKING CALENDAR. The platform knows when PBA and CCCA sessions
// are booked, and one day the stream will start itself from that. But the question this page
// has to answer is narrower and more honest: is there a live broadcast RIGHT NOW? A calendar
// says a class should be running; YouTube says one is. When the encoder dies mid-session the
// calendar still says yes, and a parent is told to watch a black rectangle. So the source of
// truth is the thing that is actually serving video.
//
// WHY OAUTH AND NOT AN API KEY. Our broadcasts are UNLISTED. search.list with a plain API key
// only sees public videos, so it would find nothing, every time. liveBroadcasts.list
// authenticated AS THE CHANNEL returns the channel's own broadcasts whatever their privacy.
// That is the only reason the OAuth exists; we ask for the read-only scope and nothing more.
//
// ⚠️ THE REFRESH TOKEN MUST COME FROM AN APP IN "IN PRODUCTION" STATUS. Google expires
// refresh tokens after SEVEN DAYS while an OAuth app is still in "Testing". This feature
// would work for a week of classes and then fail on a Tuesday evening with nobody watching
// the logs. See docs/live-stream.md for the setup, which says this twice.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const BROADCASTS_URL = 'https://www.googleapis.com/youtube/v3/liveBroadcasts'

export type OnAir =
  | { state: 'on_air'; videoId: string; title: string }
  | { state: 'off_air' }
  /** We could not ask. The page says so rather than saying there is no class: a parent
   *  standing in a car park needs to know the difference between "not on" and "we broke". */
  | { state: 'unknown'; why: string }

export type YouTubeEnv = {
  clientId?: string
  clientSecret?: string
  refreshToken?: string
}

export function youtubeEnv(): YouTubeEnv {
  return {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  }
}

export function configured(env: YouTubeEnv = youtubeEnv()): boolean {
  return Boolean(env.clientId && env.clientSecret && env.refreshToken)
}

// ── access token, cached in the instance ────────────────────────────────────
// Google's access tokens last an hour. We keep one per warm lambda and refresh a minute
// early. A cold start costs one extra round trip, which nobody notices behind a page load.
let access: { token: string; expiresAtMs: number } | null = null

export function forgetAccessToken(): void {
  access = null
}

async function accessToken(env: YouTubeEnv, fetchImpl: typeof fetch): Promise<string> {
  const now = Date.now()
  if (access && access.expiresAtMs > now) return access.token

  const body = new URLSearchParams({
    client_id: env.clientId as string,
    client_secret: env.clientSecret as string,
    refresh_token: env.refreshToken as string,
    grant_type: 'refresh_token',
  })
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  if (!res.ok) {
    // invalid_grant here almost always means the seven-day "Testing" expiry above, or that
    // the token was revoked in the Google account. Say which so the log is actionable.
    const text = (await res.text().catch(() => '')).slice(0, 300)
    throw new Error(`token refresh ${res.status}: ${text}`)
  }
  const j = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!j.access_token) throw new Error('token refresh: no access_token in the answer')
  access = {
    token: j.access_token,
    expiresAtMs: now + Math.max(60, (j.expires_in ?? 3600) - 60) * 1000,
  }
  return access.token
}

// ── the answer, cached briefly ──────────────────────────────────────────────
// Thirty seconds. A class starting is not urgent to the second, and without this every
// parent refreshing at 6:00 pm is one more call against a 10,000-unit daily quota.
const ANSWER_TTL_MS = 30_000
let answer: { at: number; value: OnAir } | null = null

export function forgetOnAir(): void {
  answer = null
}

/**
 * What is on air at the club's channel right now.
 * Never throws: every failure becomes { state: 'unknown' } with a reason for the log.
 */
export async function onAir(
  env: YouTubeEnv = youtubeEnv(),
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<OnAir> {
  if (answer && now - answer.at < ANSWER_TTL_MS) return answer.value

  const value = await ask(env, fetchImpl)
  // A failure is cached too, briefly: when Google is down, a hundred refreshing parents must
  // not become a hundred outbound calls. It is the same thirty seconds either way.
  answer = { at: now, value }
  return value
}

async function ask(env: YouTubeEnv, fetchImpl: typeof fetch): Promise<OnAir> {
  if (!configured(env)) return { state: 'unknown', why: 'youtube credentials are not set' }

  try {
    const token = await accessToken(env, fetchImpl)
    const url =
      `${BROADCASTS_URL}?part=snippet%2Cstatus&broadcastStatus=active&broadcastType=all&maxResults=5`
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (res.status === 401) {
      // The cached access token went stale early (revoked, or the clock drifted). Drop it so
      // the next caller refreshes rather than getting 401 for the whole hour.
      forgetAccessToken()
      return { state: 'unknown', why: 'youtube refused the access token (401)' }
    }
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      return { state: 'unknown', why: `liveBroadcasts ${res.status}: ${text}` }
    }

    const j = (await res.json()) as {
      items?: Array<{ id?: string; snippet?: { title?: string }; status?: { lifeCycleStatus?: string } }>
    }
    const items = Array.isArray(j.items) ? j.items : []
    // broadcastStatus=active should already mean live, but a broadcast that is testing shows
    // up here too on some channels; only 'live' goes to a parent.
    const live = items.find(i => i.id && (i.status?.lifeCycleStatus ?? 'live') === 'live') ?? items.find(i => i.id)
    if (!live?.id) return { state: 'off_air' }
    return { state: 'on_air', videoId: live.id, title: live.snippet?.title ?? 'Live from Exton Sports Center' }
  } catch (e) {
    return { state: 'unknown', why: e instanceof Error ? e.message : String(e) }
  }
}

/** The privacy-preserving embed host, so YouTube sets no cookie until the video plays. */
export function embedUrl(videoId: string): string {
  const p = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1', playsinline: '1' })
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${p}`
}
