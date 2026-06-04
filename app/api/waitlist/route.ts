import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name  = (body.name  ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    if (!name || !email)
      return NextResponse.json({ error: "Name and email required." }, { status: 400 });

    // Save to Supabase (best-effort)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && supabaseKey) {
      await fetch(`${supabaseUrl}/rest/v1/exton_waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ name, email, source: "extonsports.com" }),
      }).catch(() => {});
    }

    // Notify via Resend (best-effort); also falls back to Formsubmit
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Exton Sports <noreply@starsquash.com>",
        to: ["akhera@gmail.com"],
        replyTo: email,
        subject: `New Exton Sports waitlist signup — ${name}`,
        html: `
          <h2 style="font-family:Arial,sans-serif;color:#F37A4A">New waitlist signup</h2>
          <table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">
            <tr><td><b>Name</b></td><td>${name}</td></tr>
            <tr><td><b>Email</b></td><td>${email}</td></tr>
            <tr><td><b>Source</b></td><td>extonsports.com</td></tr>
          </table>
        `,
      });
    } else {
      // Resend key missing — log clearly so it shows in Vercel logs
      console.error("[waitlist] RESEND_API_KEY not set — email not sent. Add it in Vercel env vars.");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
