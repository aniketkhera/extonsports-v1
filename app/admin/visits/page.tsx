import { createVisitsPage } from 'mailer-admin/visits/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createVisitsPage(config)
