# Manual de Documentação Técnica, Procedures e Specs de APIs dos Conectores — Hermes Central

---

## 📌 Diretriz Geral de Execução (Mandatória)
> **REGRA DE OURO**: Antes de executar qualquer ação, requisição HTTP, mutação ou automação em qualquer conector do ecossistema, o Agente Hermes Central (Juliana) DEVE consultar este documento de especificações, verificar se as chaves estão ativas no Vault e utilizar os procedimentos padrão descritos abaixo.

---

## 1. ClickUp API v2 (Gestão de Projetos e Tarefas)
- **Base URL**: `https://api.clickup.com/api/v2`
- **Autenticação**: Header `Authorization: <API_KEY>` (Chave no Vault: `clickup`)
- **Team ID Padrão**: `90133016156` (W Soluções Tecnologia LTDA)
- **Procedimentos de Chamada**:
  1. **Listar Espaços / Pastas**: `GET /team/{team_id}/space`
  2. **Listar Tarefas**: `GET /list/{list_id}/task?archived=false&subtasks=true`
  3. **Criar Tarefa**: `POST /list/{list_id}/task`
     ```json
     {
       "name": "Nome da Tarefa",
       "description": "Detalhamento e instrução executiva",
       "status": "to do",
       "priority": 2
     }
     ```
  4. **Atualizar Tarefa**: `PUT /task/{task_id}`
- **Tratamento de Erros**: Se HTTP 401/403, verificar se o token do Vault expirou; se 404, confirmar o ID da lista/espaço.

---

## 2. OpenRouter LLM API (Motor Inteligente Multi-Modelo)
- **Base URL**: `https://openrouter.ai/api/v1`
- **Autenticação**: Header `Authorization: Bearer <OPENROUTER_KEY>`
- **Headers Adicionais Obrigatórios**:
  - `HTTP-Referer: https://juliana.axionenterprise.cloud/`
  - `X-Title: Hermes Central Juliana`
- **Modelos Disponíveis**:
  - `openai/gpt-4o` (Raciocínio Pesado / Auditoria de Código e Arquitetura)
  - `openai/gpt-4o-mini` (Velocidade & Precisão Média <500ms)
  - `openrouter/auto` (Roteamento Automático de Fallback)
- **Procedimento de Resiliência**: Tentar modelo primário -> Se falhar ou expirar tempo, efetuar fallback gracioso mantendo o contexto.

---

## 3. Asaas API v3 (Cobranças & Gestão Financeira)
- **Base URL**: `https://www.asaas.com/api/v3`
- **Autenticação**: Header `access_token: $aact_...` (Chave no Vault: `asaas`)
- **Procedimentos**:
  1. **Listar / Buscar Clientes**: `GET /customers?cpfCnpj={cpf_cnpj}`
  2. **Criar Cobrança PIX / Boleto**: `POST /payments`
     ```json
     {
       "customer": "cus_000005011018",
       "billingType": "PIX",
       "value": 150.00,
       "dueDate": "2026-08-10"
     }
     ```
  3. **Obter QR Code PIX**: `GET /payments/{payment_id}/pixQrCode`
- **Segurança**: Operações de cancelamento ou estorno exigem autorização nível 3 da Juliana.

---

## 4. Telegram Bot API (Comunicação & Alertas)
- **Base URL**: `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>`
- **Autenticação**: Token no caminho da URL
- **Procedimentos**:
  1. **Enviar Mensagem Formatada**: `POST /sendMessage`
     ```json
     {
       "chat_id": "<CHAT_ID>",
       "text": "*[HERMES CENTRAL]* Alerta de Sistema executado com sucesso.",
       "parse_mode": "MarkdownV2"
     }
     ```
  2. **Enviar Documento / Relatório PDF**: `POST /sendDocument` (Multipart/form-data)

---

## 5. WhatsApp Baileys Engine (Comunicação Omnichannel)
- **Base URL**: `http://179.197.237.20:8080` (VPS Internal Bridge)
- **Autenticação**: Header `apikey: <EVOLUTION_GLOBAL_KEY>`
- **Procedimentos**:
  1. **Status da Sessão**: `GET /instance/fetchInstances`
  2. **Enviar Texto**: `POST /message/sendText/{instance}`
     ```json
     {
       "number": "5511991284421",
       "text": "Mensagem da Hermes Central Juliana"
     }
     ```
  3. **Streaming QR Code**: Inspecionar via WebSocket `/ws` para pareamento em tempo real.

---

## 6. Meta Ads Graph API v19.0 (Gestão de Mídia & Tráfego Pago)
- **Base URL**: `https://graph.facebook.com/v19.0`
- **Autenticação**: `access_token=<META_ACCESS_TOKEN>`
- **Procedimentos**:
  1. **Consultar Campanhas**: `GET /{act_account_id}/campaigns?fields=id,name,status,daily_budget`
  2. **Atualizar Orçamento / Status**: `POST /{campaign_id}` (Campos: `status`, `daily_budget`)
  3. **Consultar Métricas de Desempenho**: `GET /{act_account_id}/insights?date_preset=lifetime&fields=impressions,clicks,spend,cpc,ctr`

---

## 7. Authentique GraphQL API (Assinatura Eletrônica)
- **Base URL**: `https://api.authentique.com.br/v2/graphql`
- **Autenticação**: Header `Authorization: Bearer <AUTHENTIQUE_KEY>`
- **Procedimentos**:
  1. **Enviar Minuta de Contrato**: Executar `mutation createDocument` com arquivo PDF em Base64 e lista de signatários.

---

## 📝 Check-list Obrigatório Pré-Execução
- [ ] O token correspondente foi verificado no Vault?
- [ ] A documentação do conector acima foi consultada para validar o endpoint e payload?
- [ ] O modelo de IA selecionado é adequado ao peso da tarefa?
- [ ] A resposta factual da ação foi registrada e salva no histórico do PostgreSQL?
