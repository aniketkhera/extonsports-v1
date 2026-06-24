import { createSubscribeRoute } from 'mailer-admin/api/subscribe'
import { config } from '@/mailer-admin.config'

export const { POST } = createSubscribeRoute(config)
