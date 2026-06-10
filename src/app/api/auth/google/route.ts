import { NextResponse } from "next/server";
import { oauthClient } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  return NextResponse.redirect(url);
}
