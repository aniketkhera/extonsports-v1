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
        from: "Exton Sports <noreply@extonsports.com>",
        to: ["akhera@gmail.com", "contact@extonsports.com", "aniket@squashtigers.com"],
        replyTo: email,
        subject: `New waitlist signup — ${name}`,
        html: `<p><b>Name:</b> ${name}<br><b>Email:</b> ${email}</p><p style="color:#888;font-size:12px">extonsports.com waitlist</p>`,
      });
    } else {
      // Formsubmit fallback — akhera@gmail.com is pre-activated
      await fetch("https://formsubmit.co/ajax/akhera@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Exton Sports waitlist — ${name}`,
          _replyto: email,
          _cc: "contact@extonsports.com,aniket@squashtigers.com",
          _captcha: "false",
          Name: name,
          Email: email,
          Source: "extonsports.com",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
