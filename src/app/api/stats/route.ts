import { NextResponse } from "next/server";
import { db, getSetting } from "@/lib/db";
import { ptToday } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const todayStart = ptToday(0);

  const [
    sentToday,
    newSentToday,
    pendingToday,
    totalBorrowers,
    byStatus,
    repliesTotal,
    sentTotal,
    last14,
    senderEmail,
    paused,
    rampUp,
  ] = await Promise.all([
    db.emailLog.count({ where: { sentAt: { gte: todayStart } } }),
    db.emailLog.count({ where: { sentAt: { gte: todayStart }, touchType: "initial" } }),
    db.queueItem.count({ where: { status: "pending" } }),
    db.borrower.count(),
    db.borrower.groupBy({ by: ["status"], _count: true }),
    db.emailLog.count({ where: { replied: true } }),
    db.emailLog.count(),
    db.emailLog.findMany({
      where: { sentAt: { gte: new Date(Date.now() - 14 * 86400000) } },
      select: { sentAt: true, touchType: true, replied: true },
    }),
    getSetting("sender_email"),
    getSetting("paused", "false"),
    getSetting("ramp_up", "true"),
  ]);

  // group last-14-day sends by date
  const daily: Record<string, { initial: number; followup: number; replies: number }> = {};
  for (const e of last14) {
    const day = e.sentAt.toISOString().slice(0, 10);
    daily[day] ??= { initial: 0, followup: 0, replies: 0 };
    if (e.touchType === "initial") daily[day].initial++;
    else daily[day].followup++;
    if (e.replied) daily[day].replies++;
  }

  return NextResponse.json({
    sentToday,
    newSentToday,
    followupSentToday: sentToday - newSentToday,
    pendingToday,
    totalBorrowers,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    repliesTotal,
    sentTotal,
    replyRate: sentTotal ? ((repliesTotal / sentTotal) * 100).toFixed(1) : "0",
    daily,
    senderEmail,
    paused: paused === "true",
    rampUp: rampUp === "true",
  });
}
