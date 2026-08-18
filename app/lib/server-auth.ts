import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function requireProspexUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return { error: NextResponse.json({ error: "Faça login para usar esta função." }, { status: 401 }) };
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  const allowed = process.env.PROSPEX_ALLOWED_EMAIL?.trim().toLowerCase();
  if (error || !user || (allowed && user.email?.toLowerCase() !== allowed)) return { error: NextResponse.json({ error: "Este acesso não está autorizado." }, { status: 403 }) };
  return { user };
}
