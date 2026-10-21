// extonsports-v1 → mailer-admin configuration.
// Wires THIS site's env names + brand + theme into the shared package.
// Supabase creds + admin allowlist resolve via the package's env adapters
// (no Vercel renames: EXTONSPORTS_ADMIN_EMAILS / NEXT_PUBLIC_SUPABASE_URL
// keep working).

import { defineConfig, resolveSupabaseEnv, resolveAdminEmails } from 'mailer-admin/config'

export const config = defineConfig({
  property: 'extonsports',
  brandName: 'Exton Sports Center',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://extonsports.com',
  supabase: resolveSupabaseEnv,
  auth: {
    secret: process.env.AUTH_SECRET,
    adminEmails: resolveAdminEmails('extonsports'),
    cookieName: 'es_session',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    // Every Exton mailing-list email (the welcome, the staff signup notice, and every
    // newsletter sent from /admin/compose) comes from Exton's own domain. Aniket's decision,
    // 2026-10-21; extonsports.com is verified for sending on the Resend account this site's
    // RESEND_API_KEY belongs to (checked the same day). Until then it was the RESEND_FROM
    // env var, falling back to "Exton Sports" at noreply@ orangish.io.
    //
    // Deliberately NOT read from RESEND_FROM any more: an env var left over (or set for
    // another route) could quietly send the list from orangish.io again, and that is the
    // one thing this line is here to rule out. RESEND_FROM was not set on the Vercel
    // project when this changed (checked 2026-10-21), and app/api/apply still reads it for
    // the academy-application emails, which are not the mailing list. To change the
    // sender, change this line. Pinned by lib/signup-notice.test.mjs.
    from: 'Exton Sports Center <noreply@extonsports.com>',
  },
  email: {
    physicalAddress: '4 Tabas Lane, Building 2, Exton, PA 19341',
    replyTo: 'info@extonsports.com',
    contactEmail: 'info@extonsports.com',
    signupContext: 'you signed up at extonsports.com',
    logoUrl: 'https://extonsports.com/logo.png',
  },
  theme: {
    accent: '#F37A4A',
    accentText: '#FFFFFF',
    pageBg: '#FDF4EE',
    panelBg: '#FFFFFF',
    headerBg: '#FBF3EC',
    border: '#E8D5C8',
    borderSoft: '#F4E8DD',
    text: '#0D0D0D',
    mutedText: '#8C7B6E',
    faintText: '#C9BBB0',
    rowHover: '#FCF6F1',
  },
  segments: [
    { key: 'sport', namespace: 'sport:', label: 'Sport', values: ['cricket', 'squash', 'badminton', 'turf', 'fitness'] },
  ],
  timezone: 'America/New_York',
  notifyEmail: ['info@extonsports.com', 'aniket@orangish.io', 'akhera@gmail.com', 'admin@orangish.io'],
  welcomeEmails: true,
})
