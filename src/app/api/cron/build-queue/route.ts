import { NextRequest, NextResponse } from "next/server";
import { buildQueue } from "@/lib/scheduler";
import { checkCronAuth } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const unauthorized = checkCronAuth(req);
  if (unauthorized) return unauthorized;
  const result = await buildQueue();
  return NextResponse.json(result);
}
