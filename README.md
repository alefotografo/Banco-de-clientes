# Prospex B2B

Ferramenta interna de prospecção regional para times comerciais. Pesquisa empresas em fontes públicas autorizadas, organiza um pipeline e cria rascunhos comerciais para revisão humana.

## Proteção de dados

- A busca usa somente Google Places, por API autorizada.
- A aplicação não faz raspagem de sites, LinkedIn ou redes sociais.
- Registre pessoas de RH ou marketing somente quando a própria empresa as divulgar oficialmente e houver finalidade comercial legítima.
- A geração produz rascunhos; não há envio automático de WhatsApp, e-mail ou qualquer outro canal.

## Configuração

1. Copie `.env.example` para `.env.local` e preencha as variáveis.
2. No Google Cloud, habilite **Places API (New)**, restrinja a chave ao projeto/ambiente e mantenha o faturamento configurado.
3. Crie e confirme um projeto Supabase de desenvolvimento antes de executar, em ordem, as migrações da pasta `supabase/migrations/`. Em **Authentication > URL Configuration**, adicione a URL local e a URL final do Vercel como URLs de redirecionamento.
4. Configure `OPENAI_API_KEY` somente no ambiente do servidor. Opcionalmente defina `OPENAI_MODEL`.
5. Para controlar o acesso do time, defina `PROSPEX_ALLOWED_EMAILS` com os e-mails autorizados separados por vírgula. Exemplo: `comercial@empresa.com,gestor@empresa.com`. O nome legado `PROSPEX_ALLOWED_EMAIL` continua compatível com um único e-mail.
6. Instale dependências e rode `npm run dev`.

## Deploy no Vercel

Importe o repositório no Vercel, cadastre as mesmas variáveis de ambiente (sem o prefixo `NEXT_PUBLIC_` para chaves secretas) e faça o deploy. `GOOGLE_MAPS_API_KEY` e `OPENAI_API_KEY` jamais devem ser expostas ao navegador.

## Estado atual

Ao configurar Google Places e OpenAI, a busca e a geração passam a funcionar pelos endpoints de servidor. Com as chaves públicas do Supabase, o acesso é feito por magic link e cada membro autorizado visualiza somente o próprio pipeline, protegido por RLS.
