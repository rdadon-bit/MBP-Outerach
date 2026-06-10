import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await db.template.findMany({ orderBy: { touchType: "asc" } });
  return NextResponse.json(templates);
}

// POST { id?, name, touchType, subject, body, active }
export async function POST(req: NextRequest) {
  const { id, name, touchType, subject, body, active } = await req.json();
  if (!touchType || !subject || !body) {
    return NextResponse.json({ error: "touchType, subject, body required" }, { status: 400 });
  }
  const data = { name: name || touchType, touchType, subject, body, active: active !== false };
  const template = id
    ? await db.template.update({ where: { id }, data })
    : await db.template.create({ data });

  // only one active template per touchType
  if (template.active) {
    await db.template.updateMany({
      where: { touchType, id: { not: template.id }, active: true },
      data: { active: false },
    });
  }
  return NextResponse.json(template);
}
