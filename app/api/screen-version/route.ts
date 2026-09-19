import { NextResponse } from 'next/server'

// GET /api/screen-version
// ---------------------------------------------------------------------------
// Which deployment is serving. The wall screens (/reception, 2026-09-19) poll this and
// reload themselves when it changes.
//
// A TV loads its page once and then holds it for days — it reloads only when it
// power-cycles and tv-keeper (orangish-cameras) launches it again. The screens are meant to
// work as "whatever is on the URL is what the TV shows", so without this a deploy would
// reach a wall only at the next power cut, and nobody would know which version it was on.
//
// VERCEL_DEPLOYMENT_ID changes on every deploy, including a redeploy of the same commit;
// the commit SHA is the fallback for environments that lack it. Locally both are unset,
// so the value never changes and `next dev` pages never reload themselves.
export function GET() {
  const version = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'local'
  return NextResponse.json({ version }, { headers: { 'cache-control': 'no-store' } })
}
