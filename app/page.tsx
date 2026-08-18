"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Status = "novo" | "em análise" | "contatado" | "reunião" | "proposta" | "ganho" | "perdido";
type Lead = { id: string; placeId?: string; name: string; category: string; address: string; phone?: string; website?: string; email?: string; whatsapp?: string; contactName?: string; contactRole?: string; contactSource?: string; status: Status; notes: string; source: string; updatedAt: string };
type Approach = { id: string; channel: string; content: string; createdAt: string };
type SocialReport = { username: string; lastPublishedAt?: string; posts30: number; posts90: number; score: number; signal: string; note: string };
const statuses: Status[] = ["novo", "em análise", "contatado", "reunião", "proposta", "ganho", "perdido"];
export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState({ city: "", neighborhood: "", segment: "", radius: "5000" });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Entre com seu e-mail autorizado para acessar sua central de prospecção.");
  const [filter, setFilter] = useState<Status | "todos">("todos");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [briefing, setBriefing] = useState({ audience: "", differentiators: "", proof: "", cta: "Agendar uma conversa de diagnóstico" });
  const [channel, setChannel] = useState("whatsapp");
  const [copy, setCopy] = useState("");
  const [generating, setGenerating] = useState(false);
  const [approaches, setApproaches] = useState<Approach[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [listNotice, setListNotice] = useState("");
  const [socialReports, setSocialReports] = useState<Record<string, SocialReport>>({});
  const [instagramHandle, setInstagramHandle] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");

  const visible = useMemo(() => filter === "todos" ? leads : leads.filter((lead) => lead.status === filter), [filter, leads]);
  const authHeaders = useMemo(() => session ? { authorization: `Bearer ${session.access_token}` } : {}, [session]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    supabase.from("prospex_leads").select("*").order("priority_score", { ascending: false }).then(({ data, error }) => {
      if (error) return setNotice("Não foi possível carregar o pipeline salvo.");
      if (data) setLeads(data.map((lead) => ({ id: lead.id, placeId: lead.place_id || undefined, name: lead.name, category: lead.category || "Não informado", address: lead.address || "Não informado", phone: lead.phone || undefined, website: lead.website || undefined, email: lead.email || undefined, whatsapp: lead.whatsapp || undefined, contactName: lead.contact_name || undefined, contactRole: lead.contact_role || undefined, contactSource: lead.contact_source || undefined, status: lead.status as Status, notes: lead.notes || "", source: lead.source, updatedAt: lead.updated_at })));
      setNotice("Pipeline sincronizado com segurança.");
    });
  }, [session]);

  function rowFor(lead: Lead) {
    return { id: lead.id.startsWith("place-") ? undefined : lead.id, user_id: session?.user.id, place_id: lead.placeId || null, name: lead.name, category: lead.category, address: lead.address, phone: lead.phone || null, website: lead.website || null, email: lead.email || null, whatsapp: lead.whatsapp || null, contact_name: lead.contactName || null, contact_role: lead.contactRole || null, contact_source: lead.contactSource || null, status: lead.status, notes: lead.notes, source: lead.source, updated_at: new Date().toISOString() };
  }

  async function persist(leadsToSave: Lead[]) {
    if (!supabase || !session || leadsToSave.length === 0) return;
    const { error } = await supabase.from("prospex_leads").upsert(leadsToSave.map(rowFor), { onConflict: "user_id,place_id" });
    if (error) setNotice("O lead foi exibido, mas não pôde ser salvo no pipeline.");
  }

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/magic-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const body = await response.json();
    setAuthNotice(response.ok ? "Enviamos um link de acesso para seu e-mail." : body.error || "Não foi possível enviar o acesso.");
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!session) return setNotice("Entre com seu e-mail autorizado para pesquisar empresas.");
    if (!query.city || !query.segment) return setNotice("Informe ao menos cidade e segmento para iniciar a busca.");
    setLoading(true); setNotice("Consultando fontes públicas autorizadas…");
    try {
      const response = await fetch("/api/places", { method: "POST", headers: { "content-type": "application/json", ...authHeaders }, body: JSON.stringify(query) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível concluir a busca.");
      const found: Lead[] = body.leads.map((lead: Omit<Lead, "status" | "notes" | "source" | "updatedAt">) => ({ ...lead, status: "novo", notes: "", source: "Google Places", updatedAt: new Date().toISOString() }));
      const newLeads = found.filter((item) => !leads.some((lead) => lead.placeId && lead.placeId === item.placeId));
      setLeads((current) => [...newLeads, ...current]);
      await persist(newLeads);
      setNotice(`${found.length} empresas encontradas. Revise e salve somente as oportunidades relevantes.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha na busca."); } finally { setLoading(false); }
  }

  async function createCopy() {
    if (!selected || !session) return setCopy("Entre com seu e-mail autorizado para gerar uma abordagem.");
    setGenerating(true); setCopy("");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json", ...authHeaders }, body: JSON.stringify({ lead: selected, briefing, channel }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Não foi possível gerar a abordagem."); setCopy(body.text);
      if (supabase && session) {
        let leadId = selected.id;
        if (leadId.startsWith("place-")) {
          const { data: savedLead, error: saveError } = await supabase.from("prospex_leads").upsert(rowFor(selected), { onConflict: "user_id,place_id" }).select("id").single();
          if (saveError || !savedLead) throw new Error("A mensagem foi criada, mas o lead não pôde ser salvo no histórico.");
          leadId = savedLead.id;
          const synced = { ...selected, id: leadId };
          setSelected(synced); setLeads((current) => current.map((lead) => lead.id === selected.id ? synced : lead));
        }
        const { data: savedApproach, error: approachError } = await supabase.from("prospex_approaches").insert({ user_id: session.user.id, lead_id: leadId, channel, briefing, content: body.text }).select("id,channel,content,created_at").single();
        if (approachError) throw new Error("A mensagem foi criada, mas não pôde ser salva no histórico.");
        setApproaches((current) => [{ id: savedApproach.id, channel: savedApproach.channel, content: savedApproach.content, createdAt: savedApproach.created_at }, ...current]);
      }
    } catch (error) { setCopy(error instanceof Error ? error.message : "Falha ao gerar o texto."); } finally { setGenerating(false); }
  }

  async function analyzeSocial() {
    if (!session) return setSocialNotice("Entre com seu e-mail autorizado para usar o Radar Social.");
    if (!selected || !instagramHandle.trim()) return setSocialNotice("Informe o @ do Instagram comercial para analisar.");
    setSocialLoading(true); setSocialNotice("");
    try {
      const response = await fetch("/api/social", { method: "POST", headers: { "content-type": "application/json", ...authHeaders }, body: JSON.stringify({ username: instagramHandle.replace(/^@/, "") }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível analisar o perfil.");
      setSocialReports((current) => ({ ...current, [selected.id]: body.report }));
      setSocialNotice("Radar atualizado com dados do perfil comercial.");
    } catch (error) { setSocialNotice(error instanceof Error ? error.message : "Falha ao analisar o perfil."); } finally { setSocialLoading(false); }
  }

  function exportCsv() {
    const rows = [["Empresa", "Segmento", "Endereço", "Telefone", "Site", "E-mail", "WhatsApp", "Status", "Origem", "Notas"], ...visible.map((l) => [l.name, l.category, l.address, l.phone || "", l.website || "", l.email || "", l.whatsapp || "", l.status, l.source, l.notes])];
    const safeCsv = (value: unknown) => { const text = String(value); return /^[=+\-@]/.test(text) ? `'${text}` : text; };
    const csv = rows.map((row) => row.map((value) => `"${safeCsv(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = "prospex-leads.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function updateStatus(lead: Lead, status: Status) {
    const changed = { ...lead, status, updatedAt: new Date().toISOString() };
    setLeads((current) => current.map((item) => item.id === lead.id ? changed : item));
    if (selected?.id === lead.id) setSelected(changed);
    void persist([changed]);
  }

  function updateNotes(lead: Lead, notes: string) {
    const changed = { ...lead, notes, updatedAt: new Date().toISOString() };
    setLeads((current) => current.map((item) => item.id === lead.id ? changed : item));
    if (selected?.id === lead.id) setSelected(changed);
    void persist([changed]);
  }

  function updateLead(lead: Lead, changes: Partial<Lead>) {
    const changed = { ...lead, ...changes, updatedAt: new Date().toISOString() };
    setLeads((current) => current.map((item) => item.id === lead.id ? changed : item));
    if (selected?.id === lead.id) setSelected(changed);
    void persist([changed]);
  }

  async function openLead(lead: Lead) {
    setSelected(lead); setCopy(""); setApproaches([]);
    if (!supabase || !session || lead.id.startsWith("place-")) return;
    const { data } = await supabase.from("prospex_approaches").select("id,channel,content,created_at").eq("lead_id", lead.id).order("created_at", { ascending: false }).limit(10);
    if (data) setApproaches(data.map((item) => ({ id: item.id, channel: item.channel, content: item.content, createdAt: item.created_at })));
  }

  function toggleLead(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function saveList() {
    if (!supabase || !session) return setListNotice("Entre para salvar uma lista.");
    const leadIds = selectedIds.filter((id) => !id.startsWith("place-"));
    if (!listName.trim() || leadIds.length === 0) return setListNotice("Dê um nome à lista e selecione ao menos um lead salvo.");
    const { data: list, error } = await supabase.from("prospex_lists").insert({ user_id: session.user.id, name: listName.trim() }).select("id").single();
    if (error || !list) return setListNotice("Não foi possível criar a lista.");
    const { error: itemError } = await supabase.from("prospex_list_items").insert(leadIds.map((leadId) => ({ list_id: list.id, lead_id: leadId })));
    if (itemError) return setListNotice("A lista foi criada, mas não foi possível incluir todos os leads.");
    setListNotice(`Lista “${listName.trim()}” salva com ${leadIds.length} leads.`); setListName(""); setSelectedIds([]);
  }

  return <main>
    <header className="topbar"><a className="brand" href="#top"><i>✦</i>PROSPEX</a><nav><a href="#buscar">Mapa de leads</a><a href="#pipeline">Pipeline</a><a href="#abordagem">Assistente IA</a></nav><div className="header-actions">{session ? <span className="account">● {session.user.email}</span> : <a className="login-link" href="#acesso">Acessar</a>}<button className="ghost" onClick={exportCsv}>Exportar lista</button></div></header>
    <section className="hero" id="top"><div><p className="eyebrow hero-eyebrow">SUA CENTRAL DE PROSPECÇÃO B2B</p><h1>Empresas certas.<br/><em>Conversas que avançam.</em></h1><p className="intro">Mapeie negócios da sua região, priorize oportunidades e crie abordagens de marketing completo com contexto real.</p><a className="hero-cta" href="#buscar">Encontrar empresas <span>→</span></a><p className="micro">Dados corporativos públicos · Sem envio automático</p></div><div className="hero-card"><div className="radar"><span/><span/><span/><b>●</b></div><b>RADAR COMERCIAL</b><strong>{leads.length} oportunidades<br/>no seu painel</strong><span>Busque por cidade, bairro, segmento ou distância.</span></div></section>
    <section className="benefits"><p className="eyebrow">O QUE MOVE A SUA PROSPECÇÃO</p><h2>Do primeiro mapa<br/>à primeira conversa.</h2><div className="benefit-grid"><article><span>01</span><h3>Busca local precisa</h3><p>Encontre negócios por região e segmento em fontes públicas autorizadas.</p></article><article><span>02</span><h3>Pipeline claro</h3><p>Organize, priorize e acompanhe cada oportunidade sem se perder em planilhas.</p></article><article><span>03</span><h3>IA para abordagem</h3><p>Transforme contexto em um ponto de partida comercial que ainda soa humano.</p></article></div></section>
    <section id="buscar" className="section"><div className="section-title"><p className="eyebrow">01 / MAPEAMENTO</p><h2>Onde estão seus próximos clientes?</h2></div><form className="search-card" onSubmit={search}><label>Cidade<input required placeholder="Ex.: Belo Horizonte" value={query.city} onChange={(e) => setQuery({...query, city:e.target.value})}/></label><label>Bairro <small>opcional</small><input placeholder="Ex.: Savassi" value={query.neighborhood} onChange={(e) => setQuery({...query, neighborhood:e.target.value})}/></label><label>Segmento<input required placeholder="Ex.: clínicas odontológicas" value={query.segment} onChange={(e) => setQuery({...query, segment:e.target.value})}/></label><label>Raio<select value={query.radius} onChange={(e) => setQuery({...query, radius:e.target.value})}><option value="2000">2 km</option><option value="5000">5 km</option><option value="10000">10 km</option><option value="20000">20 km</option></select></label><button className="primary" disabled={loading}>{loading ? "Buscando…" : "Buscar empresas"}</button></form><p className="notice">{notice}</p></section>
    <section id="pipeline" className="section pipeline"><div className="section-title"><p className="eyebrow">02 / QUALIFICAÇÃO</p><h2>Pipeline de oportunidades</h2></div>{!session && supabase && <div className="sync-tip">Entre para salvar seus leads, anotações e status com segurança.</div>}<div className="filters">{(["todos", ...statuses] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>{selectedIds.length > 0 && <div className="list-builder"><b>{selectedIds.length} leads selecionados</b><input value={listName} placeholder="Nome da lista" onChange={(event) => setListName(event.target.value)}/><button className="primary" onClick={() => void saveList()}>Salvar lista</button><small>{listNotice}</small></div>}<div className="lead-grid">{visible.map((lead) => <article className={`lead-card ${selectedIds.includes(lead.id) ? "is-selected" : ""}`} key={lead.id}><div className="lead-heading"><label className="lead-check"><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleLead(lead.id)}/><span className={`dot ${lead.status.replace(" ", "-")}`}/></label><small>{lead.category}</small></div><h3>{lead.name}</h3><p>{lead.address}</p><div className="contact">{lead.phone && <span>{lead.phone}</span>}{lead.website && <a href={lead.website} target="_blank" rel="noreferrer">Visitar site ↗</a>}</div><label className="lead-note">Nota de qualificação<textarea value={lead.notes} placeholder="Próxima ação, contexto ou objeção…" onChange={(event) => updateNotes(lead, event.target.value)}/></label><div className="card-foot"><select aria-label="Status do lead" value={lead.status} onChange={(e) => updateStatus(lead, e.target.value as Status)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button onClick={() => void openLead(lead)}>Criar abordagem →</button></div></article>)}</div></section>
    <section id="abordagem" className="section approach"><div className="section-title"><p className="eyebrow">03 / CONVERSA</p><h2>Abordagem que parece humana</h2><p>O agente cria um primeiro rascunho. Você revisa, adapta e escolhe quando e como contatar.</p></div><div className="approach-grid"><div className="briefing"><h3>Contexto da sua oferta</h3><label>Público-alvo<input placeholder="Ex.: decisores de empresas locais" value={briefing.audience} onChange={(e)=>setBriefing({...briefing,audience:e.target.value})}/></label><label>Diferenciais<textarea placeholder="Ex.: estratégia, mídia, conteúdo e CRM integrados" value={briefing.differentiators} onChange={(e)=>setBriefing({...briefing,differentiators:e.target.value})}/></label><label>Prova social<textarea placeholder="Resultados, cases ou experiência relevante" value={briefing.proof} onChange={(e)=>setBriefing({...briefing,proof:e.target.value})}/></label><label>CTA<input value={briefing.cta} onChange={(e)=>setBriefing({...briefing,cta:e.target.value})}/></label></div><div className="generator"><h3>{selected ? selected.name : "Selecione um lead"}</h3><p>{selected ? `${selected.category} · ${selected.address}` : "Escolha uma empresa no pipeline para personalizar a mensagem."}</p>{selected && <><div className="social-radar"><b>RADAR SOCIAL · Instagram comercial</b><div><input value={instagramHandle} placeholder="@perfil_da_empresa" onChange={(event) => setInstagramHandle(event.target.value)}/><button className="ghost" disabled={socialLoading} onClick={() => void analyzeSocial()}>{socialLoading ? "Analisando…" : "Analisar"}</button></div>{socialReports[selected.id] && <p><strong>Score {socialReports[selected.id].score}/100</strong> · {socialReports[selected.id].signal}<br/>{socialReports[selected.id].note}</p>}<small>{socialNotice || "Somente perfis comerciais. Sem mensagens, comentários ou disparos automáticos."}</small></div><div className="contact-editor"><b>Dados para contato</b><div><label>E-mail corporativo<input type="email" value={selected.email || ""} placeholder="contato@empresa.com" onChange={(event) => updateLead(selected, { email: event.target.value })}/></label><label>WhatsApp público<input value={selected.whatsapp || ""} placeholder="(00) 00000-0000" onChange={(event) => updateLead(selected, { whatsapp: event.target.value })}/></label></div><p>Contato individual: apenas se a empresa o divulgar oficialmente.</p><div><label>Nome profissional<input value={selected.contactName || ""} placeholder="Nome divulgado" onChange={(event) => updateLead(selected, { contactName: event.target.value })}/></label><label>Cargo<input value={selected.contactRole || ""} placeholder="Marketing, RH..." onChange={(event) => updateLead(selected, { contactRole: event.target.value })}/></label></div><label>Fonte oficial<input value={selected.contactSource || ""} placeholder="URL da página da empresa" onChange={(event) => updateLead(selected, { contactSource: event.target.value })}/></label></div></>}<div className="channels">{["whatsapp", "email", "pitch"].map((item) => <button key={item} className={channel === item ? "active" : ""} onClick={()=>setChannel(item)}>{item}</button>)}</div><button className="primary full" disabled={!selected || generating} onClick={createCopy}>{generating ? "Criando rascunho…" : "Gerar abordagem"}</button>{copy && <div className="copy"><textarea value={copy} onChange={(e)=>setCopy(e.target.value)}/><button className="ghost" onClick={() => navigator.clipboard.writeText(copy)}>Copiar texto</button></div>}{approaches.length > 0 && <div className="history"><b>Histórico salvo</b>{approaches.slice(0, 3).map((item) => <button key={item.id} onClick={() => setCopy(item.content)}>{item.channel} · {new Date(item.createdAt).toLocaleDateString("pt-BR")}</button>)}</div>}</div></div></section>
    <section className="access" id="acesso"><p className="eyebrow">ACESSO INDIVIDUAL</p><h2>Seu pipeline,<br/>sempre disponível.</h2><p>Receba um link seguro de acesso no e-mail. Sem senha para decorar.</p>{session ? <button className="ghost" onClick={() => supabase?.auth.signOut()}>Sair da conta</button> : <form onSubmit={sendMagicLink}><input type="email" required placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)}/><button className="primary">Enviar link de acesso</button></form>}<small>{authNotice}</small></section>
    <footer>Prospex B2B · Dados corporativos públicos · Sem automação de envio</footer>
  </main>;
}
