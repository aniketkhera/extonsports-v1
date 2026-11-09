#!/usr/bin/env node
/* One-time YouTube OAuth for extonsports.com/live, and a check that it works.
   ──────────────────────────────────────────────────────────────────────────────
   2026-11-09. See docs/live-stream.md for why this exists: our broadcasts are UNLISTED,
   so a plain API key cannot find them. Only a call authenticated AS THE CHANNEL can.

   Two modes:

     node scripts/youtube-auth.mjs login   --id <CLIENT_ID> --secret <CLIENT_SECRET>
         Opens the Google consent screen, catches the redirect on a loopback port, and
         prints the REFRESH TOKEN. Run it once, signed in as aniket@extonsports.com.

     node scripts/youtube-auth.mjs check   --id <ID> --secret <SECRET> --refresh <TOKEN>
         Asks YouTube what is on air right now. Run this before trusting the deploy.
         With no flags it reads YOUTUBE_CLIENT_ID / _SECRET / _REFRESH_TOKEN from the
         environment instead.

   ⚠️ THE REFRESH TOKEN IS A SECRET. It is printed to your terminal because you have to
   copy it into Vercel. Do not paste it into a chat, a commit, or a screenshot.

   ⚠️ IF `login` PRINTS NO REFRESH TOKEN, the app is almost certainly still in "Testing",
   or you have consented before. This script always sends prompt=consent to force a fresh
   one, so the usual cause is the first.

   No dependencies: node built-ins and fetch only. */

import { createServer } from 'node:http'
import { randomBytes, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'

const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const BROADCASTS = 'https://www.googleapis.com/youtube/v3/liveBroadcasts'

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf('--' + name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

class Fatal extends Error {}

/* Throws rather than process.exit()ing: exiting from inside a pending fetch or an open
   HTTP handler trips a libuv assertion on Windows and buries the real message. */
function die(msg) {
  throw new Fatal(msg)
}

/* Pre-flight only, before any socket or fetch exists: here a plain exit is safe. */
function bail(msg) {
  console.error(['', '  x ' + msg, ''].join(String.fromCharCode(10)))
  process.exit(1)
}

const mode = process.argv[2]
const clientId = arg('id', process.env.YOUTUBE_CLIENT_ID)
const clientSecret = arg('secret', process.env.YOUTUBE_CLIENT_SECRET)

if (!mode || !['login', 'check'].includes(mode)) {
  bail('usage: node scripts/youtube-auth.mjs <login|check> [--id ..] [--secret ..] [--refresh ..]')
}
if (!clientId || !clientSecret) bail('need --id and --secret (or YOUTUBE_CLIENT_ID / _SECRET in the environment)')

// ── PKCE, because a desktop client secret is not really a secret ───────────
function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
    return true
  } catch {
    return false
  }
}

async function login() {
  const { verifier, challenge } = pkce()
  const state = randomBytes(16).toString('hex')

  const { port, codePromise, close } = await listen(state)
  const redirectUri = `http://127.0.0.1:${port}`

  const url =
    `${AUTH}?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPE,
      // offline + consent is what makes Google hand back a REFRESH token rather than only an
      // access token. Without prompt=consent a second run returns none at all.
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    })

  console.log('\n  Sign in as the channel owner (aniket@extonsports.com) and allow read-only access.\n')
  console.log('  If a browser does not open, paste this in yourself:\n')
  console.log('  ' + url + '\n')
  openBrowser(url)

  const code = await codePromise
  close()

  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  })
  const j = await res.json()
  if (!res.ok) die(`token exchange ${res.status}: ${JSON.stringify(j)}`)
  if (!j.refresh_token) {
    die(
      'Google returned no refresh_token.\n' +
        '    The usual cause is that the OAuth app is still in "Testing" rather than\n' +
        '    "In production" — see docs/live-stream.md. Fix that and run this again.',
    )
  }

  console.log('\n  ✓ Got a refresh token. Put this on the Vercel project as YOUTUBE_REFRESH_TOKEN:\n')
  console.log('  ' + j.refresh_token + '\n')
  console.log('  Keep it out of chats, commits and screenshots. Then run:\n')
  console.log('    node scripts/youtube-auth.mjs check --id <ID> --secret <SECRET> --refresh <TOKEN>\n')
}

function listen(expectedState) {
  return new Promise(resolve => {
    let settle, fail
    const codePromise = new Promise((r, j) => { settle = r; fail = j })
    const server = createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1')
      const code = u.searchParams.get('code')
      const err = u.searchParams.get('error')
      const state = u.searchParams.get('state')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      if (err) {
        res.end(`<h1>Refused</h1><p>${err}</p><p>You can close this tab.</p>`)
        fail(new Fatal('Google refused: ' + err))
      } else if (state !== expectedState) {
        res.end('<h1>Mismatched state</h1><p>Start again.</p>')
        fail(new Fatal('state mismatch - start again'))
      } else if (code) {
        res.end('<h1>Done</h1><p>You can close this tab and go back to the terminal.</p>')
        settle(code)
      } else {
        res.end('<p>Waiting…</p>')
      }
    })
    server.listen(0, '127.0.0.1', () => {
      resolve({ port: server.address().port, codePromise, close: () => server.close() })
    })
  })
}

async function check() {
  const refresh = arg('refresh', process.env.YOUTUBE_REFRESH_TOKEN)
  if (!refresh) die('need --refresh (or YOUTUBE_REFRESH_TOKEN in the environment)')

  const t = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })
  const tj = await t.json()
  if (!t.ok) {
    const hint =
      tj.error === 'invalid_grant'
        ? '\n    invalid_grant almost always means the seven-day "Testing" expiry, or the\n    token was revoked in the Google account. See docs/live-stream.md.'
        : ''
    die(`token refresh ${t.status}: ${JSON.stringify(tj)}${hint}`)
  }
  console.log('\n  ✓ The refresh token works; Google issued an access token.')

  const r = await fetch(
    `${BROADCASTS}?part=snippet%2Cstatus&broadcastStatus=active&broadcastType=all&maxResults=5`,
    { headers: { Authorization: `Bearer ${tj.access_token}` } },
  )
  const rj = await r.json()
  if (!r.ok) die(`liveBroadcasts ${r.status}: ${JSON.stringify(rj)}`)

  const items = rj.items ?? []
  if (!items.length) {
    console.log('  ✓ The API answered. Nothing is on air right now, which is the expected')
    console.log('    answer outside class hours. Start a broadcast and run this again to')
    console.log('    prove an UNLISTED one is visible — that is the whole point of the OAuth.\n')
    return
  }
  console.log(`  ✓ ${items.length} broadcast(s) on air now:\n`)
  for (const i of items) {
    console.log(`      ${i.id}  ${i.status?.privacyStatus ?? '?'}  ${i.status?.lifeCycleStatus ?? '?'}  ${i.snippet?.title ?? ''}`)
  }
  const unlisted = items.some(i => i.status?.privacyStatus === 'unlisted')
  console.log(
    unlisted
      ? '\n  ✓ An UNLISTED broadcast is visible. That is exactly what the site needs.\n'
      : '\n  ⚠ None of these is unlisted. Check the broadcast privacy in YouTube Studio.\n',
  )
}

try {
  await (mode === 'login' ? login() : check())
} catch (e) {
  console.error(['', '  x ' + (e instanceof Fatal ? e.message : (e?.stack ?? String(e))), ''].join(String.fromCharCode(10)))
  process.exitCode = 1
}
