#!/usr/bin/env node
/**
 * One-off Wix contacts → ExtonSports subscribers importer.
 *
 * Usage:
 *   node scripts/import-wix-contacts.mjs path/to/wix-contacts.csv [--source wix-migration] [--dry-run]
 *
 * Reads CSV (Wix's standard contacts export format), inserts each
 * row into the new ExtonSports Supabase `subscribers` table with
 * source='wix-migration' (by default), skipping any email already
 * present.
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL  — new ExtonSports project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (NOT anon)
 *
 * Read from extonsports-v1/.env.local automatically via Node's
 * --env-file (Node 20+). Run with:
 *   node --env-file=.env.local scripts/import-wix-contacts.mjs <csv>
 *
 * Same CSV column detection as the admin UI:
 *   - email (required)
 *   - first_name / "first name" / "First Name"
 *   - last_name / "last name" / "Last Name"
 */

import { readFileSync } from 'node:fs'
import { argv, exit } from 'node:process'

const args = argv.slice(2)
const csvPath = args.find(a => !a.startsWith('--'))
const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'wix-migration'
const dryRun = args.includes('--dry-run')

if (!csvPath) {
  console.error('Usage: node scripts/import-wix-contacts.mjs <csv> [--source <tag>] [--dry-run]')
  exit(1)
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !SUPA_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.')
  console.error('Tip: run with `node --env-file=.env.local ...` to auto-load them.')
  exit(1)
}

// ── parse CSV ──────────────────────────────────────────────────────
const text = readFileSync(csvPath, 'utf8')
const rows = parseCsv(text)
if (rows.length < 2) {
  console.error('CSV had no data rows.')
  exit(1)
}
const header = rows[0].map(s => s.trim().toLowerCase().replace(/\s+/g, '_'))
const emailIdx = header.indexOf('email')
if (emailIdx < 0) {
  console.error('CSV must have an "email" column. Found columns:', header)
  exit(1)
}
const firstIdx = header.indexOf('first_name')
const lastIdx  = header.indexOf('last_name')

// ── normalize + dedupe within CSV ──────────────────────────────────
const seen = new Set()
const candidates = []
for (let i = 1; i < rows.length; i++) {
  const row = rows[i]
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
console.log(`Parsed ${candidates.length} unique valid rows from ${rows.length - 1} CSV rows.`)

// ── dedupe vs existing DB rows ─────────────────────────────────────
const emails = candidates.map(c => c.email)
const inClause = emails.map(e => `"${e.replace(/"/g, '\\"')}"`).join(',')
const existsRes = await fetch(`${SUPA_URL}/rest/v1/subscribers?select=email&email=in.(${encodeURIComponent(inClause)})`, {
  headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
})
if (!existsRes.ok) {
  console.error('Existing-emails lookup failed:', existsRes.status, await existsRes.text())
  exit(1)
}
const existing = await existsRes.json()
const existingSet = new Set(existing.map(r => r.email))
const fresh = candidates.filter(c => !existingSet.has(c.email))
console.log(`Skipping ${candidates.length - fresh.length} already-existing emails. ${fresh.length} new to import.`)

if (fresh.length === 0) {
  console.log('Nothing to do.')
  exit(0)
}

if (dryRun) {
  console.log('Dry run — not inserting. First 5 to be inserted:')
  console.log(fresh.slice(0, 5))
  exit(0)
}

// ── insert in batches ──────────────────────────────────────────────
const BATCH = 200
let inserted = 0
for (let i = 0; i < fresh.length; i += BATCH) {
  const batch = fresh.slice(i, i + BATCH).map(c => ({
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    source: sourceArg,
    tags: [],
  }))
  const res = await fetch(`${SUPA_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    console.error(`Batch ${i / BATCH} insert failed:`, res.status, await res.text())
    continue
  }
  inserted += batch.length
  process.stdout.write(`\rInserted ${inserted}/${fresh.length}…`)
}
console.log(`\nDone. ${inserted} subscriber rows imported.`)

// ── CSV parser (mirrors the one in the admin import route) ────────
function parseCsv(text) {
  const rows = []
  let row = []
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
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter(r => r.some(c => c.trim().length > 0))
}
