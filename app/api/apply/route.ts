import { Resend } from "resend";
import { buildAckEmail } from "./ack-email";

// Needs the Node runtime for Buffer + the Resend SDK.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel serverless caps the request body at ~4.5 MB, so keep the resume
// comfortably under that (multipart overhead + fields).
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "doc", "docx", "rtf", "txt", "odt", "pages"];
const APPLICATIONS_TO = process.env.APPLICATIONS_EMAIL || "info@extonsports.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Pull the bare address out of a "Name <addr>" from-string so we can re-label
// the applicant-facing sender as "Exton Sports Center" while keeping the same
// (authenticated) sending address.
function senderAddress(from: string) {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    // Honeypot — bots fill hidden fields; humans never see it.
    if (String(form.get("company") || "").trim()) {
      return json({ ok: true });
    }

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const role = String(form.get("role") || "Coaching role").trim();
    const coverLetter = String(form.get("coverLetter") || "").trim();
    const workAuthorized =
      form.get("workAuthorized") === "yes" ||
      form.get("workAuthorized") === "true" ||
      form.get("workAuthorized") === "on";
    const resume = form.get("resume");

    // Validation
    if (!name) return json({ error: "Please enter your name." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({ error: "Please enter a valid email address." }, 400);

    const attachments: { filename: string; content: Buffer }[] = [];
    if (resume && typeof resume === "object" && "arrayBuffer" in resume) {
      const file = resume as File;
      if (file.size > 0) {
        if (file.size > MAX_BYTES)
          return json({ error: "Résumé must be under 4 MB." }, 400);
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        if (!ALLOWED_EXT.includes(ext))
          return json(
            { error: "Résumé must be a PDF, Word, or text document." },
            400,
          );
        attachments.push({
          filename: file.name || "resume",
          content: Buffer.from(await file.arrayBuffer()),
        });
      }
    }
    if (!attachments.length)
      return json({ error: "Please attach your résumé." }, 400);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[apply] RESEND_API_KEY missing");
      return json(
        { error: `Application service unavailable — please email ${APPLICATIONS_TO}.` },
        500,
      );
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM || "Exton Sports <noreply@orangish.io>";

    const rows: [string, string][] = [
      ["Role", role],
      ["Name", name],
      ["Email", email],
      ["Phone", phone || "—"],
      ["Work-authorized in US", workAuthorized ? "Yes" : "No"],
    ];
    const tableHtml = rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#8C7B6E;font:600 12px system-ui;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;vertical-align:top">${esc(
            k,
          )}</td><td style="padding:4px 0;color:#0D0D0D;font:14px system-ui">${esc(
            v,
          )}</td></tr>`,
      )
      .join("");
    const coverHtml = coverLetter
      ? `<h3 style="font:600 13px system-ui;text-transform:uppercase;letter-spacing:.06em;color:#8C7B6E;margin:24px 0 8px">Cover letter</h3><p style="font:14px/1.6 system-ui;color:#0D0D0D;white-space:pre-wrap;margin:0">${esc(
          coverLetter,
        )}</p>`
      : "";

    const html = `<div style="max-width:640px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif">
      <h2 style="font:700 20px system-ui;color:#0D0D0D;margin:0 0 4px">New application — ${esc(role)}</h2>
      <p style="font:14px system-ui;color:#8C7B6E;margin:0 0 20px">Submitted via extonsports.com/careers</p>
      <table style="border-collapse:collapse">${tableHtml}</table>
      ${coverHtml}
      <p style="font:13px system-ui;color:#8C7B6E;margin:24px 0 0">Résumé attached. Reply to this email to reach ${esc(
        name,
      )} directly.</p>
    </div>`;

    const text = [
      `New application — ${role}`,
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
      "",
      coverLetter ? `Cover letter:\n${coverLetter}` : "",
      "",
      "Résumé attached.",
    ]
      .filter((l) => l !== undefined)
      .join("\n");

    const { error } = await resend.emails.send({
      from,
      to: APPLICATIONS_TO,
      replyTo: email,
      subject: `Application: ${role} — ${name}`,
      html,
      text,
      attachments,
    });

    if (error) {
      console.error("[apply] resend error", error);
      return json(
        { error: `Could not send your application — please email ${APPLICATIONS_TO}.` },
        502,
      );
    }

    // Best-effort acknowledgment to the applicant. Never fail the application
    // if this send hiccups — the important email (to the club) already landed.
    try {
      const ack = buildAckEmail({ name, role });
      const { error: ackErr } = await resend.emails.send({
        from: `Exton Sports Center <${senderAddress(from)}>`,
        to: email,
        replyTo: APPLICATIONS_TO,
        subject: ack.subject,
        html: ack.html,
        text: ack.text,
      });
      if (ackErr) console.error("[apply] ack email error", ackErr);
    } catch (e) {
      console.error("[apply] ack email threw", e);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[apply] error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
