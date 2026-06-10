import { NextRequest, NextResponse } from "next/server";
import { checkReplies } from "@/lib/gmail";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const replies = await checkReplies();
  return NextResponse.json({ replies });
}
