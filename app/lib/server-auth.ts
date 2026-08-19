import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function requireProspexUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return { error: NextResponse.json({ error: "Faça login para usar esta função." }, { status: 401 }) };
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  const configuredEmails = process.env.PROSPEX_ALLOWED_EMAILS || process.env.PROSPEX_ALLOWED_EMAIL || "alefotografo@alefotografo.com.br,comercial@alefotografo.com.br";
  const allowed = configuredEmails.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (error || !user || (allowed.length > 0 && !allowed.includes(user.email?.toLowerCase() || ""))) return { error: NextResponse.json({ error: "Este acesso não está autorizado." }, { status: 403 }) };
  return { user };
}
