import { db, getSetting } from "./db";
import { renderTemplate, sendEmail } from "./gmail";
import { addDays, isWeekdayPT, ptToday, spreadAcrossWindow } from "./time";

// Cadence after initial email: day 3, day 7, day 14, then every 30 days.
const CADENCE: { touchType: string; daysAfterPrev: number }[] = [
  { touchType: "followup1", daysAfterPrev: 3 },
  { touchType: "followup2", daysAfterPrev: 4 }, // day 7
  { touchType: "followup3", daysAfterPrev: 7 }, // day 14
  { touchType: "monthly", daysAfterPrev: 30 },
];

export function nextTouch(touchCount: number): { touchType: string; daysFromNow: number } | null {
  // touchCount = touches already sent (1 = initial only)
  if (touchCount < 1) return null;
  const idx = touchCount - 1;
  if (idx < CADENCE.length) {
    return { touchType: CADENCE[idx].touchType, daysFromNow: CADENCE[idx].daysAfterPrev };
  }
  return { touchType: "monthly", daysFromNow: 30 }; // monthly forever until response/unsub
}

/**
 * Build today's send queue: up to `daily_new_limit` NEW borrowers and
 * `daily_followup_limit` due follow-ups, spread across the PT window.
 * Runs once each weekday morning before the window opens.
 */
export async function buildQueue(): Promise<{ newCount: number; followupCount: number }> {
  if (!isWeekdayPT()) return { newCount: 0, followupCount: 0 };
  if ((await getSetting("paused", "false")) === "true") return { newCount: 0, followupCount: 0 };

  let newLimit = parseInt(await getSetting("daily_new_limit", "120"), 10);
  let fuLimit = parseInt(await getSetting("daily_followup_limit", "80"), 10);

  // Ramp-up mode: cap total volume while the mailbox builds sending reputation.
  if ((await getSetting("ramp_up", "true")) === "true") {
    const firstSend = await db.emailLog.findFirst({ orderBy: { sentAt: "asc" } });
    const weeks = firstSend
      ? Math.floor((Date.now() - firstSend.sentAt.getTime()) / (7 * 86400000))
      : 0;
    const cap = Math.min(40 + weeks * 20, newLimit + fuLimit);
    const total = newLimit + fuLimit;
    newLimit = Math.max(1, Math.round((newLimit / total) * cap));
    fuLimit = Math.max(1, cap - newLimit);
  }

  const windowStart = parseInt(await getSetting("window_start_pt", "9"), 10);
  const windowEnd = parseInt(await getSetting("window_end_pt", "15"), 10);

  // Skip if already built today (idempotent)
  const existing = await db.queueItem.count({
    where: { status: "pending", scheduledAt: { gte: ptToday(0), lte: ptToday(23, 59) } },
  });
  if (existing > 0) return { newCount: 0, followupCount: 0 };

  const newBorrowers = await db.borrower.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: "asc" },
    take: newLimit,
  });

  const dueFollowups = await db.borrower.findMany({
    where: { status: "IN_SEQUENCE", nextTouchAt: { lte: ptToday(23, 59) } },
    orderBy: { nextTouchAt: "asc" },
    take: fuLimit,
  });

  const items: { borrowerId: string; touchType: string }[] = [
    ...newBorrowers.map((b) => ({ borrowerId: b.id, touchType: "initial" })),
    ...dueFollowups.map((b) => {
      const nt = nextTouch(b.touchCount);
      return { borrowerId: b.id, touchType: nt?.touchType ?? "monthly" };
    }),
  ];

  // Interleave + spread across window
  items.sort(() => Math.random() - 0.5);
  const times = spreadAcrossWindow(items.length, windowStart, windowEnd);

  await db.queueItem.createMany({
    data: items.map((it, i) => ({ ...it, scheduledAt: times[i] })),
  });

  return { newCount: newBorrowers.length, followupCount: dueFollowups.length };
}

/** Send every queue item that is due. Runs every few minutes during the window. */
export async function processQueue(): Promise<{ sent: number; failed: number }> {
  if ((await getSetting("paused", "false")) === "true") return { sent: 0, failed: 0 };

  const due = await db.queueItem.findMany({
    where: { status: "pending", scheduledAt: { lte: new Date() } },
    include: { borrower: true },
    orderBy: { scheduledAt: "asc" },
    take: 10, // safety cap per run
  });

  let sent = 0;
  let failed = 0;

  for (const item of due) {
    const b = item.borrower;

    // Skip if borrower state changed since queueing
    if (
      (item.touchType === "initial" && b.status !== "NEW") ||
      (item.touchType !== "initial" && b.status !== "IN_SEQUENCE")
    ) {
      await db.queueItem.update({ where: { id: item.id }, data: { status: "cancelled" } });
      continue;
    }

    const template = await db.template.findFirst({
      where: { touchType: item.touchType, active: true },
    });
    if (!template) {
      await db.queueItem.update({
        where: { id: item.id },
        data: { status: "failed", error: `No active template for ${item.touchType}` },
      });
      failed++;
      continue;
    }

    try {
      const subject = renderTemplate(template.subject, b as any);
      const body = renderTemplate(template.body, b as any).replace(/\n/g, "<br>");
      const unsubscribeUrl = `${process.env.APP_URL}/api/unsubscribe?id=${b.id}`;

      const { messageId, threadId } = await sendEmail({
        to: b.email,
        subject,
        bodyHtml: body,
        threadId: item.touchType === "initial" ? null : b.gmailThreadId,
        unsubscribeUrl,
      });

      const newTouchCount = b.touchCount + 1;
      const nt = nextTouch(newTouchCount);

      await db.$transaction([
        db.queueItem.update({ where: { id: item.id }, data: { status: "sent" } }),
        db.emailLog.create({
          data: {
            borrowerId: b.id,
            touchType: item.touchType,
            subject,
            gmailMessageId: messageId,
            gmailThreadId: threadId,
          },
        }),
        db.borrower.update({
          where: { id: b.id },
          data: {
            status: "IN_SEQUENCE",
            touchCount: newTouchCount,
            sequenceStart: b.sequenceStart ?? new Date(),
            lastTouchAt: new Date(),
            nextTouchAt: nt ? addDays(new Date(), nt.daysFromNow) : null,
            gmailThreadId: item.touchType === "initial" ? threadId : b.gmailThreadId,
          },
        }),
      ]);
      sent++;
    } catch (e: any) {
      failed++;
      await db.queueItem.update({
        where: { id: item.id },
        data: { status: "failed", error: String(e?.message || e).slice(0, 500) },
      });
    }
  }

  return { sent, failed };
}
