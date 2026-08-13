const CONNECTORS = {
  nous_portal: {
    vaultKey: 'nous_portal',
    baseUrl: 'https://inference-api.nousresearch.com/v1',
    auth: 'bearer',
    actions: {
      LIST_MODELS: { method: 'GET', path: '/models', risk: 'read', description: 'Lista modelos disponíveis no Nous Portal.' }
    }
  },
  openai: {
    vaultKey: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    auth: 'bearer',
    actions: {
      LIST_MODELS: { method: 'GET', path: '/models', risk: 'read', description: 'Lista modelos da OpenAI.' }
    }
  },
  openrouter: {
    vaultKey: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    auth: 'bearer',
    actions: {
      LIST_MODELS: { method: 'GET', path: '/models', risk: 'read', description: 'Lista modelos do OpenRouter.' }
    }
  },
  github: {
    vaultKey: 'github',
    baseUrl: 'https://api.github.com',
    auth: 'bearer',
    actions: {
      LIST_REPOSITORIES: { method: 'GET', path: '/user/repos?per_page=100&sort=updated', risk: 'read', description: 'Lista todos os repositórios reais do usuário/organização no GitHub.' },
      SEARCH_REPOSITORIES: { method: 'GET', path: '/search/repositories?q={{query}}', risk: 'read', description: 'Pesquisa repositórios por nome ou palavra-chave no GitHub.' },
      GET_REPOSITORY: { method: 'GET', path: '/repos/{{repository}}', risk: 'read', description: 'Obtém detalhes de um repositório pertencente à identidade autenticada no Vault.' },
      CREATE_REPOSITORY: { method: 'POST', path: '/user/repos', risk: 'write', confirmation: true, description: 'Cria um novo repositório no GitHub.' },
      CREATE_ISSUE: { method: 'POST', path: '/repos/{{repository}}/issues', risk: 'write', confirmation: true, description: 'Cria uma issue em um repositório GitHub.' },
      CREATE_FILE: { method: 'PUT', path: '/repos/{{repository}}/contents/{{path}}', risk: 'write', confirmation: true, description: 'Cria ou edita um arquivo de código em um repositório GitHub.' },
      DISPATCH_WORKFLOW: { method: 'POST', path: '/repos/{{repository}}/actions/workflows/{{workflow}}/dispatches', risk: 'deploy', confirmation: true, description: 'Dispara um workflow do GitHub Actions.' }
    }
  },
  vercel: {
    vaultKey: 'vercel',
    baseUrl: 'https://api.vercel.com',
    auth: 'bearer',
    actions: {
      LIST_PROJECTS: { method: 'GET', path: '/v9/projects', risk: 'read', description: 'Lista todos os projetos hospedados no Vercel.' },
      GET_PROJECT: { method: 'GET', path: '/v9/projects/{{projectId}}', risk: 'read', description: 'Obtém detalhes de um projeto específico no Vercel.' },
      CREATE_DEPLOYMENT: { method: 'POST', path: '/v13/deployments', risk: 'deploy', confirmation: true, description: 'Cria um deploy de produção no Vercel.' }
    }
  },
  clickup: {
    vaultKey: 'clickup',
    baseUrl: 'https://api.clickup.com/api/v2',
    auth: 'raw_authorization',
    actions: {
      GET_TEAMS: { method: 'GET', path: '/team', risk: 'read', description: 'Obtém times/workspaces do ClickUp.' },
      LIST_SPACE_LISTS: { method: 'GET', path: '/space/{{spaceId}}/list?archived=false', risk: 'read', description: 'Lista todas as listas de um espaço no ClickUp.' },
      CREATE_TASK: { method: 'POST', path: '/list/{{listId}}/task', risk: 'write', confirmation: true, description: 'Cria uma tarefa real em uma lista do ClickUp.' },
      DELETE_TASK: { method: 'DELETE', path: '/task/{{taskId}}', risk: 'write', confirmation: true, description: 'Exclui uma tarefa no ClickUp.' }
    }
  },
  meta_ads: {
    vaultKey: 'meta',
    baseUrl: 'https://graph.facebook.com/v19.0',
    auth: 'access_token_query',
    actions: {
      LIST_CAMPAIGNS: { method: 'GET', path: '/{{adAccountId}}/campaigns', risk: 'read', description: 'Lista campanhas de anúncios do Meta Ads.' },
      UPDATE_CAMPAIGN: { method: 'POST', path: '/{{campaignId}}', risk: 'write', confirmation: true, description: 'Atualiza orçamento ou status de uma campanha Meta Ads.' }
    }
  },
  asaas: {
    vaultKey: 'asaas',
    baseUrl: 'https://www.asaas.com/api/v3',
    auth: 'access_token_header',
    actions: {
      CREATE_PAYMENT: { method: 'POST', path: '/payments', risk: 'financial', confirmation: true, description: 'Cria uma cobrança/fatura no Asaas.' },
      LIST_PAYMENTS: { method: 'GET', path: '/payments', risk: 'read', description: 'Lista cobranças no Asaas.' }
    }
  },
  google_sheets: {
    vaultKey: 'google_sheets',
    baseUrl: 'https://sheets.googleapis.com/v4',
    auth: 'bearer',
    actions: {
      GET_VALUES: { method: 'GET', path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}', risk: 'read', description: 'Lê dados de uma planilha Google Sheets.' },
      APPEND_VALUES: { method: 'POST', path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}:append', risk: 'write', confirmation: true, description: 'Adiciona linhas em uma planilha Google Sheets.' }
    }
  },
  telegram: {
    vaultKey: 'telegram',
    baseUrl: 'https://api.telegram.org',
    auth: 'telegram_bot_path',
    actions: {
      SEND_MESSAGE: { method: 'POST', path: '/bot{{token}}/sendMessage', risk: 'publish', confirmation: true, description: 'Envia mensagem via Bot do Telegram.' }
    }
  },
  cloudflare: {
    vaultKey: 'cloudflare',
    baseUrl: 'https://api.cloudflare.com/client/v4',
    auth: 'bearer',
    actions: {
      GET_ZONES: { method: 'GET', path: '/zones', risk: 'read', description: 'Lista zonas de domínio no Cloudflare.' },
      PURGE_CACHE: { method: 'POST', path: '/zones/{{zoneId}}/purge_cache', risk: 'deploy', confirmation: true, description: 'Limpa cache CDN no Cloudflare.' }
    }
  }
};

const DOCUMENTATION_ONLY = ['anthropic', 'groq', 'perplexity', 'mistral', 'elevenlabs', 'google_workspace', 'google_oauth', 'google_ads', 'firebase', 'meta_pixel', 'whatsapp', 'twilio', 'mailchimp', 'mercadopago', 'pagarme', 'iugu', 'gerencianet', 'trello', 'jira', 'rdstation', 'salesforce', 'aws', 'gcp_sa', 'azure', 'railway', 'semrush', 'ahrefs', 'hotjar', 'mixpanel', 'amplitude', 'maps', 'woocommerce', 'zapier'];

function resolveConnectorAction(connectorId, actionId, params = {}) {
  const connector = CONNECTORS[connectorId];
  if (!connector) throw new Error(`CONNECTOR_NOT_ENABLED: ${connectorId}`);
  const action = connector.actions[actionId];
  if (!action) throw new Error(`ACTION_NOT_ALLOWED: ${connectorId}.${actionId}`);

  let path = action.path;
  // Replace path parameters like {{repository}}, {{query}}, etc.
  path = path.replace(/{{(\w+)}}/g, (_, name) => {
    const value = params[name];
    if (value === undefined || value === null || value === '') {
      // Optional parameters handling or throw error
      throw new Error(`MISSING_PATH_PARAMETER: ${name}`);
    }
    return encodeURIComponent(String(value));
  });

  let baseUrl = connector.baseUrl;
  baseUrl = baseUrl.replace(/{{(\w+)}}/g, (_, name) => {
    const value = params[name];
    if (!value) throw new Error(`MISSING_BASE_PARAMETER: ${name}`);
    return String(value).replace(/[^a-zA-Z0-9.-]/g, '');
  });

  return { connectorId, actionId, ...connector, ...action, url: `${baseUrl}${path}` };
}

module.exports = { CONNECTORS, DOCUMENTATION_ONLY, resolveConnectorAction };
