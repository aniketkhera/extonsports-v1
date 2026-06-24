import { createUploadImageRoute } from 'mailer-admin/api/upload-image'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export const { POST } = createUploadImageRoute(config)
