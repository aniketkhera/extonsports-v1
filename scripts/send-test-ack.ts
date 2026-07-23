// One-off: send the applicant acknowledgment email to info@extonsports.com so
// the formatting can be reviewed. Uses the SAME builder the live route uses.
//   RESEND_API_KEY=... npx tsx scripts/send-test-ack.ts
import { Resend } from "resend";
import { buildAckEmail } from "../app/api/apply/ack-email";

async function main() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    process.exit(1);
  }
  const resend = new Resend(key);

  const fromEnv = process.env.RESEND_FROM || "Exton Sports <noreply@orangish.io>";
  const addr = (fromEnv.match(/<([^>]+)>/)?.[1] || fromEnv).trim();
  const from = `Exton Sports Center <${addr}>`;
  const TO = "info@extonsports.com";

  const samples = [
    { name: "Priya Sharma", role: "Head Cricket Coach" },
    { name: "Alex Chen", role: "Head Badminton Coach" },
  ];

  for (const s of samples) {
    const ack = buildAckEmail(s);
    const { data, error } = await resend.emails.send({
      from,
      to: TO,
      replyTo: TO,
      subject: `[TEST] ${ack.subject}`,
      html: ack.html,
      text: ack.text,
    });
    if (error) {
      console.error("send error:", s.role, error);
      process.exit(1);
    }
    console.log(`sent ${s.role} -> ${TO} (from ${from}) id=${data?.id}`);
  }
}

main();
