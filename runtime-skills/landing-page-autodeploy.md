# Landing Page Autonomous Creation & Deploy Skill
# VERSIÓN: V6.2.0 • HERMES CENTRAL JULIANA

## 1. OBJETIVO
Procedimento autônomo para geração de Landing Pages HTML5/CSS3 modernas, criação de repositórios (opcional no GitHub) e deploy de produção instantâneo na Vercel com remoção automática de SSO e validação empírica por HTTP GET.

## 2. REGRAS OBRIGATÓRIAS DE PERSISTÊNCIA E VALIDAÇÃO
- Ao receber a ordem de criar/hospedar uma Landing Page:
  1. Executar a ferramenta `AUTONOMOUS_CREATE_AND_DEPLOY_LANDING_PAGE`.
  2. A ferramenta desativa automaticamente a proteção SSO na Vercel (`ssoProtection: null`).
  3. A URL pública gerada deve ser no formato `https://[NOME-PROJETO].vercel.app`.
  4. Executar validação empírica (requisição HTTP GET / curl) confirmando o código `HTTP 200 OK` e o título do documento.
  5. NUNCA entregar a tarefa sem ter a URL pública testada e 100% acessível.

## 3. FERRAMENTAS
- `AUTONOMOUS_CREATE_AND_DEPLOY_LANDING_PAGE`: Gera a estrutura HTML5/CSS3, realiza o deploy instantâneo na Vercel e libera o acesso público sem SSO.
- `FETCH_VERCEL_PROJECTS`: Consulta projetos e estado dos deploys na Vercel.
- `EXECUTE_TERMINAL_COMMAND`: Executa `curl -s -L <URL>` para verificação empírica de status.
