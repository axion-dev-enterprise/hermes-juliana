# DevOps VPS & Container Monitoring Skill
# VERSIÓN: V6.1.0 • HERMES CENTRAL JULIANA

## 1. OBJETIVO
Procedimento operacional para verificação de saúde da VPS principal (`179.197.237.20`), diagnóstico de containers Docker (`hermes-gateway`, `hermes-webchat`, `hermes-whatsapp-keeper`, `hermes-postgres`, `hermes-redis`), análise de carga de CPU, memória RAM e espaço em disco.

## 2. REGRAS OBRIGATÓRIAS
- Executar comandos de terminal shell reais via `EXECUTE_TERMINAL_COMMAND`.
- NUNCA inventar métricas fictícias de CPU/RAM ou status sintético de containers.
- Se um container apresentar restart recorrente, analisar os logs com `docker logs <container> --tail 50`.

## 3. FERRAMENTAS
- `EXECUTE_TERMINAL_COMMAND`: Comandos `docker ps`, `free -m`, `df -h`, `uptime`.
- `GET_SYSTEM_DIAGNOSTICS`: Retorna a telemetria do sistema e estado do banco de dados.
