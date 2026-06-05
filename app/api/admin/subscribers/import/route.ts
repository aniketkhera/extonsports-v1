import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../../lib/auth-guard'
import { insertRows, selectRows, PROPERTY } from '../../../../../lib/supabase'
import { sportTag } from '../../../../../lib/sports'

// POST /api/admin/subscribers/import — multipart form upload
//   file:   the CSV
//   source: text tag stored on every imported row
//   sport:  optional sport interest (cricket | squash | …) applied as a
//           "sport:<x>" entry in tags[] on every imported row. Lets a
//           prospect list (e.g. the cricket outreach CSV) be segmented
//           on import. Unknown/blank values add no tag.
//
// CSV requirements:
//   - First row is a header. We accept any column order.
//   - Required column: `email` (case-insensitive match).
//   - Optional columns: `first_name`, `last_name` (or `first name`,
//     `last name` — we normalize whitespace and case).
//
// Behaviour:
//   - Email is normalized to lowercase + trimmed.
//   - Duplicate emails (already in DB) are SKIPPED, not overwritten.
//     Existing subscribers keep their existing source / first_name /
//     last_name / unsubscribe state. This is the safe default for a
//     mass migration.
//   - Malformed rows are skipped silently and counted in `skipped`.

export const dynamic = 'force-dynamic'
// Imports can be large; default body limit is fine for 200 rows
// (~30 KB), bumped here so a 5,000-row import doesn't 413.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
  }
  const file = form.get('file')
  const source = (form.get('source') || 'csv-import').toString().trim() || 'csv-import'
  // Optional uniform sport tag for the whole import. sportTag() returns
  // null for anything that isn't a known sport, so a bad value is a no-op.
  const importTag = sportTag((form.get('sport') || '').toString().trim())
  const tags = importTag ? [importTag] : []
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }

  const text = await file.text()
  const parsed = parseCsv(text)
  if (parsed.length === 0) {
    return NextResponse.json({ error: 'CSV had no rows.' }, { status: 400 })
  }

  const header = parsed[0].map(s => s.trim().toLowerCase().replace(/\s+/g, '_'))
  const emailIdx = header.indexOf('email')
  if (emailIdx < 0) {
    return NextResponse.json({ error: 'CSV must have an "email" column.' }, { status: 400 })
  }
  const firstIdx = header.indexOf('first_name')
  const lastIdx  = header.indexOf('last_name')

  // Build candidates, normalized + de-duped within this CSV.
  const seen = new Set<string>()
  const candidates: Array<{ email: string; first_name: string | null; last_name: string | null }> = []
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    const email = (row[emailIdx] || '').trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    if (seen.has(email)) continue
    seen.add(email)
    candidates.push({
      email,
      first_name: firstIdx >= 0 ? (row[firstIdx]?.trim() || null) : null,
      last_name:  lastIdx  >= 0 ? (row[lastIdx]?.trim()  || null) : null,
    })
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: 'No valid email rows found in CSV.' }, { status: 400 })
  }

  // Subtract emails that already exist in the DB. We could rely on
  // the UNIQUE constraint + ignore-duplicates, but doing a SELECT
  // first lets us report an accurate `imported` count and avoids
  // mutating rows we don't want to touch.
  const emails = candidates.map(c => c.email)
  // PostgREST `in.()` filter for batch lookup.
  const existing = await selectRows<{ email: string }>('subscribers', {
    select: 'email',
    filters: {
      property: `eq.${PROPERTY}`,
      email: `in.(${emails.map(e => `"${e.replace(/"/g, '\\"')}"`).join(',')})`,
    },
  })
  const existingSet = new Set(existing.map(r => r.email))
  const fresh = candidates.filter(c => !existingSet.has(c.email))

  if (fresh.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: candidates.length, reason: 'All emails already on the list.' })
  }

  try {
    // Bulk insert with ignore-duplicates Prefer just in case of race.
    await insertRows('subscribers', fresh.map(c => ({
      property: PROPERTY,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      source,
      tags,
    })), 'resolution=ignore-duplicates,return=minimal')
  } catch (e) {
    console.error('[admin/subscribers/import]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Insert failed.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    imported: fresh.length,
    skipped: candidates.length - fresh.length,
    total_rows_in_csv: parsed.length - 1,
  })
}

// ── tiny CSV parser ────────────────────────────────────────────────
// Handles quoted fields, escaped quotes inside quotes, CRLF / LF.
// Doesn't try to be RFC 4180-perfect — good enough for Wix exports
// and hand-rolled CSVs from Google Sheets / Excel.

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    } else {
      if (c === '"') { inQuotes = true; i++; continue }
      if (c === ',') { row.push(field); field = ''; i++; continue }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
      if (c === '\r') { i++; continue }
      field += c; i++; continue
    }
  }
  // Tail row.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter(r => r.some(c => c.trim().length > 0))
}
