import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

const KEYS = [
  "sender_name",
  "daily_new_limit",
  "daily_followup_limit",
  "window_start_pt",
  "window_end_pt",
  "ramp_up",
  "paused",
];

export async function GET() {
  const out: Record<string, string> = {};
  for (const k of KEYS) out[k] = await getSetting(k);
  out.sender_email = await getSetting("sender_email");
  out.gmail_connected = (await getSetting("google_refresh_token")) ? "true" : "false";
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  for (const k of KEYS) {
    if (body[k] !== undefined) await setSetting(k, String(body[k]));
  }
  return NextResponse.json({ ok: true });
}
