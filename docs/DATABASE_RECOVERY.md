# PostgreSQL: migration, backup e restauração

- O gateway nunca altera schema no startup. `npm run migrate` é executado como gate anterior à promoção.
- Backup diário: `pg_dump --format=custom`, SHA-256, criptografia e cópia para armazenamento externo ao host.
- Restore drill: restaurar em banco isolado, validar `chat_sessions`, `chat_messages`, `api_vault` (somente metadados) e `executive_action_receipts`.
- Metas: RPO 24 h e RTO 60 min. Falha de checksum, dump ou restore deve bloquear promoção e gerar alerta.
