import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { oauthClient } from "@/lib/gmail";
import { setSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "No refresh token returned. Remove app access at myaccount.google.com/permissions and try again." },
      { status: 400 }
    );
  }
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();

  await setSetting("google_refresh_token", tokens.refresh_token);
  if (me.data.email) await setSetting("sender_email", me.data.email);

  return NextResponse.redirect(`${process.env.APP_URL}/?connected=1`);
}
