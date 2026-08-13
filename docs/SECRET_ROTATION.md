# Rotação do operador

- O segredo de produção deve ter pelo menos 32 bytes e existir somente no GitHub Environment `production` e no Vault autorizado.
- Rotacione `HERMES_OPERATOR_TOKEN`, execute o pipeline e confirme que o token anterior retorna HTTP 401.
- Todas as sessões assinadas pelo segredo anterior tornam-se inválidas automaticamente após o restart.
- Break-glass: um administrador autorizado substitui o secret no GitHub, reexecuta o deploy e registra o incidente na timeline.
