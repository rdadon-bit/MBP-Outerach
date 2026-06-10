import { google } from "googleapis";
import { db, getSetting } from "./db";

export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/google/callback`
  );
}

export async function gmailClient() {
  const refreshToken = await getSetting("google_refresh_token");
  if (!refreshToken) throw new Error("Gmail not connected. Visit /api/auth/google to authorize.");
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

function b64url(s: string) {
  return Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function renderTemplate(tpl: string, b: Record<string, string | null | undefined>): string {
  return tpl
    .replace(/\{\{firstName\}\}/g, b.firstName || "there")
    .replace(/\{\{lastName\}\}/g, b.lastName || "")
    .replace(/\{\{company\}\}/g, b.company || "your company")
    .replace(/\{\{propertyAddress\}\}/g, b.propertyAddress || "your property")
    .replace(/\{\{propertyType\}\}/g, b.propertyType || "property")
    .replace(/\{\{loanAmount\}\}/g, b.loanAmount || "");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  bodyHtml: string;
  threadId?: string | null; // reply in-thread for follow-ups
  unsubscribeUrl: string;
}): Promise<{ messageId: string; threadId: string }> {
  const gmail = await gmailClient();
  const senderEmail = await getSetting("sender_email");
  const senderName = await getSetting("sender_name", "Max Benjamin Partners");

  const footer = `<br><br><div style="font-size:11px;color:#888">Max Benjamin Partners &middot; If you'd prefer not to hear from us, <a href="${opts.unsubscribeUrl}">click here to unsubscribe</a>.</div>`;

  const raw = [
    `From: ${senderName} <${senderEmail}>`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `List-Unsubscribe: <${opts.unsubscribeUrl}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    opts.bodyHtml + footer,
  ].join("\r\n");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: b64url(raw), ...(opts.threadId ? { threadId: opts.threadId } : {}) },
  });

  return { messageId: res.data.id!, threadId: res.data.threadId! };
}

/** Check tracked threads for inbound replies; mark borrowers RESPONDED and cancel pending follow-ups. */
export async function checkReplies(): Promise<number> {
  const gmail = await gmailClient();
  const senderEmail = (await getSetting("sender_email")).toLowerCase();

  const open = await db.borrower.findMany({
    where: { status: "IN_SEQUENCE", gmailThreadId: { not: null } },
    select: { id: true, gmailThreadId: true, email: true },
  });

  let found = 0;
  for (const b of open) {
    try {
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: b.gmailThreadId!,
        format: "metadata",
        metadataHeaders: ["From"],
      });
      const hasReply = (thread.data.messages || []).some((m) => {
        const from = (m.payload?.headers?.find((h) => h.name === "From")?.value || "").toLowerCase();
        return from.length > 0 && !from.includes(senderEmail);
      });
      if (hasReply) {
        found++;
        await db.$transaction([
          db.borrower.update({
            where: { id: b.id },
            data: { status: "RESPONDED", respondedAt: new Date(), nextTouchAt: null },
          }),
          db.queueItem.updateMany({
            where: { borrowerId: b.id, status: "pending" },
            data: { status: "cancelled" },
          }),
          db.emailLog.updateMany({
            where: { borrowerId: b.id, replied: false },
            data: { replied: true, repliedAt: new Date() },
          }),
        ]);
      }
    } catch {
      // thread fetch failures are non-fatal; retry next run
    }
  }
  return found;
}
