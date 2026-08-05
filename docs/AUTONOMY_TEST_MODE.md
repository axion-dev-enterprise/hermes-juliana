# Autonomia em modo de testes

## Ativação temporária

No ambiente de teste, configure `HERMES_TEST_MODE=true`. Nesse modo, a rota de chat e as rotas de autonomia podem usar function calling sem `HERMES_OPERATOR_TOKEN`.

Não ative essa variável no ambiente público final. Para produção, defina `HERMES_OPERATOR_TOKEN` por secret manager e envie-o no header `X-Hermes-Operator-Token`.

## Capacidades implementadas

- criar tarefas no ClickUp;
- atualizar orçamento de campanhas Meta Ads v19.0;
- criar cobranças no Asaas;
- criar issues e arquivos em repositórios GitHub existentes;
- disparar workflows GitHub Actions para CI, testes e deploy remoto.

Cada chamada usa a credencial correspondente já configurada no Vault e falha de modo explícito se ela não estiver disponível. Nenhuma ferramenta gera recibo sintético.

## Limites de governança

- criação de projeto Vercel não é permitida; use somente projetos canônicos existentes;
- deploy deve ocorrer por workflow remoto/CI, nunca por build local;
- o usuário deve fornecer IDs, repositórios e parâmetros concretos para mutações externas.
