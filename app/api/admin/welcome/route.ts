import { createWelcomeRoute } from 'mailer-admin/api/welcome'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export const { GET, POST } = createWelcomeRoute(config)
