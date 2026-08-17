import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const code = incoming.searchParams.get("code");
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!code || !appId || !appSecret) return NextResponse.json({ error: "A autorização Meta não foi concluída." }, { status: 400 });
  const redirectUri = `${incoming.origin}/api/meta/callback`;
  const response = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: appId, client_secret: appSecret, grant_type: "authorization_code", redirect_uri: redirectUri, code }) });
  if (!response.ok) return NextResponse.json({ error: "A Meta recusou a autorização. Verifique a URL de retorno no painel do app." }, { status: response.status });
  return new NextResponse("<main style='font-family:Arial;padding:48px;max-width:650px'><h1>Conta Instagram autorizada</h1><p>A conexão foi confirmada. Volte ao Prospex para concluir o vínculo seguro do Radar Social.</p></main>", { headers: { "content-type": "text/html; charset=utf-8" } });
}
