const API_VERSION = 'v19.0';

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} é obrigatório.`);
  return value.trim();
}

function assertPositiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} deve ser um número positivo.`);
  return number;
}

function findToken(keys, service) {
  const key = keys.find((item) => item.service.toLowerCase().includes(service));
  const envKey = process.env[`${service.toUpperCase()}_TOKEN`] || process.env[`${service.toUpperCase()}_API_KEY`] || (service === 'github' ? process.env.GH_TOKEN : null);
  const token = key?.rawToken || envKey;
  if (!token) throw new Error(`Credencial de ${service} não configurada no Vault.`);
  return token;
}

async function createClickUpTask(params, keys) {
  const name = assertString(params.taskName, 'taskName');
  const token = findToken(keys, 'clickup');
  const listId = assertString(params.listId, 'listId');
  const response = await fetch(`https://api.clickup.com/api/v2/list/${encodeURIComponent(listId)}/task`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: params.description || 'Tarefa criada pelo Hermes Central Juliana.',
      status: params.status || 'to do',
      priority: params.priority || 2
    })
  });
  if (!response.ok) throw new Error(`ClickUp HTTP ${response.status}: ${await response.text()}`);
  const task = await response.json();
  return { provider: 'clickup', id: task.id, url: task.url, name: task.name };
}

async function clickUpRequest(endpoint, token, options = {}) {
  const response = await fetch(`https://api.clickup.com/api/v2${endpoint}`, {
    ...options, headers: { Authorization: token, ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`ClickUp HTTP ${response.status}: ${await response.text()}`);
  return response.status === 204 ? {} : response.json();
}

async function discoverClickUpLists(params, keys) {
  const token = findToken(keys, 'clickup');
  const teams = await clickUpRequest('/team', token);
  const output = [];
  for (const team of (teams.teams || []).slice(0, 5)) {
    const spaces = await clickUpRequest(`/team/${encodeURIComponent(team.id)}/space?archived=false`, token);
    for (const space of (spaces.spaces || []).slice(0, 10)) {
      const folders = await clickUpRequest(`/space/${encodeURIComponent(space.id)}/folder?archived=false`, token);
      for (const folder of (folders.folders || []).slice(0, 10)) {
        for (const list of (folder.lists || [])) output.push({ id: String(list.id), name: list.name, team: team.name, space: space.name, folder: folder.name });
      }
      const folderless = await clickUpRequest(`/space/${encodeURIComponent(space.id)}/list?archived=false`, token);
      for (const list of (folderless.lists || [])) output.push({ id: String(list.id), name: list.name, team: team.name, space: space.name, folder: null });
    }
  }
  return { provider: 'clickup', lists: output.slice(0, 50) };
}

async function deleteClickUpTask(params, keys) {
  const taskId = assertString(params.taskId, 'taskId');
  const token = findToken(keys, 'clickup');
  await clickUpRequest(`/task/${encodeURIComponent(taskId)}`, token, { method: 'DELETE' });
  return { provider: 'clickup', id: taskId, deleted: true };
}

async function updateMetaAdsBudget(params, keys) {
  const campaignId = assertString(params.campaignId, 'campaignId');
  const dailyBudget = Math.round(assertPositiveNumber(params.dailyBudget, 'dailyBudget') * 100);
  const token = findToken(keys, 'meta');
  const body = new URLSearchParams({ access_token: token, daily_budget: String(dailyBudget) });
  const response = await fetch(`https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(campaignId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  if (!response.ok) throw new Error(`Meta Graph HTTP ${response.status}: ${await response.text()}`);
  return { provider: 'meta', campaignId, dailyBudget, result: await response.json() };
}

async function createAsaasCharge(params, keys) {
  const customer = assertString(params.customer, 'customer');
  const value = assertPositiveNumber(params.value, 'value');
  const dueDate = assertString(params.dueDate, 'dueDate');
  const token = findToken(keys, 'asaas');
  const response = await fetch('https://www.asaas.com/api/v3/payments', {
    method: 'POST',
    headers: { access_token: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer, value, dueDate, billingType: params.billingType || 'PIX', description: params.description })
  });
  if (!response.ok) throw new Error(`Asaas HTTP ${response.status}: ${await response.text()}`);
  const charge = await response.json();
  return { provider: 'asaas', id: charge.id, status: charge.status, invoiceUrl: charge.invoiceUrl || null };
}

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}: ${await response.text()}`);
  return response.status === 204 ? {} : response.json();
}

async function createGitHubIssue(params, keys) {
  const repository = assertString(params.repository, 'repository');
  const title = assertString(params.title, 'title');
  const token = findToken(keys, 'github');
  const issue = await githubRequest(`/repos/${repository}/issues`, token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body: params.body || '' })
  });
  return { provider: 'github', number: issue.number, url: issue.html_url, title: issue.title };
}

async function createGitHubFile(params, keys) {
  const repository = assertString(params.repository, 'repository');
  const filePath = assertString(params.path, 'path');
  const content = assertString(params.content, 'content');
  const message = assertString(params.message, 'message');
  const token = findToken(keys, 'github');
  const file = await githubRequest(`/repos/${repository}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), branch: params.branch || 'main' })
  });
  return { provider: 'github', commit: file.commit?.sha, url: file.content?.html_url || null, path: file.content?.path || filePath };
}

async function dispatchGitHubWorkflow(params, keys) {
  const repository = assertString(params.repository, 'repository');
  const workflow = assertString(params.workflow, 'workflow');
  const ref = assertString(params.ref, 'ref');
  const token = findToken(keys, 'github');
  await githubRequest(`/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, inputs: params.inputs || {} })
  });
  return { provider: 'github', workflow, ref, status: 'dispatched' };
}

const TOOL_DEFINITIONS = [
  { type: 'function', function: { name: 'DISCOVER_CLICKUP_LISTS', description: 'Descobre listas reais do workspace ClickUp para selecionar uma lista sem solicitar IDs técnicos ao usuário.', parameters: { type: 'object', properties: {}, additionalProperties: false } } },
  { type: 'function', function: { name: 'CREATE_CLICKUP_TASK', description: 'Cria uma tarefa real no ClickUp.', parameters: { type: 'object', properties: { taskName: { type: 'string' }, listId: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, priority: { type: 'number' } }, required: ['taskName', 'listId'] } } },
  { type: 'function', function: { name: 'DELETE_CLICKUP_TASK', description: 'Exclui uma tarefa ClickUp real. Use somente para a tarefa de teste recém-criada ou mediante comando explícito do usuário.', parameters: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'], additionalProperties: false } } },
  { type: 'function', function: { name: 'UPDATE_META_ADS_BUDGET', description: 'Atualiza o orçamento diário real de uma campanha Meta Ads.', parameters: { type: 'object', properties: { campaignId: { type: 'string' }, dailyBudget: { type: 'number' } }, required: ['campaignId', 'dailyBudget'] } } },
  { type: 'function', function: { name: 'CREATE_ASAAS_CHARGE', description: 'Cria uma cobrança real no Asaas.', parameters: { type: 'object', properties: { customer: { type: 'string' }, value: { type: 'number' }, dueDate: { type: 'string' }, billingType: { type: 'string' }, description: { type: 'string' } }, required: ['customer', 'value', 'dueDate'] } } },
  { type: 'function', function: { name: 'CREATE_GITHUB_ISSUE', description: 'Cria uma issue no repositório GitHub informado.', parameters: { type: 'object', properties: { repository: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['repository', 'title'] } } },
  { type: 'function', function: { name: 'CREATE_GITHUB_FILE', description: 'Cria ou atualiza um arquivo de código em um repositório GitHub existente.', parameters: { type: 'object', properties: { repository: { type: 'string' }, path: { type: 'string' }, content: { type: 'string' }, message: { type: 'string' }, branch: { type: 'string' } }, required: ['repository', 'path', 'content', 'message'] } } },
  { type: 'function', function: { name: 'DISPATCH_GITHUB_WORKFLOW', description: 'Dispara workflow remoto de CI, teste ou deploy para repositório existente.', parameters: { type: 'object', properties: { repository: { type: 'string' }, workflow: { type: 'string' }, ref: { type: 'string' }, inputs: { type: 'object' } }, required: ['repository', 'workflow', 'ref'] } } }
];

async function executeAutonomyAction(actionType, params, keys) {
  const actions = { DISCOVER_CLICKUP_LISTS: discoverClickUpLists, CREATE_CLICKUP_TASK: createClickUpTask, DELETE_CLICKUP_TASK: deleteClickUpTask, UPDATE_META_ADS_BUDGET: updateMetaAdsBudget, CREATE_ASAAS_CHARGE: createAsaasCharge, CREATE_GITHUB_ISSUE: createGitHubIssue, CREATE_GITHUB_FILE: createGitHubFile, DISPATCH_GITHUB_WORKFLOW: dispatchGitHubWorkflow };
  const action = actions[actionType];
  if (!action) throw new Error(`Ação não autorizada: ${actionType}.`);
  return action(params || {}, keys);
}

module.exports = { TOOL_DEFINITIONS, executeAutonomyAction };
