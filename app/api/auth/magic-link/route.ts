import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  const configuredEmails = process.env.PROSPEX_ALLOWED_EMAILS || process.env.PROSPEX_ALLOWED_EMAIL || "alefotografo@alefotografo.com.br,comercial@alefotografo.com.br";
  const allowed = configuredEmails.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!email || !url || !key) return NextResponse.json({ error: "O acesso seguro ainda não foi configurado." }, { status: 503 });
  if (allowed.length > 0 && !allowed.includes(email.trim().toLowerCase())) return NextResponse.json({ error: "Use um e-mail autorizado para o Prospex." }, { status: 403 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: new URL(request.url).origin } });
  return error ? NextResponse.json({ error: "Não foi possível enviar o acesso seguro." }, { status: 400 }) : NextResponse.json({ ok: true });
}
