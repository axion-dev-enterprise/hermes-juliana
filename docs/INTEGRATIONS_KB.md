# Base de Conhecimento de Integrações — Hermes Central (Juliana / W Soluções)

Esta Base de Conhecimento unificada consolida as especificações técnicas, autenticação, endpoints, payloads de exemplo e regras operacionais de todas as integrações atualmente disponíveis no ecossistema Hermes Central v4.2.0.

---

## 1. Asaas API v3 (Financeiro & Cobranças)
- **Base URL**: `https://www.asaas.com/api/v3`
- **Autenticação**: Header `access_token: $aact_...`
- **Principais Endpoints**:
  - `POST /customers`: Cadastro de clientes
  - `POST /payments`: Geração de cobranças (PIX, Boleto, Cartão de Crédito)
  - `GET /payments/{id}/pixQrCode`: Obtenção de payload EMV PIX e QR Code Base64
  - `GET /subscriptions`: Gestão de assinaturas recorrentes
- **Webhooks**: Notificações IPN no endpoint `POST /api/v1/webhooks/asaas` (eventos: `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`).

---

## 2. ClickUp API v2 (Gestão de Projetos & Tarefas)
- **Base URL**: `https://api.clickup.com/api/v2`
- **Autenticação**: Header `Authorization: pk_...`
- **Principais Endpoints**:
  - `GET /team/{team_id}/space`: Listagem de espaços
  - `POST /list/{list_id}/task`: Criação de tarefa
  - `PUT /task/{task_id}`: Atualização de status e responsável
  - `POST /task/{task_id}/time`: Registro de horas gastas (Time Tracking)
- **Regras Operacionais**: Agente verifica tarefas sem responsável ou com prazo vencido e envia lembrete no WhatsApp às 09:00 e 16:00.

---

## 3. Authentique GraphQL API (Assinatura Digital de Contratos)
- **Base URL**: `https://api.authentique.com.br/v2/graphql`
- **Autenticação**: Header `Authorization: Bearer <TOKEN>`
- **Operações GraphQL**:
  - `mutation createDocument`: Envio de PDF para assinatura com mapeamento de signatários
  - `query getDocument`: Verificação do status de assinatura
- **Regras Operacionais**: Envio de minutas finais exige aprovação prévia no Modo Executivo.

---

## 4. Meta Ads Graph API v19.0 (Gestão de Anúncios & Tráfego)
- **Base URL**: `https://graph.facebook.com/v19.0`
- **Autenticação**: `access_token=EAAU_...`
- **Principais Endpoints**:
  - `GET /{act_account_id}/campaigns`: Consulta de campanhas ativas
  - `POST /{act_account_id}/campaigns`: Mutações de orçamento e status (exige aprovação Nível 3)
  - `GET /{act_account_id}/insights`: Relatórios de ROI, CTR, CPC e conversões

---

## 5. WhatsApp Baileys Engine / Evolution API
- **Base URL**: `http://179.197.237.20:8080` (Internal VPS Bridge)
- **Autenticação**: Header `apikey: EVOLUTION_GLOBAL_KEY`
- **Capacidades**:
  - Envio de texto, áudios convertidos em Opus, arquivos PDF e imagens
  - Captura e streaming de QR Code via WebSocket
  - Recebimento e processamento proativo de mensagens recebidas.

---

## 6. Telegram Bot API
- **Base URL**: `https://api.telegram.org/bot<TOKEN>`
- **Endpoints**:
  - `POST /sendMessage`: Envio de notificações formatadas (MarkdownV2 / HTML)
  - `POST /sendDocument`: Envio de propostas e relatórios executivos

---

## 7. Banco Inter API v3
- **Base URL**: `https://cdpj.banks.gnei.com.br`
- **Autenticação**: Certificado mTLS (`inter.crt` e `inter.key`) + OAuth2 Client Credentials.

---

## 8. AssemblyAI API (Transcrição de Áudios & Reuniões)
- **Base URL**: `https://api.assemblyai.com/v2`
- **Autenticação**: Header `authorization: <ASSEMBLYAI_KEY>`
- **Uso**: Transcrição automática de áudios de clientes enviados no WhatsApp e sumarização de reuniões do Google Meet.

---

## 9. Canva & Workana APIs
- **Workana**: Captura de propostas de serviços e monitoramento de novos projetos.
- **Canva**: Automação de criativos de redes sociais e propostas visuais.
