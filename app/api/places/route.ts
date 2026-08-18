import { NextResponse } from "next/server";
import { requireProspexUser } from "../../lib/server-auth";

type Place = { id?: string; displayName?: { text?: string }; primaryTypeDisplayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string; internationalPhoneNumber?: string; websiteUri?: string };

function radarProfile(place: Place, segment: string) {
  let score = 35;
  if (place.websiteUri) score += 15;
  if (place.internationalPhoneNumber || place.nationalPhoneNumber) score += 15;
  const visualTerms = /restaurante|hotel|pousada|clínica|odont|imobili|arquitet|salão|beleza|academia|evento|buffet|moda|loja|veículo|auto|turismo|gastron/i;
  const text = `${segment} ${place.primaryTypeDisplayName?.text || ""} ${place.displayName?.text || ""}`;
  if (visualTerms.test(text)) score += 25;
  const priority = score >= 75 ? "alto potencial para foto e vídeo" : score >= 55 ? "potencial a qualificar" : "avaliar presença digital";
  return { score: Math.min(100, score), priority, needsSocialAnalysis: true, summary: `${priority}. Próximo passo: confirmar o Instagram comercial e analisar a frequência de conteúdo.` };
}

export async function POST(request: Request) {
  const auth = await requireProspexUser(request);
  if (auth.error) return auth.error;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "A busca real requer GOOGLE_MAPS_API_KEY configurada no ambiente." }, { status: 503 });
  try {
    const input = await request.json() as { city?: string; neighborhood?: string; segment?: string; radius?: string };
    if (!input.city?.trim() || !input.segment?.trim()) return NextResponse.json({ error: "Cidade e segmento são obrigatórios." }, { status: 400 });
    const location = [input.neighborhood, input.city, "Brasil"].filter(Boolean).join(", ");
    const geocode = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${encodeURIComponent(key)}`);
    const geo = await geocode.json() as { results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }> };
    const point = geo.results?.[0]?.geometry?.location;
    const locationBias = point ? { circle: { center: point, radius: Math.min(Math.max(Number(input.radius) || 5000, 100), 50000) } } : undefined;
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri" },
      body: JSON.stringify({ textQuery: `${input.segment} em ${location}`, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 20, locationBias }),
    });
    if (!response.ok) return NextResponse.json({ error: "A fonte de busca recusou a solicitação. Verifique a chave e o faturamento do Google Places." }, { status: response.status });
    const payload = await response.json() as { places?: Place[] };
    const seen = new Set<string>();
    const leads = (payload.places ?? []).filter((place) => place.id && !seen.has(place.id) && Boolean(seen.add(place.id))).map((place) => ({ id: `place-${place.id}`, placeId: place.id, name: place.displayName?.text ?? "Empresa sem nome", category: place.primaryTypeDisplayName?.text ?? "Não informado", address: place.formattedAddress ?? "Não informado", phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber, website: place.websiteUri, radar: radarProfile(place, input.segment || "") }));
    const highPotential = leads.filter((lead) => lead.radar.score >= 75).length;
    return NextResponse.json({ leads, radar: { area: location, total: leads.length, highPotential, nextStep: "Analise o Instagram oficial apenas dos leads prioritários para medir frequência de conteúdo." } });
  } catch { return NextResponse.json({ error: "Não foi possível processar a busca." }, { status: 500 }); }
}
