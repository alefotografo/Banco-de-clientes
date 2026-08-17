import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const code = incoming.searchParams.get("code");
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!code || !appId || !appSecret) return NextResponse.json({ error: "A autorização Meta não foi concluída." }, { status: 400 });
  const redirectUri = `${incoming.origin}/api/meta/callback`;
  const exchange = new URL("https://graph.facebook.com/v25.0/oauth/access_token");
  exchange.searchParams.set("client_id", appId); exchange.searchParams.set("client_secret", appSecret); exchange.searchParams.set("redirect_uri", redirectUri); exchange.searchParams.set("code", code);
  const response = await fetch(exchange);
  if (!response.ok) return NextResponse.json({ error: "A Meta recusou a autorização. Verifique a URL de retorno no painel do app." }, { status: response.status });
  return new NextResponse("<main style='font-family:Arial;padding:48px;max-width:650px'><h1>Conta Instagram autorizada</h1><p>A conexão foi confirmada. Volte ao Prospex para concluir o vínculo seguro do Radar Social.</p></main>", { headers: { "content-type": "text/html; charset=utf-8" } });
}
