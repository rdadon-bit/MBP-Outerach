import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.borrower
    .update({
      where: { id },
      data: { status: "UNSUBSCRIBED", nextTouchAt: null },
    })
    .catch(() => null);

  await db.queueItem.updateMany({
    where: { borrowerId: id, status: "pending" },
    data: { status: "cancelled" },
  });

  return new NextResponse(
    `<html><body style="font-family:sans-serif;text-align:center;padding-top:80px">
      <h2>You've been unsubscribed.</h2>
      <p>You won't receive further emails from Max Benjamin Partners.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
