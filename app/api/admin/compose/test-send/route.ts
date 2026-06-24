import { createTestSendRoute } from 'mailer-admin/api/compose-test-send'
import { config } from '@/mailer-admin.config'

export const { POST } = createTestSendRoute(config)
