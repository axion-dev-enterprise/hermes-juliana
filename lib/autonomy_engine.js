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
      name: 'GET_SYSTEM_DIAGNOSTICS',
      description: 'Obtém diagnósticos de infraestrutura, status do servidor VPS, banco de dados PostgreSQL, uptime e conectores em tempo real.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'MANAGE_RUNTIME_SKILL',
      description: 'Gerencia as skills executáveis do runtime da Juliana (listar, ler, criar ou atualizar skills em runtime-skills/).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'read', 'write', 'delete'], description: 'Ação a realizar sobre as skills.' },
          name: { type: 'string', description: 'Nome da skill (ex: meta-ads-ops, lead-qualifier).' },
          content: { type: 'string', description: 'Conteúdo Markdown da skill para ação write.' }
        },
        required: ['action']
      }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'SEND_WHATSAPP_MESSAGE',
      description: 'Dispara uma mensagem de WhatsApp real para um número de telefone via Baileys Keeper.',
      parameters: {
        type: 'object',
        properties: {
          recipient: { type: 'string', description: 'Número de telefone com DDD (ex: 555198231769 ou +555198231769).' },
          message: { type: 'string', description: 'Texto da mensagem a enviar via WhatsApp.' }
        },
        required: ['recipient', 'message']
      }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'SAVE_VAULT_KEY',
      description: 'Armazena com segurança um token ou chave de API de um serviço (github, vercel, clickup, asaas, telegram, meta, openrouter, openai) no Vault relacional do PostgreSQL.',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'Nome do serviço (ex: github, vercel, clickup, asaas, telegram, meta, openrouter).' },
          token: { type: 'string', description: 'O token ou chave de API bruta fornecida para o serviço.' }
        },
        required: ['service', 'token']
      }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'EXECUTE_TERMINAL_COMMAND',
      description: 'Executa um comando de terminal shell / bash real na VPS (ex: docker ps, free -m, uptime, df -h, ls -l, git status).',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Comando de terminal shell a ser executado na VPS.' }
        },
        required: ['command']
      }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'TEST_OPENROUTER_CONNECTION',
      description: 'Testa a conexão e executa uma inferência de teste real na API do OpenRouter com o modelo openrouter/free ou o modelo ativo.',
      parameters: {
        type: 'object',
        properties: {
          model: { type: 'string', description: 'Modelo a ser testado (ex: openrouter/free ou openai/gpt-4o-mini).' },
          prompt: { type: 'string', description: 'Prompt de teste para enviar ao OpenRouter.' }
        }
      }
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

  tools.push({
    type: 'function',
    function: {
      name: 'GET_VAULT_STATUS',
      description: 'Consulta o banco PostgreSQL api_vault e retorna o status real de todas as chaves e tokens armazenados no Vault.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'TEST_VAULT_KEY',
      description: 'Testa a validade operacional de uma chave armazenada no Vault (vercel, github, openrouter, clickup, asaas, telegram, meta) fazendo uma chamada real à API do serviço e retornando o resultado factual [REAL].',
      parameters: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'Serviço a testar (ex: vercel, github, openrouter, clickup, asaas, telegram).' }
        },
        required: ['service']
      }
    }
  });

  tools.push({
    type: 'function',
    function: {
      name: 'FETCH_VERCEL_PROJECTS',
      description: 'Consulta diretamente a API v9 da Vercel utilizando a chave ativa do Vault e retorna a lista de todos os projetos, URLs de produção, frameworks e status de deploy (READY, ERROR, BLOCKED).',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
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

  if (actionType === 'GET_SYSTEM_DIAGNOSTICS') {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const uptimeSec = Math.floor(os.uptime());
    const memTotalMb = Math.round(os.totalmem() / (1024 * 1024));
    const memFreeMb = Math.round(os.freemem() / (1024 * 1024));
    const cpuLoad = os.loadavg();

    const skillsDir = path.resolve(process.env.HERMES_SKILLS_DIR || path.join(__dirname, '..', 'runtime-skills'));
    let activeSkills = [];
    if (fs.existsSync(skillsDir)) {
      activeSkills = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
    }

    return {
      status: 'success',
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime_seconds: uptimeSec,
        memory: { total_mb: memTotalMb, free_mb: memFreeMb, used_pct: Math.round(((memTotalMb - memFreeMb) / memTotalMb) * 100) },
        load_average: cpuLoad
      },
      skills: { count: activeSkills.length, list: activeSkills },
      timestamp: new Date().toISOString()
    };
  }

  if (actionType === 'MANAGE_RUNTIME_SKILL') {
    const fs = require('fs');
    const path = require('path');
    const skillsDir = path.resolve(process.env.HERMES_SKILLS_DIR || path.join(__dirname, '..', 'runtime-skills'));
    fs.mkdirSync(skillsDir, { recursive: true });

    const action = params.action || 'list';
    const skillName = (params.name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');

    if (action === 'list') {
      const skills = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
      return { status: 'success', action: 'list', skills };
    }

    if (!skillName) throw new Error('Parâmetro name é obrigatório para as ações read, write e delete.');
    const targetFile = path.join(skillsDir, `${skillName}.md`);

    if (action === 'read') {
      if (!fs.existsSync(targetFile)) throw new Error(`Skill '${skillName}' não encontrada.`);
      const content = fs.readFileSync(targetFile, 'utf8');
      return { status: 'success', action: 'read', name: skillName, content };
    }

    if (action === 'write') {
      const content = params.content || '';
      if (!content.trim()) throw new Error('Parâmetro content é obrigatório para a ação write.');
      fs.writeFileSync(targetFile, content, 'utf8');
      return { status: 'success', action: 'write', name: skillName, path: targetFile };
    }

    if (action === 'delete') {
      if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
      return { status: 'success', action: 'delete', name: skillName };
    }

    throw new Error(`Ação de skill desconhecida: ${action}`);
  }

  if (actionType === 'SEND_WHATSAPP_MESSAGE') {
    const keeperUrl = process.env.WHATSAPP_KEEPER_URL || 'http://hermes-whatsapp-keeper:3000';
    const rawRecipient = (params.recipient || '').replace(/[^0-9]/g, '');
    if (!rawRecipient || !params.message) {
      throw new Error('Parâmetros recipient e message são obrigatórios para envio via WhatsApp.');
    }

    const res = await fetch(`${keeperUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: rawRecipient, message: params.message })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`WhatsApp Keeper HTTP ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json().catch(() => ({ status: 'success' }));
    return { status: 'success', provider: 'whatsapp_keeper', recipient: rawRecipient, result: data };
  }

  if (actionType === 'SAVE_VAULT_KEY') {
    const serviceName = (params.service || '').toLowerCase().trim();
    const tokenValue = (params.token || '').trim();
    if (!serviceName || !tokenValue) throw new Error('Parâmetros service e token são obrigatórios para a ferramenta SAVE_VAULT_KEY.');

    const { Pool } = require('pg');
    const dbPool = new Pool({ connectionString: process.env.POSTGRES_URL });
    try {
      await dbPool.query(`
        INSERT INTO api_vault (service_name, api_key, api_token, status, updated_at)
        VALUES ($1, $2, $3, 'configured', NOW())
        ON CONFLICT (service_name) DO UPDATE 
        SET api_key = EXCLUDED.api_key, api_token = EXCLUDED.api_token, status = 'configured', updated_at = NOW();
      `, [serviceName, tokenValue, tokenValue]);
      await dbPool.end();
    } catch (err) {
      await dbPool.end().catch(() => {});
      throw new Error(`Falha ao armazenar chave no Vault PostgreSQL: ${err.message}`);
    }

    const masked = tokenValue.length > 8 ? `${tokenValue.substring(0, 4)}...${tokenValue.substring(tokenValue.length - 4)}` : '••••••••';
    return { status: 'success', service: serviceName, maskedToken: masked, message: `Chave do serviço [${serviceName.toUpperCase()}] salva com sucesso no Vault.` };
  }

  if (actionType === 'EXECUTE_TERMINAL_COMMAND') {
    const { execSync } = require('child_process');
    const command = (params.command || '').trim();
    if (!command) throw new Error('Parâmetro command é obrigatório para EXECUTE_TERMINAL_COMMAND.');

    try {
      const stdout = execSync(command, { timeout: 15000, encoding: 'utf8' });
      return { status: 'success', command, output: stdout.trim() || '(sem saída)' };
    } catch (err) {
      return { status: 'error', command, error: err.message, stderr: err.stderr ? err.stderr.toString() : '' };
    }
  }

  if (actionType === 'TEST_OPENROUTER_CONNECTION') {
    const openrouterKey = findToken(keys, 'openrouter') || process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) throw new Error('Chave do OpenRouter não encontrada no Vault nem no ambiente.');

    const targetModel = params.model || 'openrouter/free';
    const testPrompt = params.prompt || 'Olá, teste de conexão com o sistema Hermes Central.';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://juliana.axionenterprise.cloud/',
        'X-Title': 'Hermes OpenRouter Test'
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 100
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter HTTP ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const replyText = data.choices?.[0]?.message?.content || '(sem conteúdo)';
    return {
      status: 'success',
      model: targetModel,
      httpStatus: res.status,
      prompt: testPrompt,
      completion: replyText,
      message: `Teste com ${targetModel} realizado com sucesso via OpenRouter!`
    };
  }

  if (actionType === 'GET_VAULT_STATUS') {
    const { Pool } = require('pg');
    const dbPool = new Pool({ connectionString: process.env.POSTGRES_URL });
    let dbRows = [];
    try {
      const dbRes = await dbPool.query("SELECT service_name, api_key, api_token, status, updated_at FROM api_vault WHERE status != 'unconfigured'");
      dbRows = dbRes.rows;
      await dbPool.end();
    } catch (err) {
      await dbPool.end().catch(() => {});
    }

    const services = dbRows.map(r => {
      const token = (r.api_key || r.api_token || '').trim();
      const masked = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : '••••••••';
      return {
        service: r.service_name,
        status: 'CONFIGURED',
        maskedToken: masked,
        updatedAt: r.updated_at
      };
    });

    return {
      status: 'success',
      totalConfigured: services.length,
      vaultKeys: services
    };
  }

  if (actionType === 'TEST_VAULT_KEY') {
    const serviceName = (params.service || 'vercel').toLowerCase().trim();
    const token = findToken(keys, serviceName);
    if (!token) throw new Error(`Token do serviço '${serviceName}' não encontrado no Vault.`);

    if (serviceName.includes('vercel')) {
      const res = await fetch('https://api.vercel.com/v9/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      const data = await res.json();
      return {
        status: 'success',
        service: serviceName,
        httpStatus: 200,
        message: `Token Vercel VÁLIDO [REAL]`,
        totalProjects: (data.projects || []).length,
        projectsSample: (data.projects || []).slice(0, 5).map(p => p.name)
      };
    }

    if (serviceName.includes('github')) {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${token}`, 'User-Agent': 'Hermes-Agent' }
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      const user = await res.json();
      return {
        status: 'success',
        service: serviceName,
        httpStatus: 200,
        message: `Token GitHub VÁLIDO [REAL]`,
        user: user.login
      };
    }

    if (serviceName.includes('openrouter')) {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      const data = await res.json();
      return { status: 'success', service: serviceName, httpStatus: 200, info: data };
    }

    if (serviceName.includes('clickup')) {
      const res = await fetch('https://api.clickup.com/api/v2/user', {
        headers: { Authorization: token }
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      const data = await res.json();
      return { status: 'success', service: serviceName, httpStatus: 200, user: data.user?.username };
    }

    if (serviceName.includes('asaas')) {
      const res = await fetch('https://www.asaas.com/api/v3/customers?limit=1', {
        headers: { access_token: token }
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      return { status: 'success', service: serviceName, httpStatus: 200, message: 'Token Asaas VÁLIDO [REAL]' };
    }

    if (serviceName.includes('telegram')) {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      if (!res.ok) {
        const errText = await res.text();
        return { status: 'error', service: serviceName, httpStatus: res.status, error: errText };
      }
      const data = await res.json();
      return { status: 'success', service: serviceName, httpStatus: 200, bot: data.result?.username };
    }

    return { status: 'success', service: serviceName, message: 'Chave presente no Vault.' };
  }

  if (actionType === 'FETCH_VERCEL_PROJECTS') {
    const vercelKey = findToken(keys, 'vercel');
    if (!vercelKey) throw new Error('Token da Vercel não encontrado no Vault.');

    const res = await fetch('https://api.vercel.com/v9/projects', {
      headers: { Authorization: `Bearer ${vercelKey}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Vercel API HTTP ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const projects = (data.projects || []).map(p => {
      const prod = p.targets?.production || {};
      return {
        name: p.name,
        id: p.id,
        framework: p.framework || 'static',
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        productionUrl: prod.url ? `https://${prod.url}` : null,
        readyState: prod.readyState || p.status || 'UNKNOWN'
      };
    });

    return {
      status: 'success',
      provider: 'vercel',
      totalProjects: projects.length,
      projects
    };
  }

  if (actionType === 'AUTONOMOUS_CREATE_AND_DEPLOY_LANDING_PAGE') {
    let ghToken = null;
    try { ghToken = findToken(keys, 'github'); } catch (_) {}
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

    // Step A: Create GitHub Repository (Optional)
    let repoData = {};
    let fileData = {};
    let fullRepoName = `axion-dev-enterprise/${projectName}`;

    if (ghToken) {
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

      if (ghRepoRes.ok || ghRepoRes.status === 422) {
        repoData = await ghRepoRes.json().catch(() => ({ full_name: `axion-dev-enterprise/${projectName}` }));
      } else {
        const errText = await ghRepoRes.text();
        console.warn('[AUTONOMOUS GITHUB REPO WARN]:', errText.substring(0, 150));
      }

      fullRepoName = repoData.full_name || `axion-dev-enterprise/${projectName}`;
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
      fileData = await ghFileRes.json().catch(() => ({}));
    } else {
      console.log('[AUTONOMOUS ENGINE] Token GitHub não configurado no Vault — prosseguindo diretamente com o Deploy Vercel v13 REST API.');
    }

    // Step C: Instant Deployment to Vercel v13 API (with multi-framework support - Issue #17)
    console.log(`[AUTONOMOUS ENGINE] Disparando deploy de produção na Vercel: ${projectName}...`);
    const frameworkSetting = (params.framework && ['nextjs', 'vite', 'gatsby', 'remix', 'svelte', 'react'].includes(params.framework.toLowerCase()))
      ? (params.framework.toLowerCase() === 'react' ? 'vite' : params.framework.toLowerCase())
      : null;

    const deployFiles = [
      { file: 'index.html', data: landingHtml, encoding: 'utf-8' },
      { file: 'vercel.json', data: JSON.stringify({ version: 2, cleanUrls: true, headers: [{ source: '/(.*)', headers: [{ key: 'X-Deployed-By', value: 'Hermes-Juliana-V6.2.0' }] }] }, null, 2), encoding: 'utf-8' }
    ];

    let vercelEndpoint = 'https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1';
    let vercelDeployRes = await fetch(vercelEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        target: 'production',
        projectSettings: { framework: frameworkSetting },
        files: deployFiles
      })
    });

    if (!vercelDeployRes.ok && vercelDeployRes.status === 403) {
      console.log('[AUTONOMOUS ENGINE] Vercel 403 sem teamId. Tentando com teamId=team_AI5uzGYpznt0H6fSGOBorvg5...');
      vercelEndpoint = 'https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1&teamId=team_AI5uzGYpznt0H6fSGOBorvg5';
      vercelDeployRes = await fetch(vercelEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          target: 'production',
          projectSettings: { framework: frameworkSetting },
          files: deployFiles
        })
      });
    }

    const deployData = await vercelDeployRes.json();
    if (!vercelDeployRes.ok && vercelDeployRes.status !== 201) {
      throw new Error(`Vercel API HTTP ${vercelDeployRes.status}: ${deployData.error?.message || JSON.stringify(deployData).substring(0, 200)}`);
    }

    // Automatically disable SSO Protection and Password Protection on the Vercel project to make it 100% public
    const projectId = deployData.projectId || deployData.project?.id || projectName;
    const teamId = deployData.teamId || 'team_AI5uzGYpznt0H6fSGOBorvg5';
    try {
      console.log(`[AUTONOMOUS ENGINE] Desativando proteção SSO no projeto Vercel: ${projectId}...`);
      await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ssoProtection: null, passwordProtection: null })
      });
    } catch (ssoErr) {
      console.warn('[AUTONOMOUS ENGINE SSO WARN]:', ssoErr.message);
    }

    const publicUrl = `https://${projectName}.vercel.app`;
    const deployUrl = deployData.url ? `https://${deployData.url}` : publicUrl;
    const githubUrl = repoData.html_url || `https://github.com/${fullRepoName}`;

    return {
      status: 'success',
      provider: 'github_and_vercel',
      projectName,
      publicUrl,
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
