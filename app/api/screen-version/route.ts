import { NextResponse } from 'next/server'

// GET /api/screen-version
// ---------------------------------------------------------------------------
// Which deployment is serving. The wall screens (/comingsoon, 2026-09-19) poll this and
// reload themselves when it changes.
//
// A TV loads its page and holds it until tv-keeper (orangish-cameras) launches it again —
// on a power-on, and hourly since 2026-10-20. The screens are meant to work as "whatever
// is on the URL is what the TV shows", so without this a deploy would reach a wall only at
// the next relaunch, and nobody would know which version it was on. The answer is also
// what each screen's heartbeat reports as latest_version (2026-10-20), and what the
// platform's screen-watch cron compares a screen's own version against.
//
// VERCEL_DEPLOYMENT_ID changes on every deploy, including a redeploy of the same commit;
// the commit SHA is the fallback for environments that lack it. Locally both are unset,
// so the value never changes and `next dev` pages never reload themselves.
export function GET() {
  const version = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  return NextResponse.json({ version }, { headers: { 'cache-control': 'no-store' } })
}
