// Thin REST-API wrapper. We avoid pulling in @supabase/supabase-js to
// keep the dep tree small — same pattern the existing /api/waitlist
// route uses. The service role key bypasses RLS, which is what we
// want for server-only routes.
//
// All helpers in here are server-only — never import from a client
// component, the service role key must never leak to the browser.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function supabaseConfigured(): boolean {
  return !!(SUPA_URL && SUPA_KEY)
}

function assertEnv(): { url: string; key: string } {
  if (!SUPA_URL || !SUPA_KEY) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return { url: SUPA_URL, key: SUPA_KEY }
}

type RestOptions = {
  // Comma-separated columns; null for all (*)
  select?: string | null
  // PostgREST filter clauses, e.g. { 'unsubscribed_at': 'is.null' }
  filters?: Record<string, string>
  // PostgREST order, e.g. 'subscribed_at.desc'
  order?: string
  limit?: number
  // 'resolution=ignore-duplicates' | 'return=representation' etc.
  prefer?: string
}

function buildUrl(table: string, opts: RestOptions = {}): string {
  const { url } = assertEnv()
  const u = new URL(`${url}/rest/v1/${table}`)
  if (opts.select) u.searchParams.set('select', opts.select)
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) u.searchParams.set(k, v)
  }
  if (opts.order) u.searchParams.set('order', opts.order)
  if (opts.limit != null) u.searchParams.set('limit', String(opts.limit))
  return u.toString()
}

function headers(prefer?: string): Record<string, string> {
  const { key } = assertEnv()
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  }
  if (prefer) h.Prefer = prefer
  return h
}

export async function selectRows<T = Record<string, unknown>>(
  table: string,
  opts: RestOptions = {},
): Promise<T[]> {
  const res = await fetch(buildUrl(table, opts), { headers: headers(), cache: 'no-store' })
  if (!res.ok) throw new Error(`supabase select ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function selectOne<T = Record<string, unknown>>(
  table: string,
  opts: RestOptions = {},
): Promise<T | null> {
  const rows = await selectRows<T>(table, { ...opts, limit: 1 })
  return rows[0] ?? null
}

export async function insertRow<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  prefer = 'return=representation',
): Promise<T | null> {
  const res = await fetch(buildUrl(table), {
    method: 'POST',
    headers: headers(prefer),
    body: JSON.stringify(row),
  })
  if (!res.ok) throw new Error(`supabase insert ${table}: ${res.status} ${await res.text()}`)
  if (prefer.includes('return=representation')) {
    const arr = await res.json()
    return Array.isArray(arr) ? arr[0] ?? null : arr ?? null
  }
  return null
}

export async function insertRows(
  table: string,
  rows: Record<string, unknown>[],
  prefer = 'resolution=ignore-duplicates',
): Promise<void> {
  if (rows.length === 0) return
  const res = await fetch(buildUrl(table), {
    method: 'POST',
    headers: headers(prefer),
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`supabase bulk insert ${table}: ${res.status} ${await res.text()}`)
}

export async function updateRows(
  table: string,
  filters: Record<string, string>,
  patch: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(buildUrl(table, { filters }), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`supabase update ${table}: ${res.status} ${await res.text()}`)
}

// Storage upload — used by the Markdown image-upload button. Returns
// the public URL of the uploaded object. The bucket is configured
// public-read so email clients can fetch the image without auth.
export async function uploadImage(filename: string, body: ArrayBuffer | Buffer, contentType: string): Promise<string> {
  const { url, key } = assertEnv()
  const bucket = 'mailer-images'
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Prepend a timestamp + random suffix so two uploads of the same
  // filename don't collide.
  const objectKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${objectKey}`
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: body as BodyInit,
  })
  if (!res.ok) throw new Error(`supabase storage upload: ${res.status} ${await res.text()}`)
  return `${url}/storage/v1/object/public/${bucket}/${objectKey}`
}
