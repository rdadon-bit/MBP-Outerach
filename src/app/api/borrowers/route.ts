import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q");
  const borrowers = await db.borrower.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
              { propertyAddress: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return NextResponse.json(borrowers);
}

// PATCH { id, status?, notes? } — manual status changes (e.g. mark CLIENT or DEAD)
export async function PATCH(req: NextRequest) {
  const { id, status, notes } = await req.json();
  const data: any = {};
  if (status) {
    data.status = status;
    if (["DEAD", "CLIENT", "UNSUBSCRIBED"].includes(status)) data.nextTouchAt = null;
  }
  if (notes !== undefined) data.notes = notes;

  const borrower = await db.borrower.update({ where: { id }, data });
  if (data.nextTouchAt === null) {
    await db.queueItem.updateMany({
      where: { borrowerId: id, status: "pending" },
      data: { status: "cancelled" },
    });
  }
  return NextResponse.json(borrower);
}
