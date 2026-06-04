// Email-safe HTML shell. Renders a known-good 600px-wide table
// layout that survives Gmail, Outlook, Apple Mail, Yahoo. The body
// is dropped into the middle section; header (brand) and footer
// (address + unsubscribe) are fixed.
//
// Why table-for-layout: Outlook's rendering engine is still based on
// Microsoft Word and doesn't support flexbox/grid. Tables work
// everywhere. Welcome to email HTML.
//
// CAN-SPAM: every email rendered through here gets the physical
// mailing address + an unsubscribe link in the footer, no exceptions.

const ORG_NAME = 'Exton Sports Center'
const ORG_ADDRESS = '4 Tabas Lane, Building 2, Exton, PA 19341'
const BRAND_COLOR = '#F37A4A'
const BG_COLOR = '#FDF4EE'

export type EmailShellArgs = {
  // Subject for the <title>; doesn't actually drive Inbox subject
  // (that's set in the Resend send call) but improves preview
  // rendering in some clients.
  subject: string
  // Pre-rendered HTML body fragment (no <html>/<body>). Comes from
  // markdownToEmailHtml().
  bodyHtml: string
  // Per-recipient unsubscribe URL — must be already interpolated
  // before this function is called.
  unsubscribeUrl: string
}

export function renderEmailHtml(args: EmailShellArgs): string {
  const { subject, bodyHtml, unsubscribeUrl } = args
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG_COLOR};">
  <!-- Hidden preview text. Most clients show the first ~90 chars
       of body content as the preview pane snippet. -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    ${stripTags(bodyHtml).slice(0, 140)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_COLOR};">
    <tr><td align="center" style="padding:24px 12px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E8D5C8;border-radius:14px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:24px 32px 12px 32px;border-bottom:1px solid #F4E8DD;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND_COLOR};">
            ${ORG_NAME}
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;color:#222222;">
          ${bodyHtml}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:18px 32px 24px 32px;border-top:1px solid #F4E8DD;background:#FDF4EE;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:#777777;">
            <p style="margin:0 0 8px 0;">
              <strong style="color:#444;">${ORG_NAME}</strong><br />
              ${escapeHtml(ORG_ADDRESS)}
            </p>
            <p style="margin:8px 0 0 0;">
              You&rsquo;re receiving this because you signed up at extonsports.com.<br />
              <a href="${unsubscribeUrl}" style="color:#777;text-decoration:underline;">Unsubscribe</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:info@extonsports.com" style="color:#777;text-decoration:underline;">Contact us</a>
            </p>
          </div>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
