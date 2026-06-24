import { createUnsubscribePage, createUnsubscribeMetadata } from 'mailer-admin/public/unsubscribe/page'
import { config } from '@/mailer-admin.config'

export const dynamic = 'force-dynamic'

export const metadata = createUnsubscribeMetadata(config)

export default createUnsubscribePage(config)
