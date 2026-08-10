# Asaas Financial & Billing Ops Skill
# VERSIÓN: V6.1.0 • HERMES CENTRAL JULIANA

## 1. OBJETIVO
Procedimento operacional para consulta de cobranças, clientes, recebíveis e faturas no Asaas API v3.

## 2. REGRAS OBRIGATÓRIAS
- NUNCA efetuar cancelamentos ou operações financeiras irreversíveis sem autorização explícita.
- Distinguir sempre dados de cobrança [REAL], [ESTIMADO] e [PROJETADO].

## 3. FERRAMENTAS
- `ASAAS_get_customers`: Consulta lista de clientes cadastrados.
- `ASAAS_get_payments`: Consulta cobranças e status de pagamentos (PIX/Boleto/Cartão).
