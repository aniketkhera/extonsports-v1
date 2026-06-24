import { createWelcomePage } from 'mailer-admin/welcome/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export default createWelcomePage(config)
