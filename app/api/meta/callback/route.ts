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
  const tokenPayload = await response.json() as { access_token?: string };
  if (!tokenPayload.access_token) return NextResponse.json({ error: "A Meta não retornou um token de acesso." }, { status: 502 });
  const pages = await fetch(`https://graph.facebook.com/v25.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(tokenPayload.access_token)}`);
  if (!pages.ok) return NextResponse.json({ error: "A Meta não liberou a leitura das Páginas selecionadas. Refça a conexão e permita o acesso à Página do Facebook." }, { status: pages.status });
  const pagePayload = await pages.json() as { data?: Array<{ name?: string; instagram_business_account?: { id?: string; username?: string } }> };
  const instagramAccountId = pagePayload.data?.find((page) => page.instagram_business_account?.id)?.instagram_business_account?.id;
  if (!instagramAccountId) {
    const selectedPages = pagePayload.data?.map((page) => page.name).filter(Boolean).join(", ") || "nenhuma Página";
    return NextResponse.json({ error: `Nenhuma conta profissional do Instagram foi encontrada na Página selecionada (${selectedPages}). No Instagram, conecte @alefotografo à Página correta em Editar perfil → Página e refaça esta autorização.` }, { status: 400 });
  }
  const result = new NextResponse("<main style='font-family:Arial;padding:48px;max-width:650px'><h1>Conta Instagram autorizada</h1><p>O Radar Social está conectado. Volte ao Prospex para analisar um perfil comercial.</p></main>", { headers: { "content-type": "text/html; charset=utf-8" } });
  result.cookies.set("prospex_meta_token", tokenPayload.access_token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 24 * 60 * 60, path: "/" });
  result.cookies.set("prospex_meta_ig_account", instagramAccountId, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 24 * 60 * 60, path: "/" });
  return result;
}
