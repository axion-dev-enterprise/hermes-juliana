const CONNECTORS = {
  openai: { vaultKey: 'openai', baseUrl: 'https://api.openai.com/v1', auth: 'bearer', actions: { LIST_MODELS: { method: 'GET', path: '/models', risk: 'read' } } },
  openrouter: { vaultKey: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', auth: 'bearer', actions: { LIST_MODELS: { method: 'GET', path: '/models', risk: 'read' } } },
  gemini: { vaultKey: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', auth: 'api_key_query', actions: { LIST_MODELS: { method: 'GET', path: '/models', risk: 'read' } } },
  google_sheets: { vaultKey: 'google_sheets', baseUrl: 'https://sheets.googleapis.com/v4', auth: 'bearer', actions: { GET_VALUES: { method: 'GET', path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}', risk: 'read' }, APPEND_VALUES: { method: 'POST', path: '/spreadsheets/{{spreadsheetId}}/values/{{range}}:append', risk: 'write', confirmation: true } } },
  google_drive: { vaultKey: 'google_drive', baseUrl: 'https://www.googleapis.com/drive/v3', auth: 'bearer', actions: { LIST_FILES: { method: 'GET', path: '/files', risk: 'read' }, CREATE_FOLDER: { method: 'POST', path: '/files', risk: 'write', confirmation: true } } },
  google_calendar: { vaultKey: 'google_calendar', baseUrl: 'https://www.googleapis.com/calendar/v3', auth: 'bearer', actions: { LIST_EVENTS: { method: 'GET', path: '/calendars/{{calendarId}}/events', risk: 'read' }, CREATE_EVENT: { method: 'POST', path: '/calendars/{{calendarId}}/events', risk: 'write', confirmation: true } } },
  google_gmail: { vaultKey: 'google_gmail', baseUrl: 'https://gmail.googleapis.com/gmail/v1', auth: 'bearer', actions: { LIST_MESSAGES: { method: 'GET', path: '/users/{{userId}}/messages', risk: 'read' }, SEND_MESSAGE: { method: 'POST', path: '/users/{{userId}}/messages/send', risk: 'publish', confirmation: true } } },
  google_analytics: { vaultKey: 'google_analytics', baseUrl: 'https://analyticsdata.googleapis.com/v1beta', auth: 'bearer', actions: { RUN_REPORT: { method: 'POST', path: '/properties/{{propertyId}}:runReport', risk: 'read' } } },
  meta_graph: { vaultKey: 'meta_graph', baseUrl: 'https://graph.facebook.com/v19.0', auth: 'access_token_query', actions: { GET_OBJECT: { method: 'GET', path: '/{{objectId}}', risk: 'read' } } },
  meta_ads: { vaultKey: 'meta_ads', baseUrl: 'https://graph.facebook.com/v19.0', auth: 'access_token_query', actions: { LIST_CAMPAIGNS: { method: 'GET', path: '/{{adAccountId}}/campaigns', risk: 'read' }, UPDATE_CAMPAIGN: { method: 'POST', path: '/{{campaignId}}', risk: 'write', confirmation: true } } },
  meta_whatsapp: { vaultKey: 'meta_whatsapp', baseUrl: 'https://graph.facebook.com/v19.0', auth: 'bearer', actions: { SEND_TEMPLATE: { method: 'POST', path: '/{{phoneNumberId}}/messages', risk: 'publish', confirmation: true } } },
  meta_instagram: { vaultKey: 'meta_instagram', baseUrl: 'https://graph.facebook.com/v19.0', auth: 'access_token_query', actions: { GET_MEDIA: { method: 'GET', path: '/{{instagramAccountId}}/media', risk: 'read' } } },
  telegram: { vaultKey: 'telegram', baseUrl: 'https://api.telegram.org', auth: 'telegram_bot_path', actions: { SEND_MESSAGE: { method: 'POST', path: '/bot{{token}}/sendMessage', risk: 'publish', confirmation: true } } },
  slack: { vaultKey: 'slack', baseUrl: 'https://slack.com/api', auth: 'bearer', actions: { POST_MESSAGE: { method: 'POST', path: '/chat.postMessage', risk: 'publish', confirmation: true } } },
  discord: { vaultKey: 'discord', baseUrl: 'https://discord.com/api/v10', auth: 'bot', actions: { CREATE_MESSAGE: { method: 'POST', path: '/channels/{{channelId}}/messages', risk: 'publish', confirmation: true } } },
  sendgrid: { vaultKey: 'sendgrid', baseUrl: 'https://api.sendgrid.com/v3', auth: 'bearer', actions: { SEND_MAIL: { method: 'POST', path: '/mail/send', risk: 'publish', confirmation: true } } },
  brevo: { vaultKey: 'brevo', baseUrl: 'https://api.brevo.com/v3', auth: 'api_key_header', actions: { SEND_EMAIL: { method: 'POST', path: '/smtp/email', risk: 'publish', confirmation: true } } },
  asaas: { vaultKey: 'asaas', baseUrl: 'https://www.asaas.com/api/v3', auth: 'access_token_header', actions: { CREATE_PAYMENT: { method: 'POST', path: '/payments', risk: 'financial', confirmation: true } } },
  stripe: { vaultKey: 'stripe', baseUrl: 'https://api.stripe.com/v1', auth: 'bearer', actions: { CREATE_PAYMENT_INTENT: { method: 'POST', path: '/payment_intents', risk: 'financial', confirmation: true } } },
  clickup: { vaultKey: 'clickup', baseUrl: 'https://api.clickup.com/api/v2', auth: 'raw_authorization', actions: { CREATE_TASK: { method: 'POST', path: '/list/{{listId}}/task', risk: 'write', confirmation: true } } },
  notion: { vaultKey: 'notion', baseUrl: 'https://api.notion.com/v1', auth: 'bearer', actions: { QUERY_DATABASE: { method: 'POST', path: '/databases/{{databaseId}}/query', risk: 'read' }, CREATE_PAGE: { method: 'POST', path: '/pages', risk: 'write', confirmation: true } } },
  hubspot: { vaultKey: 'hubspot', baseUrl: 'https://api.hubapi.com', auth: 'bearer', actions: { LIST_CONTACTS: { method: 'GET', path: '/crm/v3/objects/contacts', risk: 'read' }, CREATE_CONTACT: { method: 'POST', path: '/crm/v3/objects/contacts', risk: 'write', confirmation: true } } },
  pipedrive: { vaultKey: 'pipedrive', baseUrl: 'https://api.pipedrive.com/v1', auth: 'api_token_query', actions: { LIST_DEALS: { method: 'GET', path: '/deals', risk: 'read' }, CREATE_DEAL: { method: 'POST', path: '/deals', risk: 'write', confirmation: true } } },
  github: { vaultKey: 'github', baseUrl: 'https://api.github.com', auth: 'bearer', actions: { CREATE_ISSUE: { method: 'POST', path: '/repos/{{repository}}/issues', risk: 'write', confirmation: true } } },
  cloudflare: { vaultKey: 'cloudflare', baseUrl: 'https://api.cloudflare.com/client/v4', auth: 'bearer', actions: { GET_ZONES: { method: 'GET', path: '/zones', risk: 'read' }, PURGE_CACHE: { method: 'POST', path: '/zones/{{zoneId}}/purge_cache', risk: 'deploy', confirmation: true } } },
  supabase: { vaultKey: 'supabase', baseUrl: 'https://{{projectRef}}.supabase.co/rest/v1', auth: 'apikey', actions: { SELECT: { method: 'GET', path: '/{{table}}', risk: 'read' } } },
  sentry: { vaultKey: 'sentry', baseUrl: 'https://sentry.io/api/0', auth: 'bearer', actions: { LIST_ISSUES: { method: 'GET', path: '/projects/{{organization}}/{{project}}/issues/', risk: 'read' } } },
  openweather: { vaultKey: 'openweather', baseUrl: 'https://api.openweathermap.org/data/2.5', auth: 'api_key_query', actions: { CURRENT_WEATHER: { method: 'GET', path: '/weather', risk: 'read' } } },
  shopify: { vaultKey: 'shopify', baseUrl: 'https://{{shop}}.myshopify.com/admin/api/2025-01', auth: 'shopify_access_token', actions: { LIST_PRODUCTS: { method: 'GET', path: '/products.json', risk: 'read' }, CREATE_PRODUCT: { method: 'POST', path: '/products.json', risk: 'write', confirmation: true } } },
  n8n: { vaultKey: 'n8n', baseUrl: 'https://{{host}}/api/v1', auth: 'x_api_key', actions: { LIST_WORKFLOWS: { method: 'GET', path: '/workflows', risk: 'read' } } },
  make: { vaultKey: 'make', baseUrl: 'https://{{zone}}.make.com/api/v2', auth: 'token_header', actions: { LIST_SCENARIOS: { method: 'GET', path: '/scenarios', risk: 'read' } } }
};

const DOCUMENTATION_ONLY = ['anthropic', 'groq', 'perplexity', 'mistral', 'elevenlabs', 'google_workspace', 'google_oauth', 'google_ads', 'firebase', 'meta_pixel', 'whatsapp', 'twilio', 'mailchimp', 'mercadopago', 'pagarme', 'iugu', 'gerencianet', 'trello', 'jira', 'rdstation', 'salesforce', 'vercel', 'aws', 'gcp_sa', 'azure', 'railway', 'semrush', 'ahrefs', 'hotjar', 'mixpanel', 'amplitude', 'maps', 'woocommerce', 'zapier'];

function resolveConnectorAction(connectorId, actionId, params = {}) {
  const connector = CONNECTORS[connectorId];
  if (!connector) throw new Error(`CONNECTOR_NOT_ENABLED: ${connectorId}`);
  const action = connector.actions[actionId];
  if (!action) throw new Error(`ACTION_NOT_ALLOWED: ${connectorId}.${actionId}`);
  const path = action.path.replace(/{{(\w+)}}/g, (_, name) => {
    const value = params[name];
    if (value === undefined || value === null || value === '') throw new Error(`MISSING_PATH_PARAMETER: ${name}`);
    return encodeURIComponent(String(value));
  });
  const baseUrl = connector.baseUrl.replace(/{{(\w+)}}/g, (_, name) => {
    const value = params[name];
    if (!value) throw new Error(`MISSING_BASE_PARAMETER: ${name}`);
    return String(value).replace(/[^a-zA-Z0-9.-]/g, '');
  });
  return { connectorId, actionId, ...connector, ...action, url: `${baseUrl}${path}` };
}

module.exports = { CONNECTORS, DOCUMENTATION_ONLY, resolveConnectorAction };
