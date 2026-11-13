#!/usr/bin/env node
/* One-time YouTube OAuth for extonsports.com/live, and a check that it works.
   ──────────────────────────────────────────────────────────────────────────────
   2026-11-09. See docs/live-stream.md for why this exists: our broadcasts are UNLISTED,
   so a plain API key cannot find them. Only a call authenticated AS THE CHANNEL can.

   Two modes:

     node scripts/youtube-auth.mjs login   --id <CLIENT_ID> --secret <CLIENT_SECRET>
         Opens the Google consent screen, catches the redirect on a loopback port, and
         prints the REFRESH TOKEN. Run it once, signed in as aniket@extonsports.com.
         Add --replace to overwrite a token already in .env.local. That is needed whenever
         SCOPE changes: an old, narrower token keeps refreshing happily and fails only at
         the write, which reads like a caller bug rather than a stale grant.

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
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes, createHash } from 'node:crypto'
import { spawn } from 'node:child_process'

/* WRITE scope, deliberately - and the reason is measured, not theoretical.
   youtube.readonly was enough to FIND an unlisted broadcast, which is all /live needed.
   It is not enough to CREATE one or to correct its settings. On 2026-11-12 that bit: a
   broadcast made by hand in Studio came out with enableEmbed=FALSE, so it would have gone
   live and never played in the site's embed. "Allow embedding" does NOT inherit from the
   previous broadcast - observed on kkuajxU6TAc against cnlDE9AXG-Q, which had it true.
   force-ssl covers read as well, so the site's existing read path keeps working on a token
   minted here; there is no need to keep a separate read-only token.
   The scope must ALSO be listed on the OAuth consent screen in Google Cloud, or Google
   refuses with invalid_scope before the browser ever opens. */
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl'
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
  bail('usage: node scripts/youtube-auth.mjs <login|check> [--id ..] [--secret ..] [--refresh ..] [--replace]')
}
if (!clientId || !clientSecret) bail('need --id and --secret (or YOUTUBE_CLIENT_ID / _SECRET in the environment)')

// ── PKCE, because a desktop client secret is not really a secret ───────────
function pkce() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function openBrowser(url) {
  /* ⛔ NEVER THROUGH `cmd /c start`. Windows cmd treats & as a command separator, so it
     chops an OAuth URL at the first &, and Google answers "Required parameter is missing:
     response_type" for a URL that was correct when we printed it. Observed 2026-11-09.
     rundll32 is spawned directly with no shell, so nothing re-parses the argument. */
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]
  try {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: false })
    child.on('error', () => {})
    child.unref()
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

  console.log('\n  Sign in as the channel owner (aniket@extonsports.com).')
  console.log('  Google will ask to "manage your YouTube account" - that is the write scope,')
  console.log('  which is what lets us set a broadcast unlisted and embeddable at creation.\n')
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

  /* Keep it, unless told not to. The token is printed once and a terminal scrollback is
     not a safe place to leave the only copy — losing it on 2026-11-09 meant running the
     whole consent flow again. .env.local is gitignored here (.gitignore line 4). */
  if (!process.argv.includes('--no-save')) {
    try {
      const path = '.env.local'
      const had = existsSync(path) ? readFileSync(path, 'utf8') : ''
      if (had.includes('YOUTUBE_REFRESH_TOKEN=') && !process.argv.includes('--replace')) {
        console.log('  .env.local already has a YOUTUBE_REFRESH_TOKEN; left it alone.')
        console.log('  Re-run with --replace to overwrite it. That is what you want after a')
        console.log('  SCOPE change: the old token still refreshes, only the write fails.\n')
      } else if (had.includes('YOUTUBE_REFRESH_TOKEN=')) {
        /* Rewrite the three in place rather than appending a second copy. A duplicate key
           later in the file wins in some loaders and loses in others, which is a very quiet
           way to go on using the old read-only grant. */
        const next = had
          .replace(/^YOUTUBE_CLIENT_ID=.*$/m, 'YOUTUBE_CLIENT_ID=' + clientId)
          .replace(/^YOUTUBE_CLIENT_SECRET=.*$/m, 'YOUTUBE_CLIENT_SECRET=' + clientSecret)
          .replace(/^YOUTUBE_REFRESH_TOKEN=.*$/m, 'YOUTUBE_REFRESH_TOKEN=' + j.refresh_token)
        writeFileSync(path, next)
        console.log('  Replaced the three YOUTUBE_* values in .env.local (gitignored).\n')
      } else {
        const pad = had && !had.endsWith('\n') ? '\n' : ''
        appendFileSync(path, pad + [
          '',
          '# YouTube OAuth for /live (force-ssl: read + write). By scripts/youtube-auth.mjs.',
          '# Gitignored. These three also go on the Vercel project.',
          'YOUTUBE_CLIENT_ID=' + clientId,
          'YOUTUBE_CLIENT_SECRET=' + clientSecret,
          'YOUTUBE_REFRESH_TOKEN=' + j.refresh_token,
          '',
        ].join('\n'))
        console.log('  Also written to .env.local (gitignored), so it is not lost.\n')
      }
    } catch (e) {
      console.log('  Could not write .env.local: ' + (e && e.message) + ' - copy the token above.\n')
    }
  }
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

  /* The three values have distinctive shapes and are easy to cross, so name the one that
     is in the wrong place rather than letting Google answer with something that sounds
     like the credential itself is bad. Both mix-ups below were hit on 2026-11-09:
     the client secret passed as --refresh, and a placeholder left unreplaced. */
  if (/^GOCSPX-/.test(refresh)) {
    die('that is the CLIENT SECRET, not the refresh token. --refresh wants what `login` printed, which starts with 1// ')
  }
  if (/^1[/][/]/.test(clientSecret)) {
    die('that is the REFRESH TOKEN, not the client secret. The two are the wrong way round.')
  }
  for (const [flag, v] of [['--id', clientId], ['--secret', clientSecret], ['--refresh', refresh]]) {
    if (/^(YOUR[_-]|<|[.][.][.])/i.test(v)) die(flag + ' is still the placeholder ' + v + ' - paste the real value.')
  }

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
