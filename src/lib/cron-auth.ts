import { NextRequest, NextResponse } from "next/server";

export function checkCronAuth(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
