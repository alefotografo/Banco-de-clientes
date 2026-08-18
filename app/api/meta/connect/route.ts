import { NextResponse } from "next/server";

export function GET(request: Request) {
  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.json({ error: "A conexão Meta ainda não foi configurada." }, { status: 503 });
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/meta/callback`;
  const url = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_basic,pages_show_list,pages_read_engagement");
  return NextResponse.redirect(url);
}
