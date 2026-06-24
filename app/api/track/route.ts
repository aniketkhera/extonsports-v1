import { createTrackRoute } from 'mailer-admin/api/track'
import { config } from '@/mailer-admin.config'

export const { POST } = createTrackRoute(config)
