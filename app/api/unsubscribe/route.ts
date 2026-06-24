import { createUnsubscribeRoute } from 'mailer-admin/api/unsubscribe'
import { config } from '@/mailer-admin.config'

export const { POST } = createUnsubscribeRoute(config)
