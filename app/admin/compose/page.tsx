import { createComposePage } from 'mailer-admin/compose/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createComposePage(config)
