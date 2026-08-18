import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json() as { email?: string };
  const allowed = process.env.PROSPEX_ALLOWED_EMAIL?.trim().toLowerCase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!email || !url || !key) return NextResponse.json({ error: "O acesso seguro ainda não foi configurado." }, { status: 503 });
  if (allowed && email.trim().toLowerCase() !== allowed) return NextResponse.json({ error: "Use o e-mail autorizado para o Prospex." }, { status: 403 });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: new URL(request.url).origin } });
  return error ? NextResponse.json({ error: "Não foi possível enviar o acesso seguro." }, { status: 400 }) : NextResponse.json({ ok: true });
}
