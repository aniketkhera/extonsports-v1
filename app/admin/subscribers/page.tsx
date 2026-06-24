import { createSubscribersPage } from 'mailer-admin/subscribers/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createSubscribersPage(config)
