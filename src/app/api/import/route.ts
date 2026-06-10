import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Accepts JSON: { source: string, rows: [{ firstName, lastName, email, company, phone, propertyAddress, propertyType, loanAmount, notes }] }
export async function POST(req: NextRequest) {
  const { source, rows } = await req.json();
  if (!Array.isArray(rows)) return NextResponse.json({ error: "rows must be an array" }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const r of rows) {
    const email = String(r.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      skipped++;
      continue;
    }
    try {
      const existing = await db.borrower.findUnique({ where: { email } });
      if (existing) {
        skipped++; // never re-import someone already in the database
        continue;
      }
      await db.borrower.create({
        data: {
          firstName: String(r.firstName || "").trim() || email.split("@")[0],
          lastName: String(r.lastName || "").trim() || null,
          email,
          company: String(r.company || "").trim() || null,
          phone: String(r.phone || "").trim() || null,
          propertyAddress: String(r.propertyAddress || "").trim() || null,
          propertyType: String(r.propertyType || "").trim() || null,
          loanAmount: String(r.loanAmount || "").trim() || null,
          notes: String(r.notes || "").trim() || null,
          source: source || "manual",
        },
      });
      imported++;
    } catch (e: any) {
      errors.push(`${email}: ${e?.message}`);
    }
  }

  return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10) });
}
