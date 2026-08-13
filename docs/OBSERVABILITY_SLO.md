# Observabilidade e SLO — Hermes Juliana

## SLOs

- Disponibilidade mensal do chat: 99,5%.
- Respostas HTTP sem erro 5xx: 99,0% em janela móvel de 30 dias.
- Latência p95 do gateway sem execução de ferramenta: até 5 segundos.
- Tarefas duráveis: 99,9% terminam em `succeeded`, `failed`, `cancelled` ou `unknown` reconciliável.
- Reconexão WebSocket: até 15 segundos.
- O gateway de eventos é um processo independente em `:8001`, usa Redis Pub/Sub e entrega eventos somente à sessão autenticada inscrita.
- Ferramentas executam em processos efêmeros isolados, com bulkhead padrão de quatro workers, timeout e limite de 1 MiB por saída.

## Error budget

Disponibilidade de 99,5% permite aproximadamente 3h39m de indisponibilidade em 30 dias. Ao consumir 50% do orçamento, releases não críticos são suspensos; em 100%, somente correções de confiabilidade podem ser publicadas.

## Correlação e retenção

Toda resposta HTTP inclui `X-Request-Id`. Logs JSON contêm `timestamp`, `level`, `service`, `trace_id`, rota, status e duração. Segredos conhecidos são redigidos. Os arquivos JSONL ficam em `HISTORY/audit/logs`, dentro do volume persistente `hermes_audit`, sobrevivendo à recriação do gateway.

## Alertas

O workflow `Hermes Juliana production monitor` executa smoke público periódico. Falhas criam uma issue GitHub com label `healthcheck`; uma única issue aberta é reutilizada para evitar tempestade de alertas. O modo manual `simulate_failure` valida o canal sem derrubar produção.

## Resposta

1. Confirmar corpo de `/healthz`, não apenas HTTP status.
2. Correlacionar `X-Request-Id` com o arquivo JSONL.
3. Consultar `/api/v1/observability/metrics` com sessão administrativa.
4. Verificar tarefas `running`/`unknown` e seus eventos.
5. Registrar impacto, recuperação e ação preventiva na timeline.
