# Meta Ads Campaign Management Skill
# VERSIÓN: V6.1.0 • HERMES CENTRAL JULIANA

## 1. OBJETIVO
Procedimento operacional para auditoria, leitura e mutações em tempo real (alteração de status `ACTIVE`/`PAUSED`, edição de orçamento diário e renomeação de campanhas) na Meta Graph API v19.0 sem geração de dados mockados.

## 2. REGRAS OBRIGATÓRIAS (META GRAPH API v19.0)
- Toda mutação deve ser enviada diretamente aos servidores da Meta API (`https://graph.facebook.com/v19.0/{campaign_id}`).
- Isolar cache de dados em memória por BM/Portfólio (`portfolio_bm_${bmId}`).
- Utilizar token ativo do Vault registrado no serviço `meta`.

## 3. FERRAMENTAS
- `META_ADS_get_campaigns`: Lista campanhas ativas com orçamentos e impressões.
- `META_ADS_update_campaign_status`: Altera o status da campanha para `ACTIVE` ou `PAUSED`.
- `META_ADS_update_campaign_budget`: Atualiza o orçamento diário da campanha.
