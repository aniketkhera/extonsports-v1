import { createImportRoute } from 'mailer-admin/api/subscribers-import'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { POST } = createImportRoute(config)
