import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type Media = { timestamp?: string };

export async function POST(request: Request) {
  const jar = await cookies();
  const token = process.env.META_IG_ACCESS_TOKEN || jar.get("prospex_meta_token")?.value;
  const accountId = process.env.META_IG_USER_ID || jar.get("prospex_meta_ig_account")?.value;
  if (!token || !accountId) return NextResponse.json({ error: "O Radar Social será ativado após conectar uma conta profissional do Instagram no painel Meta." }, { status: 503 });
  try {
    const { username } = await request.json() as { username?: string };
    if (!username?.trim()) return NextResponse.json({ error: "Informe o perfil comercial." }, { status: 400 });
    const fields = `business_discovery.username(${username.replace(/[^a-zA-Z0-9._]/g, "")}){username,media_count,media.limit(25){timestamp}}`;
    const response = await fetch(`https://graph.facebook.com/v25.0/${accountId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`);
    const data = await response.json() as { business_discovery?: { username?: string; media?: { data?: Media[] } }; error?: { message?: string } };
    if (!response.ok || !data.business_discovery) return NextResponse.json({ error: data.error?.message || "O perfil não pôde ser consultado pela API oficial." }, { status: response.status || 502 });
    const media = data.business_discovery.media?.data ?? [];
    const now = Date.now(); const days = (value?: string) => value ? (now - new Date(value).getTime()) / 86400000 : Infinity;
    const posts30 = media.filter((item) => days(item.timestamp) <= 30).length;
    const posts90 = media.filter((item) => days(item.timestamp) <= 90).length;
    const lastPublishedAt = media[0]?.timestamp;
    const inactive = days(lastPublishedAt) > 30;
    const score = Math.min(100, (inactive ? 55 : 20) + (posts30 < 4 ? 25 : 5) + (posts90 < 12 ? 20 : 5));
    const signal = inactive ? "perfil sem publicação recente" : posts30 < 4 ? "frequência baixa de conteúdo" : "presença ativa";
    const note = inactive ? "Boa oportunidade para propor calendário editorial, tráfego e reativação de audiência." : posts30 < 4 ? "Há espaço para aumentar consistência e transformar conteúdo em geração de demanda." : "A empresa já produz conteúdo; priorize uma oferta de performance, CRM ou conversão.";
    return NextResponse.json({ report: { username: data.business_discovery.username || username, lastPublishedAt, posts30, posts90, score, signal, note } });
  } catch { return NextResponse.json({ error: "Não foi possível concluir a análise social." }, { status: 500 }); }
}
