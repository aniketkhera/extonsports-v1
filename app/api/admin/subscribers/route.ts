import { createSubscribersRoute } from 'mailer-admin/api/subscribers'
import { config } from '@/mailer-admin.config'

export const { GET, POST } = createSubscribersRoute(config)
