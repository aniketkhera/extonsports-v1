import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '../../../../lib/auth-guard'
import { uploadImage } from '../../../../lib/supabase'

// POST /api/admin/upload-image — multipart  { file }
// Returns { url } — public URL of the uploaded image, suitable for
// dropping into a Markdown ![alt](url) embed.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Image too large (max ${MAX_BYTES / 1024 / 1024} MB).` }, { status: 413 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG / JPG / GIF / WebP allowed.' }, { status: 415 })
  }

  try {
    const buf = await file.arrayBuffer()
    const url = await uploadImage(file.name, buf, file.type)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[upload-image]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
