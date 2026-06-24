import { createVerifyRoute } from 'mailer-admin/api/auth-verify'
import { config } from '@/mailer-admin.config'

export const { GET } = createVerifyRoute(config)
