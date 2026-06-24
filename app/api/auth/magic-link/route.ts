import { createMagicLinkRoute } from 'mailer-admin/api/auth-magic-link'
import { config } from '@/mailer-admin.config'

export const { POST } = createMagicLinkRoute(config)
