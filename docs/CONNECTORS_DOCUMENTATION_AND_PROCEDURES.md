# Manual de Documentação Técnica, Procedures e Specs de APIs dos Conectores — Hermes Central

---

## 📌 Diretriz Geral de Execução (Mandatória)
> **REGRA DE OURO**: Antes de executar qualquer ação, requisição HTTP, mutação ou automação em qualquer conector do ecossistema, o Agente Hermes Central (Juliana) DEVE consultar este documento de especificações, verificar se as chaves estão ativas no Vault e utilizar os procedimentos padrão descritos abaixo.
> **ZERO-HALLUCINATION**: Nunca informe que apenas o ClickUp possui documentação. O ecossistema AXION possui **60+ conectores oficiais** mapeados e prontos para integração via Vault.

---

## 🤖 1. IA & LLM (Inteligência Artificial)
- **Nous Portal (Inference Primary)**: `https://inference-api.nousresearch.com/v1/chat/completions` | Header `Authorization: Bearer <NOUS_KEY>` | Provedor primário de inferência de modelos abertos.
- **OpenRouter (Multi-LLM Gateway)**: `https://openrouter.ai/api/v1` | Header `Authorization: Bearer <OPENROUTER_KEY>` | Roteamento multi-modelo (GPT-4o, Claude 3.5, Gemini 2.0).
- **OpenAI API**: `https://api.openai.com/v1` | Header `Authorization: Bearer <OPENAI_KEY>` | GPT-4o, DALL-E 3, Whisper, Embeddings text-embedding-3.
- **Anthropic API**: `https://api.anthropic.com/v1` | Header `x-api-key: <ANTHROPIC_KEY>` | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3.5 Haiku.
- **Google Gemini API**: `https://generativelanguage.googleapis.com/v1beta` | API Key / OAuth | Gemini 1.5 Pro, Gemini 2.0 Flash.
- **Groq API**: `https://api.groq.com/openai/v1` | Header `Authorization: Bearer <GROQ_KEY>` | Llama 3.3 70B, Mixtral 8x7B (inferência ultra-rápida <200ms).
- **Perplexity AI API**: `https://api.perplexity.ai` | Header `Authorization: Bearer <PERPLEXITY_KEY>` | Busca em tempo real e modelos Sonar.
- **Mistral AI API**: `https://api.mistral.ai/v1` | Header `Authorization: Bearer <MISTRAL_KEY>` | Mistral Large, Codestral, Pixtral.
- **ElevenLabs TTS API**: `https://api.elevenlabs.io/v1` | Header `xi-api-key: <ELEVENLABS_KEY>` | Síntese e clonagem de voz executiva.

---

## 💼 2. Google Workspace
- **Google Workspace Admin SDK**: `https://admin.googleapis.com/admin/directory/v1` | OAuth 2.0 | Gestão de usuários, contas e unidades organizacionais.
- **Google OAuth 2.0 Gateway**: `https://oauth2.googleapis.com/token` | OAuth 2.0 | Autenticação unificada de tokens Google.
- **Google Sheets API v4**: `https://sheets.googleapis.com/v4/spreadsheets` | OAuth 2.0 / API Key | Leitura, escrita e atualização de células.
- **Google Drive API v3**: `https://www.googleapis.com/drive/v3` | OAuth 2.0 | Upload, busca e permissões de documentos.
- **Google Calendar API v3**: `https://www.googleapis.com/calendar/v3` | OAuth 2.0 | Agendamento executivo e criação de reuniões Google Meet.
- **Gmail API**: `https://gmail.googleapis.com/gmail/v1` | OAuth 2.0 | Envio, leitura e rascunhos de e-mails corporativos.
- **Google Ads API v16**: `https://googleads.googleapis.com/v16` | OAuth 2.0 + Developer Token | Campanhas, ad groups e orçamento do Google Ads.
- **Google Analytics 4 (GA4)**: `https://analyticsdata.googleapis.com/v1beta` | OAuth 2.0 | Métricas de tráfego, audiência e conversões em tempo real.
- **Firebase / Firestore**: `https://firestore.googleapis.com/v1` | Service Account | Banco de dados NoSQL e autenticação mobile/web.

---

## 📣 3. Meta (Facebook / Instagram) & Comunicação Omnichannel
- **Meta Graph API v19.0**: `https://graph.facebook.com/v19.0` | Header `Authorization: Bearer <META_TOKEN>` | Plataforma central Meta.
- **Meta Ads / Marketing API**: `https://graph.facebook.com/v19.0/{act_id}/campaigns` | Access Token | Consulta e mutação real-time de orçamentos e status de campanhas.
- **WhatsApp Cloud API**: `https://graph.facebook.com/v19.0/{phone_number_id}/messages` | Access Token | Disparo de mensagens e templates de WhatsApp oficiais.
- **Instagram Graph API**: `https://graph.facebook.com/v19.0/{ig_user_id}` | Access Token | Publicação de mídias, Reels, stories e métricas do Instagram.
- **Meta Pixel / Conversions API (CAPI)**: `https://graph.facebook.com/v19.0/{pixel_id}/events` | Access Token | Envio de eventos server-side de conversão.
- **WhatsApp Baileys / Evolution Engine**: `http://179.197.237.20:8080` | Header `apikey: <EVOLUTION_KEY>` | Automação WhatsApp Web multi-instância (VPS local).
- **Telegram Bot API**: `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>` | Bot Token | Envio de mensagens formatadas Markdown, arquivos e alertas.
- **Slack Web API**: `https://slack.com/api` | Header `Authorization: Bearer <SLACK_TOKEN>` | Notificações em canais e DMs do Slack.
- **Discord API v10**: `https://discord.com/api/v10` | Header `Authorization: Bot <DISCORD_TOKEN>` | Webhooks e bots para servidores Discord.
- **Twilio API**: `https://api.twilio.com/2010-04-01` | Basic Auth | Envio de SMS, chamadas de voz e WhatsApp Twilio.
- **SendGrid Mail API v3**: `https://api.sendgrid.com/v3` | Header `Authorization: Bearer <SENDGRID_KEY>` | Disparo de e-mails transacionais e marketing.
- **Mailchimp Marketing API**: `https://{dc}.api.mailchimp.com/3.0` | API Key | Gestão de listas, audiências e campanhas de e-mail.
- **Brevo (Sendinblue) API**: `https://api.brevo.com/v3` | Header `api-key: <BREVO_KEY>` | Automações de e-mail e SMS.

---

## 💳 4. Financeiro, Cobrança & Contratos
- **Asaas API v3**: `https://www.asaas.com/api/v3` | Header `access_token: <ASAAS_KEY>` | Cobranças via PIX, Boleto, Cartão e assinaturas recorrentes.
- **Stripe API**: `https://api.stripe.com/v1` | Header `Authorization: Bearer <STRIPE_KEY>` | Pagamentos globais, assinaturas e Stripe Checkout.
- **Mercado Pago API**: `https://api.mercadopago.com` | Header `Authorization: Bearer <MP_KEY>` | Checkout transparente, PIX e MercadoPago.
- **Pagar.me API v5**: `https://api.pagar.me/core/v5` | Basic Auth | Processamento de cartão de crédito e conciliação bancária.
- **Iugu API v1**: `https://api.iugu.com/v1` | API Key | Faturamento recorrente e gestão de faturas.
- **Efí (Gerencianet) API**: `https://pix.api.efipay.com.br` | OAuth 2.0 + Certificado p12 | Emissão de chaves PIX e boletos registrados.
- **Authentique GraphQL API**: `https://api.authentique.com.br/v2/graphql` | Header `Authorization: Bearer <AUTHENTIQUE_KEY>` | Envio e acompanhamento de minutas para assinatura digital.

---

## 📂 5. Gestão, CRM & Operações
- **ClickUp API v2**: `https://api.clickup.com/api/v2` | Header `Authorization: <CLICKUP_KEY>` | Gestão de tarefas, listas, espaços, atribuição e tempo.
- **Notion API v1**: `https://api.notion.com/v1` | Header `Authorization: Bearer <NOTION_KEY>` | Leitura e inserção em bancos de dados e páginas Notion.
- **Trello REST API**: `https://api.trello.com/1` | Key + Token | Quadros, listas e cartões Kanban.
- **Jira Cloud API v3**: `https://{site}.atlassian.net/rest/api/3` | Basic Auth | Chamados, sprints e relatórios do Jira Software.
- **HubSpot API**: `https://api.hubapi.com` | Header `Authorization: Bearer <HUBSPOT_KEY>` | CRM de vendas, contatos, empresas e deals.
- **Pipedrive API v1**: `https://api.pipedrive.com/v1` | API Token | Pipeline comercial, atividades e funil de vendas.
- **RD Station Marketing API**: `https://api.rdstation.com/platform` | Header `Authorization: Bearer <RD_KEY>` | Automação de marketing e qualificação de leads.
- **Salesforce REST API v58.0**: `https://{instance}.salesforce.com/services/data/v58.0` | OAuth 2.0 | CRM de nível Enterprise.

---

## 🛠️ 6. DevOps, Cloud, Dados & Automação
- **GitHub REST API**: `https://api.github.com` | Header `Authorization: Bearer <GITHUB_KEY>` | Commits, arquivos, repositórios, issues e disparos de GitHub Actions.
- **Vercel REST API v9**: `https://api.vercel.com` | Header `Authorization: Bearer <VERCEL_KEY>` | Gestão de projetos canônicos, deploys, domínios e proteção SSO.
- **Cloudflare API v4**: `https://api.cloudflare.com/client/v4` | Header `Authorization: Bearer <CLOUDFLARE_KEY>` | Registros DNS (A/CNAME), SSL/TLS e purga global de cache.
- **AWS Cloud APIs**: `https://{service}.{region}.amazonaws.com` | SigV4 | S3, Lambda, EC2, DynamoDB, RDS.
- **Google Cloud Platform (GCP)**: `https://{service}.googleapis.com` | Service Account | BigQuery, Cloud Storage, Cloud Run, Vertex AI.
- **Azure REST API**: `https://management.azure.com` | OAuth 2.0 | Recursos de nuvem Microsoft Azure.
- **Supabase API**: `https://{ref}.supabase.co/rest/v1` | Header `apikey: <SUPABASE_ANON_OR_SERVICE>` | PostgreSQL relacional, Auth, Storage e RLS.
- **Railway API**: `https://backboard.railway.app/graphql` | Header `Authorization: Bearer <RAILWAY_KEY>` | Deploy e monitoramento de serviços em containers.
- **Sentry API v0**: `https://sentry.io/api/0` | Header `Authorization: Bearer <SENTRY_KEY>` | Captura de exceções e rastreamento de performance.
- **n8n API v1**: `https://{instance}/api/v1` | Header `X-N8N-API-KEY` | Disparo e ativação de workflows n8n.
- **Zapier Webhooks API**: `https://hooks.zapier.com/hooks/catch` | API Key / Webhook | Integrações e triggers com o ecossistema Zapier.
- **Make (Integromat) API v2**: `https://{region}.make.com/api/v2` | Header `Authorization: Token <MAKE_KEY>` | Execução e monitoramento de cenários do Make.

---

## 📈 7. Analytics, SEO & Comércio
- **Semrush API**: `https://api.semrush.com` | API Key | Relatórios de palavra-chave, backlinks e posicionamento no Google.
- **Ahrefs API v3**: `https://api.ahrefs.com/v3` | Header `Authorization: Bearer <AHREFS_KEY>` | Análise de concorrência e autoridade de domínio.
- **Hotjar API v1**: `https://api.hotjar.com/v1` | Header `Authorization: Bearer <HOTJAR_KEY>` | Análise de experiência do usuário e heatmaps.
- **Mixpanel API v2.0**: `https://mixpanel.com/api/2.0` | Basic Auth | Telemetria de produtos e análise de funil de conversão.
- **Amplitude HTTP API v2**: `https://api2.amplitude.com/2/httpapi` | API Key | Rastreamento de eventos comportamentais.
- **OpenWeather API**: `https://api.openweathermap.org/data/2.5` | API Key | Previsão do tempo e dados climáticos em tempo real.
- **Google Maps Platform**: `https://maps.googleapis.com/maps/api` | API Key | Geocodificação, mapas e lugares.
- **Shopify Admin API**: `https://{shop}.myshopify.com/admin/api/2024-04` | Header `X-Shopify-Access-Token` | Produtos, pedidos e clientes e-commerce.
- **WooCommerce REST API v3**: `https://{shop}/wp-json/wc/v3` | Consumer Key/Secret | Gestão de lojas online WordPress/WooCommerce.

---

## 📝 Check-list Obrigatório de Execução do Agente
- [ ] Verificar se a chave do conector solicitado está configurada na tabela `api_vault`.
- [ ] Consultar as especificações de endpoint e autenticação nesta documentação oficial.
- [ ] Caso a solicitação do usuário refira-se às documentações do workspace ClickUp, listar tanto as documentações armazenadas no ClickUp quanto a documentação oficial dos **60+ conectores** do ecossistema AXION.
