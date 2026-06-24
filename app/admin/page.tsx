import { createDashboardPage } from 'mailer-admin/admin/dashboard'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createDashboardPage(config)
