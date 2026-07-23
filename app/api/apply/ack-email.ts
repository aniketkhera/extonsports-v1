// Applicant-facing acknowledgment email ("thanks, we'll be in touch").
// Pure string builder — no Resend / Next imports — so both the /api/apply
// route and the send-test-ack script can share the exact same output.

const ACADEMY_BY_ROLE: Record<string, string> = {
  "Head Cricket Coach": "Excel Cricket Academy",
  "Head Badminton Coach": "SmashShuttler Badminton Academy",
};

const LOGO_URL = "https://extonsports.com/logo.png";
const CONTACT_EMAIL = "info@extonsports.com";
const ADDRESS = "4 Tabas Lane, Building 2 · Exton, PA 19341";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "";
}

export function buildAckEmail(args: { name: string; role: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const role = args.role || "Coaching role";
  const fn = firstName(args.name);
  const academy = ACADEMY_BY_ROLE[role];

  const greetingHtml = fn ? `Hi ${esc(fn)},` : "Hi there,";
  const greetingText = fn ? `Hi ${fn},` : "Hi there,";
  const roleHtml = academy
    ? `the <strong>${esc(role)}</strong> role with <strong>${esc(academy)}</strong> at Exton Sports Center`
    : `the <strong>${esc(role)}</strong> role at Exton Sports Center`;
  const roleText = academy
    ? `the ${role} role with ${academy} at Exton Sports Center`
    : `the ${role} role at Exton Sports Center`;

  const subject = `Thanks for applying — ${role} at Exton Sports Center`;

  const p = "margin:0 0 16px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#222222;";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FDF4EE;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FDF4EE;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E8D5C8;border-radius:14px;overflow:hidden;">

        <tr><td align="center" style="padding:28px 32px 14px 32px;border-bottom:1px solid #F4E8DD;">
          <img src="${LOGO_URL}" width="64" height="64" alt="Exton Sports Center" style="display:block;border:0;outline:none;text-decoration:none;width:64px;height:64px;border-radius:50%;margin:0 auto 10px auto;" />
          <div style="font:800 13px/1 Arial,Helvetica,sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:#F37A4A;">Exton Sports Center</div>
        </td></tr>

        <tr><td style="padding:26px 32px 8px 32px;">
          <p style="${p}">${greetingHtml}</p>
          <p style="${p}">Thanks for applying for ${roleHtml}. We&rsquo;ve received your application and r&eacute;sum&eacute; &mdash; this note is just to confirm it came through.</p>
          <p style="${p}">We review applications on a rolling basis and will reach out if there&rsquo;s a strong fit. In the meantime, if anything comes up or you&rsquo;d like to add to your application, just reply to this email &mdash; it goes straight to our team.</p>
          <p style="margin:0;font:16px/1.6 Arial,Helvetica,sans-serif;color:#222222;">Thanks again for your interest in helping us build something new.</p>
        </td></tr>

        <tr><td style="padding:22px 32px 26px 32px;border-top:1px solid #F4E8DD;background:#FDF4EE;">
          <p style="margin:0 0 6px 0;font:700 14px Arial,Helvetica,sans-serif;color:#0D0D0D;">&mdash; The Exton Sports Center Team</p>
          <p style="margin:0;font:12px/1.65 Arial,Helvetica,sans-serif;color:#777777;">
            ${esc(ADDRESS)}<br />
            <a href="https://extonsports.com" style="color:#777777;text-decoration:underline;">extonsports.com</a>
            &nbsp;&middot;&nbsp;
            <a href="mailto:${CONTACT_EMAIL}" style="color:#777777;text-decoration:underline;">${CONTACT_EMAIL}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${greetingText}

Thanks for applying for ${roleText}. We've received your application and résumé — this note is just to confirm it came through.

We review applications on a rolling basis and will reach out if there's a strong fit. In the meantime, if anything comes up or you'd like to add to your application, just reply to this email — it goes straight to our team.

Thanks again for your interest in helping us build something new.

— The Exton Sports Center Team
${ADDRESS}
extonsports.com · ${CONTACT_EMAIL}`;

  return { subject, html, text };
}
