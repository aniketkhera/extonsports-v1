import { createLogoutRoute } from 'mailer-admin/api/auth-logout'
import { config } from '@/mailer-admin.config'

export const { POST } = createLogoutRoute(config)
