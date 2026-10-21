import { NextResponse } from "next/server";

// POST /api/fitnessworkshop
// ---------------------------------------------------------------------------
// The workshop sign-up form on /fitnessworkshop. A thin SERVER-SIDE relay to the
// platform's /api/public/workshop-registration, which files the sign-up and
// emails the organiser. The same pattern, and the same reasons, as
// ./enquiry/route.ts: platform calls are server-side only, so extonsports.com
// needs no CORS entry, the platform's limiter sees one caller, and the visitor's
// IP is not forwarded.
//
// Only the named fields go on. The workshop slug is set HERE, not taken from the
// browser, so this relay can only ever file sign-ups for this one workshop.
//
// Added 2026-10-21.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = (process.env.ORANGISH_API_BASE || "https://app.orangish.io").replace(/\/$/, "");

const FAIL =
  "Could not send that, so you are not signed up yet. Please try again, or call (484) 252-2523.";

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Could not read that. Please try again." }, { status: 400 });
  }

  const pick = (k: string) => (typeof b?.[k] === "string" || typeof b?.[k] === "number" ? b[k] : "");
  const body = {
    workshop: "fitnessworkshop",
    name: pick("name"),
    email: pick("email"),
    phone: pick("phone"),
    participants: pick("participants"),
    zelleRef: pick("zelleRef"),
    website: pick("website"),
  };

  try {
    const res = await fetch(`${API_BASE}/api/public/workshop-registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // As long as the enquiry relay's: the platform files the row, then emails,
      // and a timeout here is ambiguous. Better to wait than to tell someone it
      // failed and have them sign up twice.
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      field?: string;
      participants?: number;
      amount?: number;
    };
    if (!res.ok) {
      // The platform's own message names what to fix ("Please give a real email address").
      return NextResponse.json({ error: data.error || FAIL, field: data.field }, { status: res.status });
    }
    return NextResponse.json({ ok: true, participants: data.participants, amount: data.amount });
  } catch {
    // Loud, never a cheerful 200: someone told they are signed up when they are
    // not turns up to a full room.
    return NextResponse.json({ error: FAIL }, { status: 503 });
  }
}
