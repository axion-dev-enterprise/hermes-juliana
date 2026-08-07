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

      const paramMatches = (action.path + connector.baseUrl).match(/{{(\w+)}}/g) || [];
      paramMatches.forEach(m => {
        const paramName = m.replace(/[{}]/g, '');
        if (!properties[paramName]) {
          properties[paramName] = { type: 'string', description: `Parâmetro ${paramName} para a ação ${actionId}.` };
          requiredParams.push(paramName);
        }
      });

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

  tools.push({
    type: 'function',
    function: {
      name: 'CLICKUP_DISCOVER_LISTS',
      description: 'Descobre todas as listas reais do workspace ClickUp.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'AUTONOMOUS_CREATE_AND_DEPLOY_LANDING_PAGE',
      description: 'Cria autonomamente um repositório no GitHub com o código da Landing Page e faz o deploy de produção instantâneo no Vercel.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Nome do projeto/repositório (ex: landing-sorriso-real)' },
          title: { type: 'string', description: 'Título principal da Landing Page' },
          headline: { type: 'string', description: 'Headline principal para a seção Hero' },
          description: { type: 'string', description: 'Descrição dos serviços ou produto' },
          callToAction: { type: 'string', description: 'Texto do botão de conversão (ex: Agende pelo WhatsApp)' }
        },
        required: ['projectName', 'title']
      }
    }
  });

  return tools;
}

const TOOL_DEFINITIONS = buildDynamicTools();

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

  if (actionType === 'AUTONOMOUS_CREATE_AND_DEPLOY_LANDING_PAGE') {
    const ghToken = findToken(keys, 'github');
    const vercelToken = findToken(keys, 'vercel');

    const rawProjectName = (params.projectName || `landing-page-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const projectName = rawProjectName.startsWith('landing-') ? rawProjectName : `landing-${rawProjectName}`;
    const pageTitle = params.title || 'W Soluções Tecnologia — Inovação & Alta Performance';
    const pageHeadline = params.headline || 'Transforme seu Negócio com Tecnologia de Ponta';
    const pageDesc = params.description || 'Soluções corporativas completas desenvolvidas pela W Soluções Tecnologia.';
    const pageCta = params.callToAction || 'Falar com um Especialista no WhatsApp';

    const landingHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #090d16;
      --card-bg: rgba(15, 23, 42, 0.75);
      --primary-cyan: #38bdf8;
      --primary-violet: #818cf8;
      --accent-emerald: #34d399;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-glow: rgba(56, 189, 248, 0.25);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(56, 189, 248, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(129, 140, 248, 0.15) 0px, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 900px;
      width: 100%;
    }
    .hero-card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-glow);
      border-radius: 1.5rem;
      padding: 3.5rem 2.5rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--primary-cyan);
      font-size: 0.85rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 2.8rem;
      font-weight: 800;
      line-height: 1.2;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, var(--primary-cyan) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1.2rem;
    }
    p.lead {
      font-size: 1.2rem;
      color: var(--text-muted);
      max-width: 650px;
      margin: 0 auto 2.5rem;
      line-height: 1.6;
    }
    .cta-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      background: linear-gradient(135deg, var(--primary-cyan), var(--primary-violet));
      color: #0f172a;
      font-weight: 700;
      font-size: 1.1rem;
      padding: 1.1rem 2.5rem;
      border-radius: 0.75rem;
      text-decoration: none;
      transition: all 0.3s ease;
      box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.4);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px -5px rgba(56, 189, 248, 0.6);
    }
    .footer-note {
      margin-top: 3rem;
      font-size: 0.8rem;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero-card">
      <div class="badge">W Soluções Tecnologia</div>
      <h1>${pageHeadline}</h1>
      <p class="lead">${pageDesc}</p>
      <a href="https://wa.me/555198231769" target="_blank" class="cta-button">
        ⚡ ${pageCta}
      </a>
      <div class="footer-note">
        Deployed autonomamente via Hermes Central Juliana — AXION Enterprise • ${new Date().toLocaleDateString('pt-BR')}
      </div>
    </div>
  </div>
</body>
</html>`;

    // Step A: Create GitHub Repository
    console.log(`[AUTONOMOUS ENGINE] Criando repositório no GitHub: ${projectName}...`);
    const ghRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        description: `Landing Page criada autonomamente por Hermes Central Juliana. (${pageTitle})`,
        private: false,
        auto_init: true
      })
    });

    let repoData = {};
    if (ghRepoRes.ok || ghRepoRes.status === 422) {
      repoData = await ghRepoRes.json().catch(() => ({ full_name: `axion-dev-enterprise/${projectName}` }));
    } else {
      const errText = await ghRepoRes.text();
      console.warn('[AUTONOMOUS GITHUB REPO WARN]:', errText.substring(0, 150));
    }

    const fullRepoName = repoData.full_name || `axion-dev-enterprise/${projectName}`;
    console.log(`[AUTONOMOUS ENGINE] Enviando index.html para o GitHub: ${fullRepoName}...`);
    const ghFileRes = await fetch(`https://api.github.com/repos/${fullRepoName}/contents/index.html`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${ghToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'feat: adiciona Landing Page HTML5/CSS3 autônoma',
        content: Buffer.from(landingHtml, 'utf8').toString('base64')
      })
    });
    const fileData = await ghFileRes.json().catch(() => ({}));

    // Step C: Instant Deployment to Vercel v13 API (with fallback for teamId query param)
    console.log(`[AUTONOMOUS ENGINE] Disparando deploy de produção na Vercel: ${projectName}...`);
    let vercelEndpoint = 'https://api.vercel.com/v13/deployments';
    let vercelDeployRes = await fetch(vercelEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        target: 'production',
        files: [{ file: 'index.html', data: landingHtml, encoding: 'utf-8' }]
      })
    });

    if (!vercelDeployRes.ok && vercelDeployRes.status === 403) {
      console.log('[AUTONOMOUS ENGINE] Vercel 403 sem teamId. Tentando com teamId=team_jKFR6U79Lc8DBlPK6RSk3RO5...');
      vercelEndpoint = 'https://api.vercel.com/v13/deployments?teamId=team_jKFR6U79Lc8DBlPK6RSk3RO5';
      vercelDeployRes = await fetch(vercelEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          target: 'production',
          files: [{ file: 'index.html', data: landingHtml, encoding: 'utf-8' }]
        })
      });
    }

    const deployData = await vercelDeployRes.json();
    if (!vercelDeployRes.ok && vercelDeployRes.status !== 201) {
      throw new Error(`Vercel API HTTP ${vercelDeployRes.status}: ${deployData.error?.message || JSON.stringify(deployData).substring(0, 200)}`);
    }

    const deployUrl = deployData.url ? `https://${deployData.url}` : `https://${projectName}.vercel.app`;
    const githubUrl = repoData.html_url || `https://github.com/${fullRepoName}`;

    return {
      status: 'success',
      provider: 'github_and_vercel',
      projectName,
      github: {
        repository: fullRepoName,
        url: githubUrl,
        commit: fileData.commit?.sha || 'N/A'
      },
      vercel: {
        deploymentId: deployData.id || deployData.uid || 'N/A',
        url: deployUrl,
        readyState: deployData.readyState || deployData.status || 'READY'
      }
    };
  }

  const parts = actionType.split('_');
  if (parts.length < 2) throw new Error(`Nome de ferramenta inválido: ${actionType}`);

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
    if (connectorId === 'github' && actionId === 'CREATE_FILE' && params.content && !params.payload) {
      body = JSON.stringify({
        message: params.message || 'update file via Hermes Agent',
        content: Buffer.from(params.content, 'utf8').toString('base64'),
        branch: params.branch || 'main'
      });
    } else {
      body = JSON.stringify(params.payload || params);
    }
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
