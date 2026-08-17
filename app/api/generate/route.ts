import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "A geração requer OPENAI_API_KEY configurada no ambiente." }, { status: 503 });
  try {
    const { lead, briefing, channel } = await request.json();
    if (!lead?.name || !["whatsapp", "email", "pitch"].includes(channel)) return NextResponse.json({ error: "Dados de abordagem inválidos." }, { status: 400 });
    const prompt = `Você é um consultor comercial brasileiro de marketing B2B. Crie um rascunho de ${channel} para a empresa abaixo. Oferta: marketing completo (estratégia, tráfego, conteúdo, CRM e automações). Use somente informações fornecidas, não invente resultados, pessoas, e-mail ou dados pessoais. Seja direto, respeitoso, específico e finalize com o CTA.\nEmpresa: ${lead.name}; segmento: ${lead.category}; cidade/endereço: ${lead.address}; site: ${lead.website || "não informado"}.\nPúblico: ${briefing.audience || "não informado"}. Diferenciais: ${briefing.differentiators || "não informado"}. Prova social: ${briefing.proof || "não informado"}. CTA: ${briefing.cta || "Agendar uma conversa"}.\nNão prometa contato automático. Retorne apenas o texto pronto para revisão humana.`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", input: prompt, max_output_tokens: 500 }) });
    if (!response.ok) return NextResponse.json({ error: "Não foi possível gerar a abordagem agora." }, { status: response.status });
    const payload = await response.json() as { output_text?: string };
    return NextResponse.json({ text: payload.output_text ?? "Não foi gerado um texto. Tente novamente." });
  } catch { return NextResponse.json({ error: "Não foi possível processar a solicitação." }, { status: 500 }); }
}
