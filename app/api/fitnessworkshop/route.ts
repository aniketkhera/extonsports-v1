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

// Every failure this relay can see on its own (a timeout, an answer that is not the
// platform's JSON) is AMBIGUOUS: the platform may already have filed the sign-up.
// Saying "not signed up" there invites a second sign-up and maybe a second Zelle
// payment, so say we don't know instead (review, 2026-10-21). The platform's own
// refusals ("Please give a real email address") pass through as they are.
const UNSURE =
  "We couldn't confirm your sign-up. It may already have gone through, so please don't pay again. Call (484) 252-2523 before trying again.";

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
      ok?: boolean;
      error?: string;
      field?: string;
      participants?: number;
      amount?: number;
      notified?: boolean;
    };
    if (!res.ok) {
      // The platform's own refusals always carry a message that names what to fix
      // ("Please give a real email address"). Without one we don't know what happened.
      return NextResponse.json(
        { error: data.error || UNSURE, field: data.field },
        { status: data.error ? res.status : 502 },
      );
    }
    // A 2xx that is not the platform's answer (a proxy page, an empty body) is not a sign-up.
    if (data.ok !== true) return NextResponse.json({ error: UNSURE }, { status: 502 });
    return NextResponse.json({
      ok: true,
      participants: data.participants,
      amount: data.amount,
      notified: data.notified !== false,
    });
  } catch {
    // Loud, never a cheerful 200: someone told they are signed up when they are
    // not turns up to a full room. But not "you are not signed up" either: after a
    // timeout the platform may well have filed it.
    return NextResponse.json({ error: UNSURE }, { status: 503 });
  }
}
