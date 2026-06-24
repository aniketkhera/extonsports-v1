import { createSendRoute } from 'mailer-admin/api/compose-send'
import { config } from '@/mailer-admin.config'

export const maxDuration = 60

export const { POST } = createSendRoute(config)
