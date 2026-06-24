import { createSubscriberRoute } from 'mailer-admin/api/subscriber-id'
import { config } from '@/mailer-admin.config'

export const { PATCH } = createSubscriberRoute(config)
