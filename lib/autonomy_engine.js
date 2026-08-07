const { CONNECTORS, resolveConnectorAction } = require('./connector_registry');

function findToken(keys, service) {
  const key = keys.find((item) => item.service.toLowerCase().includes(service));
  const envKey = process.env[`${service.toUpperCase()}_TOKEN`] || process.env[`${service.toUpperCase()}_API_KEY`] || (service === 'github' ? (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) : null);
  const token = key?.rawToken || envKey;
  if (!token) throw new Error(`Credencial do serviço '${service}' não configurada no Vault.`);
  return token;
}

// DYNAMIC TOOL DEFINITIONS GENERATED AUTOMATICALLY FROM THE CONNECTOR REGISTRY
function buildDynamicTools() {
  const tools = [];

  for (const [connectorId, connector] of Object.entries(CONNECTORS)) {
    for (const [actionId, action] of Object.entries(connector.actions)) {
      const toolName = `${connectorId.toUpperCase()}_${actionId}`;
      const requiredParams = [];
      const properties = {};

      // Extract parameter placeholders from path and baseUrl (e.g., {{repository}}, {{query}})
      const paramMatches = (action.path + connector.baseUrl).match(/{{(\w+)}}/g) || [];
      paramMatches.forEach(m => {
        const paramName = m.replace(/[{}]/g, '');
        if (!properties[paramName]) {
          properties[paramName] = { type: 'string', description: `Parâmetro ${paramName} para a ação ${actionId}.` };
          requiredParams.push(paramName);
        }
      });

      // Add payload / body params for POST/PUT methods
      if (['POST', 'PUT', 'PATCH'].includes(action.method)) {
        if (!properties['payload']) {
          properties['payload'] = {
            type: 'object',
            description: 'Objeto JSON com os campos de dados para enviar no corpo da requisição.'
          };
        }
      }

      tools.push({
        type: 'function',
        function: {
          name: toolName,
          description: `[${connectorId.toUpperCase()}] ${action.description || actionId}`,
          parameters: {
            type: 'object',
            properties,
            required: requiredParams,
            additionalProperties: true
          }
        }
      });
    }
  }

  // Add ClickUp List Discovery Helper Tool
  tools.push({
    type: 'function',
    function: {
      name: 'CLICKUP_DISCOVER_LISTS',
      description: 'Descobre todas as listas reais do workspace ClickUp.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  });

  return tools;
}

const TOOL_DEFINITIONS = buildDynamicTools();

// UNIVERSAL DYNAMIC CONNECTOR EXECUTOR
async function executeAutonomyAction(actionType, params = {}, keys = []) {
  if (actionType === 'CLICKUP_DISCOVER_LISTS') {
    const token = findToken(keys, 'clickup');
    const teamsRes = await fetch('https://api.clickup.com/api/v2/team', { headers: { Authorization: token } });
    if (!teamsRes.ok) throw new Error(`ClickUp HTTP ${teamsRes.status}: ${await teamsRes.text()}`);
    const teams = await teamsRes.json();
    const lists = [];
    for (const team of (teams.teams || []).slice(0, 3)) {
      const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/space?archived=false`, { headers: { Authorization: token } });
      if (!spacesRes.ok) continue;
      const spaces = await spacesRes.json();
      for (const space of (spaces.spaces || []).slice(0, 5)) {
        const folderlessRes = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list?archived=false`, { headers: { Authorization: token } });
        if (folderlessRes.ok) {
          const folderless = await folderlessRes.json();
          for (const list of (folderless.lists || [])) lists.push({ id: String(list.id), name: list.name, space: space.name });
        }
      }
    }
    return { provider: 'clickup', lists: lists.slice(0, 30) };
  }

  // Extract connector and action IDs from toolName (e.g. GITHUB_LIST_REPOSITORIES -> connector: github, action: LIST_REPOSITORIES)
  const parts = actionType.split('_');
  if (parts.length < 2) throw new Error(`Nome de ferramenta inválido: ${actionType}`);

  // Match connectorId from CONNECTORS keys
  let connectorId = null;
  let actionId = null;

  for (const cId of Object.keys(CONNECTORS)) {
    if (actionType.toLowerCase().startsWith(cId.toLowerCase() + '_')) {
      connectorId = cId;
      actionId = actionType.substring(cId.length + 1);
      break;
    }
  }

  if (!connectorId || !actionId) {
    throw new Error(`Ação não reconhecida no registro de conectores: ${actionType}`);
  }

  const connector = CONNECTORS[connectorId];
  const token = findToken(keys, connector.vaultKey);

  // Resolve target URL and method
  const resolved = resolveConnectorAction(connectorId, actionId, params);
  const headers = { 'Content-Type': 'application/json' };

  if (connector.auth === 'bearer') {
    headers['Authorization'] = `Bearer ${token}`;
    headers['Accept'] = 'application/vnd.github+json';
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  } else if (connector.auth === 'raw_authorization') {
    headers['Authorization'] = token;
  } else if (connector.auth === 'access_token_header') {
    headers['access_token'] = token;
  }

  let body = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(resolved.method)) {
    body = JSON.stringify(params.payload || params);
  }

  console.log(`[HERMES AGENT ENGINE] Disparando requisição real: ${resolved.method} ${resolved.url}`);

  const response = await fetch(resolved.url, {
    method: resolved.method,
    headers,
    body
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`${connectorId.toUpperCase()} HTTP ${response.status}: ${errText.substring(0, 300)}`);
  }

  if (response.status === 204) return { status: 'success', message: 'Ação executada com sucesso (204 No Content).' };
  const data = await response.json().catch(() => ({ status: 'success' }));
  return data;
}

module.exports = { TOOL_DEFINITIONS, executeAutonomyAction, buildDynamicTools };
