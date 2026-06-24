import { createSendsPage } from 'mailer-admin/sends/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createSendsPage(config)
