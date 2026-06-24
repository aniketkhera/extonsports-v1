import { createResubscribeRoute } from 'mailer-admin/api/resubscribe'
import { config } from '@/mailer-admin.config'

export const { POST } = createResubscribeRoute(config)
