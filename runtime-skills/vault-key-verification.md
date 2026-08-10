# Vault Key Verification & Health Audit Procedural Skill
# VERSIÓN: V6.2.0 • HERMES CENTRAL JULIANA

## 1. OBJETIVO
Procedimento autônomo e persistente para leitura, salvamento e auditoria empírica de credenciais armazenadas no PostgreSQL Vault (`api_vault`).

## 2. REGRAS OBRIGATÓRIAS DE PERSISTÊNCIA
- Sempre que o usuário enviar uma chave/token de API no prompt, invocar IMEDIATAMENTE `SAVE_VAULT_KEY`.
- Logo em seguida, invocar `TEST_VAULT_KEY` para testar a chave recém-salva contra os servidores reais do serviço (Vercel, GitHub, OpenRouter, ClickUp, Asaas, Telegram).
- NUNCA declarar que um teste falhou ou solicitar autorizações redundantes quando a chave estiver presente no Vault.
- Exibir relatórios factuais com o código HTTP de retorno (`HTTP 200 OK`) e o token devidamente mascarado (`vcp_...0kid`).

## 3. FERRAMENTAS
- `SAVE_VAULT_KEY`: Grava ou atualiza a credencial no Vault PostgreSQL `api_vault`.
- `TEST_VAULT_KEY`: Testa a chave diretamente na API correspondente.
- `GET_VAULT_STATUS`: Consulta a lista de credenciais configuradas no Vault.
