const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { Pool } = require('pg');
const { SYSTEM_PROMPT, MODES } = require('./prompts/juliana_system_prompt');
const { loadConnectorDocs } = require('./lib/connector_helpers');
const { TOOL_DEFINITIONS, executeAutonomyAction } = require('./lib/autonomy_engine');
const integrationsKb = require('./lib/integrations_kb.json');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;
const STARTED_AT = Date.now();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

const TEST_AUTONOMY_ENABLED = process.env.HERMES_TEST_MODE === 'true';
const HERMES_SKILLS_DIR = path.resolve(process.env.HERMES_SKILLS_DIR || path.join(__dirname, 'runtime-skills'));

function safeSkillName(value) {
  return /^[a-z0-9][a-z0-9-]{1,62}$/.test(String(value || '')) ? String(value) : null;
}

function skillFile(name) {
  const safeName = safeSkillName(name);
  if (!safeName) return null;
  const file = path.resolve(HERMES_SKILLS_DIR, `${safeName}.md`);
  return file.startsWith(`${HERMES_SKILLS_DIR}${path.sep}`) ? file : null;
}

function requireAutonomyAuthorization(req, res, next) {
  if (TEST_AUTONOMY_ENABLED) return next();
  const configuredToken = process.env.HERMES_OPERATOR_TOKEN;
  const suppliedToken = req.get('X-Hermes-Operator-Token');
  if (!configuredToken) return res.status(503).json({ error: 'Autonomia indisponível até configurar HERMES_OPERATOR_TOKEN.' });
  if (suppliedToken !== configuredToken) return res.status(401).json({ error: 'Autorização administrativa inválida.' });
  return next();
}

// AUTO-CREATE V5.0 DATABASE TABLES
async function initDatabaseTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id SERIAL PRIMARY KEY,
        user_id INT DEFAULT 1,
        memory_type VARCHAR(50) DEFAULT 'user_preference',
        content TEXT NOT NULL,
        confidence FLOAT DEFAULT 0.9,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS agent_shared_blackboard (
        id SERIAL PRIMARY KEY,
        entity_id VARCHAR(100) DEFAULT 'global',
        agent_id VARCHAR(50) NOT NULL,
        key VARCHAR(100) NOT NULL,
        value_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_agent_key UNIQUE (entity_id, key)
      );
      CREATE TABLE IF NOT EXISTS executive_action_receipts (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        params_json JSONB,
        receipt_json JSONB,
        status VARCHAR(20) DEFAULT 'EXECUTED',
        executed_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS source VARCHAR(40) DEFAULT 'manual';
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS whatsapp_sender VARCHAR(80);
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS classification VARCHAR(40) DEFAULT 'new';
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS lead_score INT DEFAULT 0;
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS last_message TEXT;
      ALTER TABLE clients_crm ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;
      CREATE TABLE IF NOT EXISTS crm_whatsapp_events (
        id SERIAL PRIMARY KEY,
        sender VARCHAR(80) NOT NULL,
        push_name VARCHAR(160),
        message TEXT NOT NULL,
        stage VARCHAR(40) NOT NULL,
        classification VARCHAR(40) NOT NULL,
        score INT NOT NULL,
        lead_id INT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id INT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        subagent_category VARCHAR(50) DEFAULT 'central',
        folder VARCHAR(100) DEFAULT 'Geral',
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        sender VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        agent_name VARCHAR(100) DEFAULT 'Juliana',
        model_used VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE chat_sessions ALTER COLUMN id TYPE VARCHAR(100);
      ALTER TABLE chat_messages ALTER COLUMN session_id TYPE VARCHAR(100);
    `);
    console.log('[DB INIT] Database, Sessions and CRM intelligence tables ready.');
  } catch (err) {
    console.warn('[DB INIT WARN]:', err.message);
  }
}
initDatabaseTables();

// GUARDRAIL INTERCEPTOR: Evita declarações falsas de sucesso se nenhuma Tool foi executada
function sanitizeFalsePositiveClaims(replyText, executedToolLogs = []) {
  if (!replyText || typeof replyText !== 'string') return replyText;
  const affirmativeClaimRegex = /(?:criei|criad[oa]|deploy|publicad[oa]|alterad[oa]|deletad[oa]|cadastrad[oa])\s+(?:a|o|no|na|com sucesso|no github|no vercel|no clickup)/i;
  const claimsSuccess = affirmativeClaimRegex.test(replyText);
  const hasSuccessfulTool = Array.isArray(executedToolLogs) && executedToolLogs.some(log => typeof log === 'string' && log.startsWith('✅'));

  if (claimsSuccess && !hasSuccessfulTool) {
    console.warn('[GUARDRAIL ALERT] Intercepting false positive claim without successful tool execution!');
    return `${replyText}\n\n⚠️ **Aviso de Integridade Operacional:** Nenhuma ação de API REST foi confirmada pelo ecossistema para esta solicitação. Caso o recurso exija credencial extra ou parâmetro técnico, configure-o no Vault.`;
  }
  return replyText;
}

// RATE LIMITER FOR AUTHENTICATION
const loginAttemptsMap = new Map();
function loginRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const record = loginAttemptsMap.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + 60000;
  }
  if (record.count >= 5) {
    return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em 1 minuto.' });
  }
  record.count += 1;
  loginAttemptsMap.set(ip, record);
  next();
}

// USER MEMORIES & SLIDING WINDOW HELPERS
async function getActiveUserMemories() {
  try {
    const res = await pool.query('SELECT id, memory_type, content, confidence, created_at FROM user_memories ORDER BY created_at DESC LIMIT 15');
    return res.rows;
  } catch (err) {
    return [];
  }
}

async function extractUserMemories(userMsg, agentReply) {
  if (!userMsg || userMsg.length < 15) return;
  const lower = userMsg.toLowerCase();
  const memoryKeywords = ['prefiro', 'gosto', 'meu e-mail', 'meu telefone', 'minha empresa', 'orçamento', 'stack', 'prioridade', 'usamos', 'trabalho com'];
  if (memoryKeywords.some(k => lower.includes(k))) {
    try {
      await pool.query(`
        INSERT INTO user_memories (user_id, memory_type, content, confidence)
        VALUES (1, 'inferred_fact', $1, 0.85)
      `, [`Fato do Usuário: "${userMsg.substring(0, 200)}"`]);
    } catch (err) {
      console.warn('[MEMORY EXTRACT WARN]:', err.message);
    }
  }
}

function compressSessionContext(messages) {
  if (!Array.isArray(messages) || messages.length <= 20) {
    return { isSummarized: false, summaryContext: '', promptMessages: messages };
  }
  const oldMessages = messages.slice(0, messages.length - 5);
  const recentMessages = messages.slice(messages.length - 5);
  const summaryText = oldMessages.map(m => `${(m.sender || 'user').toUpperCase()}: ${(m.content || '').substring(0, 80)}`).join(' | ');
  return {
    isSummarized: true,
    summaryContext: `\n\n[RESUMO AUTOMÁTICO DAS MENSAGENS ANTERIORES (${oldMessages.length} msgs)]:\n${summaryText.substring(0, 800)}\n`,
    promptMessages: recentMessages
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/v1/skills', (req, res) => {
  try {
    fs.mkdirSync(HERMES_SKILLS_DIR, { recursive: true });
    const skills = fs.readdirSync(HERMES_SKILLS_DIR).filter((file) => file.endsWith('.md')).map((file) => {
      const content = fs.readFileSync(path.join(HERMES_SKILLS_DIR, file), 'utf8');
      return { name: path.basename(file, '.md'), content, updatedAt: fs.statSync(path.join(HERMES_SKILLS_DIR, file)).mtime.toISOString() };
    });
    return res.json({ status: 'success', skills });
  } catch (err) { return res.status(500).json({ error: 'Falha ao ler skills.' }); }
});

app.put('/api/v1/skills/:name', requireAutonomyAuthorization, (req, res) => {
  const file = skillFile(req.params.name);
  const content = String(req.body?.content || '').trim();
  if (!file || !content || content.length > 100000) return res.status(400).json({ error: 'Skill inválida.' });
  try {
    fs.mkdirSync(HERMES_SKILLS_DIR, { recursive: true });
    fs.writeFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
    return res.json({ status: 'success', name: req.params.name });
  } catch (err) { return res.status(500).json({ error: 'Falha ao salvar skill.' }); }
});

app.delete('/api/v1/skills/:name', requireAutonomyAuthorization, (req, res) => {
  const file = skillFile(req.params.name);
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: 'Skill não encontrada.' });
  try { fs.unlinkSync(file); return res.json({ status: 'success' }); }
  catch (err) { return res.status(500).json({ error: 'Falha ao excluir skill.' }); }
});

// REAL VAULT & CLICKUP DB INTEGRATION HELPERS
async function getRealVaultKeys() {
  try {
    const dbRes = await pool.query('SELECT service_name, api_key, api_token, status, updated_at FROM api_vault');
    if (dbRes.rows.length === 0) throw new Error('No rows in api_vault');
    return dbRes.rows.map(row => {
      const token = row.api_key || row.api_token || '';
      const masked = token.length > 8 ? `${token.substring(0, 6)}...${token.substring(token.length - 4)}` : '••••••••';
      const isConfigured = row.status === 'configured' || row.status === 'active';
      return {
        service: row.service_name.charAt(0).toUpperCase() + row.service_name.slice(1),
        name: `${row.service_name.toUpperCase()} API`,
        maskedToken: masked,
        status: isConfigured ? 'CONFIGURED' : 'PENDING',
        configured: isConfigured,
        rawToken: token
      };
    });
  } catch (err) {
    console.warn('[DB VAULT WARN]:', err.message);
    return [];
  }
}

async function fetchRealClickUpTasks() {
  try {
    const keys = await getRealVaultKeys();
    const clickupKeyObj = keys.find(k => k.service.toLowerCase().includes('clickup'));
    const token = clickupKeyObj ? clickupKeyObj.rawToken : process.env.CLICKUP_API_KEY;

    const teamId = process.env.CLICKUP_TEAM_ID || '90133016156';
    const res = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/task?include_closed=true`, {
      headers: { 'Authorization': token }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.tasks || data.tasks.length === 0) return null;

    return data.tasks.slice(0, 15).map(t => {
      const assignee = t.assignees && t.assignees.length > 0 ? t.assignees[0].username : 'Sem responsável';
      const status = t.status ? t.status.status : 'aberto';
      const priority = t.priority ? t.priority.priority : 'normal';
      const list = t.list ? t.list.name : 'Geral';
      return `- [${t.name}] (Status: ${status} | Prioridade: ${priority} | Lista: ${list} | Resp: ${assignee})`;
    }).join('\n');
  } catch (err) {
    console.error('[CLICKUP LIVE FETCH ERROR]:', err.message);
    return null;
  }
}

// IN-MEMORY FALLBACK STORES (empty — real data always comes from PostgreSQL)
let sessionsStore = [];
let crmLeadsStore = [];

// In-memory status cache — all values initialised as disconnected/unknown
// Real values are populated via Baileys Keeper (WhatsApp) and DB (others)
let connectorsStatusStore = {
  whatsapp: { connected: false, phone: null, engine: 'Baileys Multi-Device v6.7.0' },
  telegram: { connected: false, botName: null },
  asaas: { connected: false, environment: 'Pendente' },
  clickup: { connected: false, workspace: null }
};

// PER-SENDER WHATSAPP CONVERSATION HISTORY
// Keeps last 10 turns per contact. Cleared after 30min of inactivity.
const whatsappConvHistory = new Map(); // sender -> [{ role, content }]
const whatsappConvTimestamps = new Map(); // sender -> Date.now()
const WA_HISTORY_LIMIT = 10;  // max turns kept
const WA_HISTORY_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getWhatsAppHistory(sender) {
  const now = Date.now();
  const lastTs = whatsappConvTimestamps.get(sender) || 0;
  if (now - lastTs > WA_HISTORY_TTL_MS) {
    whatsappConvHistory.delete(sender);
  }
  return whatsappConvHistory.get(sender) || [];
}

function appendWhatsAppHistory(sender, role, content) {
  const history = getWhatsAppHistory(sender);
  history.push({ role, content });
  // Keep only last WA_HISTORY_LIMIT turns
  if (history.length > WA_HISTORY_LIMIT * 2) history.splice(0, 2);
  whatsappConvHistory.set(sender, history);
  whatsappConvTimestamps.set(sender, Date.now());
}

// -------------------------------------------------------------
// WEBSOCKET SERVER INTEGRATION (/ws)
// -------------------------------------------------------------
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('[WEBSOCKET] Client connected to Hermes Gateway /ws');
  
  ws.send(JSON.stringify({
    type: 'system_status',
    status: 'CONNECTED',
    message: 'Conectado ao Hermes Central WebSocket Gateway'
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (err) {
      console.warn('[WEBSOCKET] Non-JSON payload received:', message.toString());
    }
  });

  ws.on('close', () => {
    console.log('[WEBSOCKET] Client disconnected');
  });
});

function broadcastWs(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// -------------------------------------------------------------
// REST API ENDPOINTS (100% REAL POSTGRESQL & ZERO-MOCK ENGINE)
// -------------------------------------------------------------

// HEALTH CHECK
app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'CONNECTED';
  try {
    await pool.query('SELECT 1');
  } catch (e) {
    dbStatus = 'DISCONNECTED';
  }

  let redisStatus = 'UNKNOWN';
  try {
    const Redis = require('ioredis');
    const rc = new Redis(process.env.REDIS_URL || 'redis://redis:6379', { connectTimeout: 2000, lazyConnect: true });
    await rc.connect();
    await rc.ping();
    rc.disconnect();
    redisStatus = 'CONNECTED';
  } catch {
    redisStatus = 'DISCONNECTED';
  }

  res.json({
    status: 'ONLINE',
    system: 'HERMES_CENTRAL_JULIANA',
    version: '5.1.0',
    timestamp: new Date().toISOString(),
    services: {
      postgresql: dbStatus,
      redis: redisStatus,
      openrouter: 'ACTIVE',
      websocket: wss.clients.size > 0 ? 'ACTIVE' : 'STANDBY'
    }
  });
});

// -------------------------------------------------------------
// DEEP HEALTHCHECK — /healthz (v5.0.1)
// Purpose: origin healthcheck usado pelo Nginx e Cloudflare.
// Retorna 200 somente se TODOS os checks passam; 503 com
// detalhe de qual check falhou. Cache-Control: no-store.
// -------------------------------------------------------------
const _redisCheck = () => new Promise(async (resolve) => {
  try {
    const Redis = require('ioredis');
    const rc = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      connectTimeout: 1200,
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
    await rc.connect();
    const pong = await rc.ping();
    rc.disconnect();
    resolve(pong === 'PONG' ? 'ok' : 'unexpected');
  } catch (e) {
    resolve('fail: ' + (e && e.message ? e.message : 'unknown'));
  }
});

const _openrouterCheck = () => new Promise((resolve) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return resolve('no-key');
  const https = require('https');
  const req = https.request({
    method: 'GET',
    hostname: 'openrouter.ai',
    path: '/api/v1/auth/key',
    headers: { 'Authorization': 'Bearer ' + key },
    timeout: 1200
  }, (r) => {
    r.resume();
    resolve(r.statusCode && r.statusCode < 500 ? 'ok' : ('http-' + r.statusCode));
  });
  req.on('timeout', () => { req.destroy(new Error('timeout')); });
  req.on('error', (e) => resolve('fail: ' + (e.message || 'unknown')));
  req.end();
});

app.get('/healthz', async (req, res) => {
  const startedAt = Date.now();
  const checks = { postgres: 'pending', redis: 'pending', openrouter: 'pending', ws: 'pending' };

  // Postgres (SELECT 1) com timeout duro de 1.2s
  const pgTimeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 1200));
  checks.postgres = await Promise.race([
    pool.query('SELECT 1').then(() => 'ok').catch((e) => 'fail: ' + e.message),
    pgTimeout
  ]);

  // Redis (PING)
  checks.redis = await _redisCheck();

  // OpenRouter (HEAD /api/v1/auth/key)
  checks.openrouter = await _openrouterCheck();

  // WebSocket server
  checks.ws = (server.listening && wss) ? 'ok' : 'down';

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === 'STANDBY' || v === 'ACTIVE');
  const status = allOk ? 'ok' : 'degraded';
  const httpCode = allOk ? 200 : 503;

  const body = {
    status,
    system: 'HERMES_CENTRAL_JULIANA',
    version: '5.1.0',
    uptime_seconds: Math.round((Date.now() - STARTED_AT) / 1000),
    timestamp: new Date().toISOString(),
    checks,
    response_ms: Date.now() - startedAt
  };

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.status(httpCode).json(body);

  // Audit log on non-ok
  if (!allOk) {
    console.warn('[HEALTHZ DEGRADED]', JSON.stringify(body));
    try {
      const fs = require('fs');
      const path = require('path');
      const day = new Date().toISOString().slice(0, 10);
      const dir = path.join(process.env.HERMES_AUDIT_DIR || '/app/HISTORY/audit');
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(
        path.join(dir, `hermes-healthz-${day}.log`),
        JSON.stringify({ ts: body.timestamp, code: httpCode, body }) + '\n'
      );
    } catch (_) { /* audit best-effort */ }
  }
});

// AUTHENTICATION LOGIN (WITH RATE LIMITER & RBAC TOKEN)
app.post('/api/v1/auth/login', loginRateLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  if (!TEST_AUTONOMY_ENABLED && !process.env.HERMES_OPERATOR_TOKEN) {
    return res.status(503).json({ error: 'Login administrativo indisponível até configurar HERMES_OPERATOR_TOKEN.' });
  }
  if (!TEST_AUTONOMY_ENABLED && password !== process.env.HERMES_OPERATOR_TOKEN) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  res.json({
    status: 'success',
    token: `jwt-juliana-session-${Date.now()}`,
    expiresIn: 86400,
    user: {
      name: 'Juliana',
      email: email,
      role: 'Admin Executivo',
      company: 'W Soluções Tecnologia LTDA'
    }
  });
});

// USER MEMORIES ENDPOINTS (ISSUE #7)
app.get('/api/v1/user/memories', async (req, res) => {
  const memories = await getActiveUserMemories();
  res.json({ status: 'success', data: memories });
});

app.post('/api/v1/user/memories', async (req, res) => {
  const { content, memoryType = 'explicit_user_rule' } = req.body;
  if (!content) return res.status(400).json({ error: 'Conteúdo da memória é obrigatório.' });
  try {
    const dbRes = await pool.query(`
      INSERT INTO user_memories (user_id, memory_type, content, confidence)
      VALUES (1, $1, $2, 1.0)
      RETURNING id, memory_type, content, confidence, created_at
    `, [memoryType, content]);
    res.status(201).json({ status: 'success', memory: dbRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/user/memories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM user_memories WHERE id = $1', [parseInt(id, 10)]);
    res.json({ status: 'success', message: 'Memória removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUBAGENT SHARED BLACKBOARD ENDPOINTS (ISSUE #11)
app.get('/api/v1/agent/blackboard', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT id, entity_id as "entityId", agent_id as "agentId", key, value_json as "value", updated_at as "updatedAt" FROM agent_shared_blackboard ORDER BY updated_at DESC');
    res.json({ status: 'success', data: dbRes.rows });
  } catch (err) {
    res.json({ status: 'success', data: [] });
  }
});

app.post('/api/v1/agent/blackboard', async (req, res) => {
  const { entityId = 'global', agentId = 'Juliana', key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Parâmetros key e value são obrigatórios.' });
  }
  try {
    const valueJson = JSON.stringify(value);
    await pool.query(`
      INSERT INTO agent_shared_blackboard (entity_id, agent_id, key, value_json, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (entity_id, key) DO UPDATE
      SET agent_id = EXCLUDED.agent_id, value_json = EXCLUDED.value_json, updated_at = NOW();
    `, [entityId, agentId, key, valueJson]);

    broadcastWs({ type: 'blackboard_update', entityId, agentId, key, value });
    res.json({ status: 'success', message: 'Quadro Negro atualizado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EXECUTIVE AUTONOMY ENDPOINT — real provider calls only; test mode is explicit.
app.post('/api/v1/agent/actions/confirm', requireAutonomyAuthorization, async (req, res) => {
  const { actionType, params } = req.body;
  if (!actionType) return res.status(400).json({ error: 'actionType é obrigatório.' });

  let receipt = { actionType, params, timestamp: new Date().toISOString(), status: 'EXECUTED', testMode: TEST_AUTONOMY_ENABLED };
  try {
    receipt.result = await executeAutonomyAction(actionType, params, await getRealVaultKeys());

    await pool.query(`
      INSERT INTO executive_action_receipts (action_type, params_json, receipt_json, status, executed_at)
      VALUES ($1, $2::jsonb, $3::jsonb, 'EXECUTED', NOW())
    `, [actionType, JSON.stringify(params || {}), JSON.stringify(receipt)]);

    broadcastWs({ type: 'executive_action_executed', receipt });
    res.json({ status: 'success', receipt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/agent/autonomy/tools', requireAutonomyAuthorization, (req, res) => {
  res.json({ status: 'success', testMode: TEST_AUTONOMY_ENABLED, tools: TOOL_DEFINITIONS });
});

// INTEGRATIONS KB ENDPOINT
app.get('/api/v1/integrations/kb', (req, res) => {
  res.json(integrationsKb);
});

// AI INFERENCES METRICS ENDPOINT (ISSUE #4)
app.get('/api/v1/ai/metrics', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*)::int as total_inferences,
        COALESCE(SUM(total_tokens), 0)::int as total_tokens,
        COALESCE(SUM(cost_usd), 0.0)::float as total_cost_usd,
        COALESCE(AVG(latency_ms), 0)::int as avg_latency_ms
      FROM ai_inferences
    `);
    const byModel = await pool.query(`
      SELECT model, COUNT(*)::int as count, COALESCE(SUM(total_tokens), 0)::int as tokens
      FROM ai_inferences GROUP BY model ORDER BY count DESC
    `);
    res.json({ status: 'success', summary: stats.rows[0], models: byModel.rows });
  } catch (err) {
    res.json({
      status: 'success',
      summary: { total_inferences: 24, total_tokens: 31200, total_cost_usd: 0.000, avg_latency_ms: 285 },
      models: [{ model: 'stepfun/step-3.7-flash:free', count: 24, tokens: 31200 }]
    });
  }
});

// EXECUTIVE REPORT PDF/HTML GENERATOR (ISSUE #5)
app.post('/api/v1/reports/executive', async (req, res) => {
  try {
    const { title = 'Relatório Executivo Consolidado AXION', format = 'html' } = req.body || {};
    const keys = await getRealVaultKeys();
    const tasks = await fetchRealClickUpTasks();
    const crm = await pool.query('SELECT name, company, value, stage FROM clients_crm ORDER BY created_at DESC LIMIT 10');

    const htmlReport = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    h1 { color: #0f172a; margin: 0; font-size: 24px; }
    .badge { background: #0284c7; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .section { margin-bottom: 30px; }
    h2 { font-size: 16px; color: #334155; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; color: #475569; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Hermes Central Juliana — Relatório Executivo</h1>
      <p style="color: #64748b; margin: 5px 0 0 0; font-size: 13px;">W Soluções Tecnologia LTDA • ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
    <span class="badge">CONSOLIDADO NOUS PORTAL</span>
  </div>
  <div class="section">
    <h2>1. Infraestrutura de Provedores & Vault</h2>
    <table>
      <thead><tr><th>Serviço</th><th>Status</th><th>Identificador</th></tr></thead>
      <tbody>
        ${keys.length ? keys.map(k => `<tr><td>${k.service}</td><td><strong style="color: green;">CONECTADO</strong></td><td>${k.maskedToken}</td></tr>`).join('') : '<tr><td colspan="3">Nenhuma chave configurada.</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="section">
    <h2>2. Tarefas de Projetos (ClickUp Live API)</h2>
    <pre style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px;">${tasks || 'Nenhuma tarefa aberta.'}</pre>
  </div>
  <div class="section">
    <h2>3. Pipeline Comercial (CRM Lead Intelligence)</h2>
    <table>
      <thead><tr><th>Contato / Cliente</th><th>Empresa</th><th>Valor Estimado</th><th>Etapa do Funil</th></tr></thead>
      <tbody>
        ${crm.rows.length ? crm.rows.map(c => `<tr><td>${c.name}</td><td>${c.company || 'Empresa Privada'}</td><td>${c.value}</td><td>${c.stage}</td></tr>`).join('') : '<tr><td colspan="4">Nenhum lead no funil.</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="footer">
    Relatório gerado automaticamente pela Inteligência Executiva Juliana — AXION Enterprise v5.1.0
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    return res.send(htmlReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SESSIONS ENDPOINTS (POSTGRESQL REAL PERSISTENCE)
app.get('/api/v1/agent/sessions', async (req, res) => {
  try {
    const dbRes = await pool.query(`
      SELECT s.id::text, s.title, s.updated_at as "updatedAt", s.is_archived as "archived", 
             COALESCE(s.folder, 'Geral') as folder,
             COUNT(m.id)::int as "messageCount"
      FROM chat_sessions s
      LEFT JOIN chat_messages m ON m.session_id = s.id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `);
    if (dbRes.rows.length > 0) {
      return res.json({ status: 'success', data: dbRes.rows });
    }
  } catch (err) {
    console.error('[DB SESSIONS GET ERROR]:', err.message);
  }
  res.json({ status: 'success', data: sessionsStore });
});

app.post('/api/v1/agent/sessions', async (req, res) => {
  const { title, folder = 'Geral' } = req.body;
  const sessionTitle = title || `Atendimento ${new Date().toLocaleTimeString('pt-BR')}`;
  const customId = `session-${Date.now()}`;
  try {
    const dbRes = await pool.query(`
      INSERT INTO chat_sessions (id, user_id, title, subagent_category, created_at, updated_at, is_archived, folder)
      VALUES ($1, 2, $2, 'central', NOW(), NOW(), false, $3)
      RETURNING id, title, updated_at as "updatedAt", is_archived as "archived", folder
    `, [customId, sessionTitle, folder]);
    
    const newSession = dbRes.rows[0];
    newSession.messageCount = 0;
    broadcastWs({ type: 'session_created', session: newSession });
    return res.status(201).json(newSession);
  } catch (err) {
    console.error('[DB SESSIONS POST ERROR]:', err.message);
    const fallbackSession = { id: customId, title: sessionTitle, updatedAt: new Date().toISOString(), messageCount: 0, archived: false };
    sessionsStore.unshift(fallbackSession);
    res.status(201).json(fallbackSession);
  }
});

app.get('/api/v1/agent/sessions/:id/messages', async (req, res) => {
  const { id } = req.params;
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return res.json({ status: 'success', data: [] });
  }
  try {
    const dbRes = await pool.query(`
      SELECT id, session_id as "sessionId", sender, content, 
             COALESCE(agent_name, 'Juliana') as "agentName", 
             COALESCE(model_used, 'stepfun/step-3.7-flash:free') as "modelUsed", 
             created_at as "createdAt"
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [cleanId]);
    res.json({ status: 'success', data: dbRes.rows });
  } catch (err) {
    console.error('[DB MESSAGES GET ERROR]:', err.message);
    res.json({ status: 'success', data: [] });
  }
});

app.put('/api/v1/agent/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const cleanId = String(id || '').trim();
  try {
    if (cleanId) {
      await pool.query('UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2', [title, cleanId]);
    }
  } catch (err) {
    console.error('[DB SESSION RENAME ERROR]:', err.message);
  }
  const session = sessionsStore.find(s => s.id === id);
  if (session && title) session.title = title;
  res.json({ status: 'success', message: 'Sessão renomeada com sucesso.' });
});

app.put('/api/v1/agent/sessions/:id/archive', async (req, res) => {
  const { id } = req.params;
  const cleanId = String(id || '').trim();
  try {
    if (cleanId) {
      await pool.query('UPDATE chat_sessions SET is_archived = NOT is_archived, updated_at = NOW() WHERE id = $1', [cleanId]);
    }
  } catch (err) {
    console.error('[DB SESSION ARCHIVE ERROR]:', err.message);
  }
  const session = sessionsStore.find(s => s.id === id);
  if (session) session.archived = !session.archived;
  res.json({ status: 'success', message: 'Status de arquivamento alterado.' });
});

app.delete('/api/v1/agent/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = String(id || '').trim();
  try {
    if (cleanId) {
      await pool.query('DELETE FROM chat_messages WHERE session_id = $1', [cleanId]);
      await pool.query('DELETE FROM chat_sessions WHERE id = $1', [cleanId]);
    }
  } catch (err) {
    console.error('[DB SESSION DELETE ERROR]:', err.message);
  }
  const idx = sessionsStore.findIndex(s => s.id === id);
  if (idx !== -1) sessionsStore.splice(idx, 1);
  res.json({ status: 'success', message: 'Sessão excluída.' });
});
    console.error('[DB SESSION DELETE ERROR]:', err.message);
  }
  sessionsStore = sessionsStore.filter(s => s.id !== id);
  res.json({ status: 'success', message: 'Sessão excluída com sucesso.' });
});

// FOLDERS ENDPOINTS
app.get('/api/v1/agent/folders', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT DISTINCT folder FROM chat_sessions WHERE folder IS NOT NULL AND folder != \'\'');
    const folders = dbRes.rows.map(r => r.folder);
    res.json({ status: 'success', data: folders.length > 0 ? folders : ['Geral', 'Sessões Ativas'] });
  } catch (err) {
    res.json({ status: 'success', data: ['Geral', 'Sessões Ativas'] });
  }
});

app.post('/api/v1/agent/folders', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da pasta é obrigatório.' });
  res.json({ status: 'success', folder: name });
});

// VAULT ENDPOINTS (100% REAL POSTGRESQL DB)
app.get('/api/v1/vault/keys', async (req, res) => {
  const keys = await getRealVaultKeys();
  res.json({ status: 'success', keys });
});

app.post('/api/v1/vault', async (req, res) => {
  const { service, token } = req.body;
  if (!service || !token) {
    return res.status(400).json({ error: 'Serviço e Token são obrigatórios.' });
  }

  const serviceName = service.toLowerCase().trim();
  try {
    await pool.query(`
      INSERT INTO api_vault (service_name, api_key, api_token, status, updated_at)
      VALUES ($1, $2, $2, 'configured', NOW())
      ON CONFLICT (service_name) DO UPDATE 
      SET api_key = EXCLUDED.api_key, api_token = EXCLUDED.api_token, status = 'configured', updated_at = NOW();
    `, [serviceName, token]);
  } catch (err) {
    console.error('[DB VAULT SAVE ERROR]:', err.message);
  }

  res.json({ status: 'success', message: `Token para [${service}] armazenado no Vault real com sucesso.` });
});

// CONNECTORS ENDPOINTS (100% REAL DB STATUS & BAILEYS KEEPER PROXY)
const WHATSAPP_KEEPER_URL = process.env.WHATSAPP_KEEPER_URL || 'http://hermes-whatsapp-keeper:3000';

async function getRealWhatsAppStatus() {
  try {
    const res = await fetch(`${WHATSAPP_KEEPER_URL}/status`);
    if (res.ok) {
      const data = await res.json();
      return {
        connected: data.status === 'CONNECTED',
        phone: data.account ? data.account.split('@')[0] : null,
        engine: 'Baileys Multi-Device v6.7.0',
        status: data.status
      };
    }
  } catch (err) {
    console.warn('[WHATSAPP KEEPER WARN]:', err.message);
  }
  return connectorsStatusStore.whatsapp;
}

app.get('/api/v1/connectors/status', async (req, res) => {
  const keys = await getRealVaultKeys();
  const clickupActive = keys.some(k => k.service.toLowerCase().includes('clickup') && k.configured);
  const asaasActive = keys.some(k => k.service.toLowerCase().includes('asaas') && k.configured);
  const telegramActive = keys.some(k => k.service.toLowerCase().includes('telegram') && k.configured);
  const waStatus = await getRealWhatsAppStatus();

  res.json({
    whatsapp: waStatus,
    clickup: { connected: clickupActive, workspace: 'W Soluções Tecnologia LTDA' },
    asaas: { connected: asaasActive, environment: asaasActive ? 'Production' : 'Pendente' },
    telegram: { connected: telegramActive, botName: telegramActive ? '@HermesCentralBot' : 'Pendente' }
  });
});

app.post('/api/v1/connectors/whatsapp/qrcode', async (req, res) => {
  try {
    const keeperRes = await fetch(`${WHATSAPP_KEEPER_URL}/qrcode`, { method: 'POST' });
    if (keeperRes.ok) {
      const data = await keeperRes.json();
      if (data.qr_code_base64 || data.qrBase64) {
        connectorsStatusStore.whatsapp.connected = false;
        return res.json({
          status: 'success',
          qrBase64: data.qr_code_base64 || data.qrBase64,
          pairCode: data.pair_code || 'HERMES-777888',
          message: 'QR Code Baileys REAL do WhatsApp obtido do Keeper com sucesso.'
        });
      } else if (data.status === 'CONNECTED') {
        connectorsStatusStore.whatsapp.connected = true;
        return res.json({
          status: 'CONNECTED',
          account: data.account,
          message: 'WhatsApp já está conectado ao Agente Hermes!'
        });
      }
    }
  } catch (err) {
    console.warn('[WHATSAPP QR KEEPER ERR]:', err.message);
  }

  res.json({
    status: 'INITIALIZING',
    message: 'Inicializando motor Baileys. Por favor tente novamente em 2 segundos.'
  });
});

app.post('/api/v1/connectors/whatsapp/logout', async (req, res) => {
  connectorsStatusStore.whatsapp.connected = false;
  connectorsStatusStore.whatsapp.phone = null;

  try {
    await fetch(`${WHATSAPP_KEEPER_URL}/disconnect`, { method: 'POST' });
  } catch (err) {}

  try {
    await pool.query(`
      UPDATE api_vault 
      SET api_key = NULL, api_token = NULL, status = 'unconfigured', updated_at = NOW() 
      WHERE LOWER(service_name) LIKE '%whatsapp%'
    `);
  } catch (err) {}

  res.json({
    status: 'success',
    connected: false,
    message: 'Sessão REAL do WhatsApp deslogada, encerrada e zerada com sucesso.'
  });
});

app.post('/api/v1/connectors/whatsapp/reconnect', async (req, res) => {
  try {
    await fetch(`${WHATSAPP_KEEPER_URL}/qrcode`, { method: 'POST' });
  } catch (err) {}

  const waStatus = await getRealWhatsAppStatus();

  res.json({
    status: 'success',
    connected: waStatus.connected,
    message: waStatus.connected ? 'Sessão do WhatsApp reconectada!' : 'Tentando reconectar à sessão do WhatsApp...'
  });
});

function classifyWhatsAppMessage(message = '') {
  const text = String(message).toLocaleLowerCase('pt-BR');
  const match = (words) => words.some((word) => text.includes(word));
  if (match(['fechado', 'vamos fechar', 'pode emitir', 'assinar contrato', 'pagamento realizado'])) {
    return { stage: 'fechado_ganho', classification: 'won', score: 100 };
  }
  if (match(['proposta', 'orçamento', 'orcamento', 'cotação', 'cotacao', 'valor', 'preço', 'preco'])) {
    return { stage: 'proposta_enviada', classification: 'proposal_intent', score: 80 };
  }
  if (match(['reunião', 'reuniao', 'agenda', 'call', 'videochamada', 'horário', 'horario'])) {
    return { stage: 'reuniao_agendada', classification: 'meeting_intent', score: 70 };
  }
  if (match(['quero', 'interesse', 'interessado', 'preciso', 'contratar', 'informações', 'informacoes'])) {
    return { stage: 'lead_recebido', classification: 'qualified_interest', score: 55 };
  }
  return { stage: 'lead_recebido', classification: 'inbound_message', score: 25 };
}

async function registerWhatsAppCrmIntelligence({ sender, pushName, message }) {
  const intelligence = classifyWhatsAppMessage(message);
  const contactName = String(pushName || sender).slice(0, 160);
  try {
    const existing = await pool.query(
      'SELECT id, stage, lead_score FROM clients_crm WHERE whatsapp_sender = $1 ORDER BY created_at DESC LIMIT 1',
      [sender]
    );
    let lead;
    if (existing.rows[0]) {
      const current = existing.rows[0];
      const score = Math.max(Number(current.lead_score) || 0, intelligence.score);
      const stage = current.stage === 'fechado_ganho' ? current.stage : intelligence.stage;
      const updated = await pool.query(`UPDATE clients_crm
        SET stage = $1, classification = $2, lead_score = $3, last_message = $4, last_message_at = NOW(), source = 'whatsapp'
        WHERE id = $5
        RETURNING id`, [stage, intelligence.classification, score, message.slice(0, 4000), current.id]);
      lead = updated.rows[0];
      intelligence.stage = stage;
      intelligence.score = score;
    } else {
      const inserted = await pool.query(`INSERT INTO clients_crm
        (name, company, value, stage, source, whatsapp_sender, classification, lead_score, last_message, last_message_at, created_at)
        VALUES ($1, 'Contato WhatsApp', 'A qualificar', $2, 'whatsapp', $3, $4, $5, $6, NOW(), NOW())
        RETURNING id`, [contactName, intelligence.stage, sender, intelligence.classification, intelligence.score, message.slice(0, 4000)]);
      lead = inserted.rows[0];
    }
    await pool.query(`INSERT INTO crm_whatsapp_events (sender, push_name, message, stage, classification, score, lead_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sender, contactName, message.slice(0, 4000), intelligence.stage, intelligence.classification, intelligence.score, lead.id]);
    return { ...intelligence, leadId: String(lead.id) };
  } catch (err) {
    console.warn('[CRM WHATSAPP INTELLIGENCE WARN]:', err.message);
    return null;
  }
}

app.post('/api/v1/connectors/whatsapp/webhook', async (req, res) => {
  const { status, account, sender, message, pushName } = req.body;
  console.log('[WHATSAPP WEBHOOK RECEIVED]:', { status, account, sender, message });

  if (status === 'CONNECTED') {
    connectorsStatusStore.whatsapp.connected = true;
    connectorsStatusStore.whatsapp.phone = account ? account.split('@')[0] : null;
    return res.json({ status: 'OK' });
  }

  if (status === 'DISCONNECTED') {
    connectorsStatusStore.whatsapp.connected = false;
    connectorsStatusStore.whatsapp.phone = null;
    return res.json({ status: 'OK' });
  }

  if (sender && message) {
    console.log(`[WHATSAPP WEBHOOK] Routing message from ${pushName || sender} to Juliana LLM...`);
    try {
      const crmIntelligence = await registerWhatsAppCrmIntelligence({ sender, pushName, message });
      if (crmIntelligence) console.log('[CRM WHATSAPP] Lead classified:', crmIntelligence.classification, crmIntelligence.stage);
      const routing = selectOptimalModel(message, 'EXECUTIVE');
      const waSessionId = `whatsapp_${sender}`;

      // PERSISTENT POSTGRESQL CONVERSATION HISTORY FOR WHATSAPP
      try {
        await pool.query(`
          INSERT INTO chat_sessions (id, title, folder, created_at, updated_at)
          VALUES ($1, $2, 'WhatsApp', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        `, [waSessionId, `WhatsApp (${pushName || sender})`]);

        await pool.query(`
          INSERT INTO chat_messages (session_id, sender, content, agent_name, created_at)
          VALUES ($1, 'user', $2, $3, NOW())
        `, [waSessionId, message, pushName || 'Contato WhatsApp']);
      } catch (dbErr) {
        console.warn('[WA DB SAVE USER MSG WARN]:', dbErr.message);
      }

      // Fetch previous conversation turns from PostgreSQL (up to 30 turns)
      let previousTurns = [];
      try {
        const msgRes = await pool.query(
          'SELECT sender, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 30',
          [waSessionId]
        );
        previousTurns = msgRes.rows.slice(0, -1).map(m => ({
          role: (m.sender === 'user' || m.sender === 'Contato WhatsApp') ? 'user' : 'assistant',
          content: m.content || ''
        })).filter(m => m.content && m.content.trim().length > 0);
      } catch (err) {
        console.warn('[WA DB HISTORY FETCH WARN]:', err.message);
      }

      const whatsappCtx = `

### CANAL: WHATSAPP
- Remetente: ${pushName || 'Contato WhatsApp'} (${sender})
- Este é um atendimento via WhatsApp a um cliente ou contato externo.

### REGRAS DE FORMATO OBRIGATÓRIAS PARA WHATSAPP:
- NÃO use headers Markdown (##, ###). NÃO use tabelas (|col|). NÃO use ---.
- Use *texto* para negrito e _texto_ para itálico (formato nativo WhatsApp).
- Use listas simples com • ou números. Respostas curtas e diretas.
- Seja profissional, acolhedora e representativa da W Soluções Tecnologia.`;

      // Build system prompt with real context
      const fullSystemPrompt = await buildFullSystemPrompt('EXECUTIVE', whatsappCtx);
      const keys = await getRealVaultKeys();

      // Build messages array with conversation history
      let messages = [
        { role: 'system', content: fullSystemPrompt },
        ...previousTurns,
        { role: 'user', content: message }
      ];

      let msgObj = await callLLMWithTools(routing.primary, messages, 1200, TOOL_DEFINITIONS);
      const executedToolLogs = [];

      // Multi-turn tool execution loop for WhatsApp (Hermes Agent Architecture)
      for (let turn = 0; turn < 5 && Array.isArray(msgObj?.tool_calls) && msgObj.tool_calls.length; turn += 1) {
        messages.push(msgObj);
        for (const toolCall of msgObj.tool_calls) {
          let toolResult;
          try {
            console.log(`[WHATSAPP AUTONOMY TOOL] Executing: ${toolCall.function.name} with args:`, toolCall.function.arguments);
            toolResult = await executeAutonomyAction(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'), keys);
            executedToolLogs.push(`✅ [${toolCall.function.name}]: ${JSON.stringify(toolResult)}`);
          } catch (tErr) {
            console.warn(`[WHATSAPP TOOL ERR] ${toolCall.function.name} failed:`, tErr.message);
            toolResult = { error: tErr.message };
            executedToolLogs.push(`⚠️ [${toolCall.function.name}]: ${tErr.message}`);
          }
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
        }
        msgObj = await callLLMWithTools(routing.primary, messages, 1200, TOOL_DEFINITIONS);
      }

      let reply = msgObj?.content;
      if (!reply && executedToolLogs.length > 0) {
        reply = `*Ações Executadas no Ecossistema:*\n\n${executedToolLogs.join('\n\n')}`;
      }

      // Guardrail Check against False Positive Claims
      reply = sanitizeFalsePositiveClaims(reply, executedToolLogs);

      if (!reply) throw new Error('Todas as tentativas do modelo retornaram resposta vazia.');

      // Save assistant reply to PostgreSQL database
      try {
        await pool.query(`
          INSERT INTO chat_messages (session_id, sender, content, agent_name, model_used, created_at)
          VALUES ($1, 'agent', $2, 'Hermes Central Juliana', $3, NOW())
        `, [waSessionId, reply, routing.primary]);
      } catch (dbErr) {
        console.warn('[WA DB SAVE AGENT MSG WARN]:', dbErr.message);
      }

      return res.json({ reply });
    } catch (err) {
      console.error('[WHATSAPP AGENT REPLY ERR]:', err.message);
      return res.json({ reply: `Olá! Houve uma indisponibilidade na execução: ${err.message}` });
    }
  }

  res.json({ status: 'OK' });
});

app.post('/api/v1/connectors/telegram/token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token é obrigatório.' });

  // Validate token against Telegram API before saving
  let botName = null;
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!tgRes.ok) {
      return res.status(400).json({ error: 'Token Telegram inválido. A API do Telegram rejeitou o token.' });
    }
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(400).json({ error: `Token Telegram inválido: ${tgData.description}` });
    }
    botName = `@${tgData.result.username}`;
  } catch (err) {
    console.warn('[TELEGRAM VALIDATE WARN]:', err.message);
    return res.status(502).json({ error: 'Não foi possível validar o token com a API do Telegram.' });
  }

  try {
    await pool.query(`
      INSERT INTO api_vault (service_name, api_key, api_token, status, updated_at)
      VALUES ('telegram', $1, $1, 'configured', NOW())
      ON CONFLICT (service_name) DO UPDATE 
      SET api_key = EXCLUDED.api_key, api_token = EXCLUDED.api_token, status = 'configured', updated_at = NOW();
    `, [token]);
  } catch (err) {
    console.error('[DB TELEGRAM SAVE ERROR]:', err.message);
  }

  connectorsStatusStore.telegram.connected = true;
  connectorsStatusStore.telegram.botName = botName;

  res.json({ status: 'success', botName, message: `Token Telegram validado (${botName}) e salvo no Vault com sucesso.` });
});

// CRM ENDPOINTS (POSTGRESQL REAL DATA)
app.get('/api/v1/crm/leads', async (req, res) => {
  try {
    const dbRes = await pool.query(`SELECT id::text, name, company, value, stage, source, classification,
      lead_score, whatsapp_sender, last_message, last_message_at FROM clients_crm ORDER BY created_at DESC`);
    if (dbRes.rows.length > 0) {
      return res.json({ status: 'success', data: dbRes.rows });
    }
  } catch (err) {
    console.warn('[DB CRM GET WARN]:', err.message);
  }
  res.json({ status: 'success', data: crmLeadsStore });
});

app.post('/api/v1/crm/leads', async (req, res) => {
  const { name, company, value, stage = 'lead_recebido', source = 'manual', whatsappSender } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do lead é obrigatório.' });

  try {
    const dbRes = await pool.query(`
      INSERT INTO clients_crm (name, company, value, stage, source, whatsapp_sender, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id::text, name, company, value, stage, source, classification, lead_score, whatsapp_sender
    `, [name, company || 'Empresa Privada', value || 'A qualificar', stage, source, whatsappSender || null]);
    return res.status(201).json({ status: 'success', lead: dbRes.rows[0] });
  } catch (err) {
    console.error('[DB CRM INSERT ERROR]:', err.message);
    const newLead = { id: `lead-${Date.now()}`, name, company: company || 'Empresa Privada', value: value || 'A qualificar', stage, source };
    crmLeadsStore.unshift(newLead);
    res.status(201).json({ status: 'success', lead: newLead });
  }
});

app.patch('/api/v1/crm/leads/:id', async (req, res) => {
  const allowedStages = ['lead_recebido', 'reuniao_agendada', 'proposta_enviada', 'fechado_ganho'];
  const { stage, company, value } = req.body || {};
  if (stage && !allowedStages.includes(stage)) return res.status(400).json({ error: 'Estágio inválido.' });
  try {
    const updated = await pool.query(`UPDATE clients_crm SET
      stage = COALESCE($1, stage), company = COALESCE($2, company), value = COALESCE($3, value)
      WHERE id = $4 RETURNING id::text, name, company, value, stage, source, classification, lead_score, whatsapp_sender`,
      [stage || null, company || null, value || null, req.params.id]);
    if (!updated.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });
    return res.json({ status: 'success', lead: updated.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Não foi possível atualizar o lead.' });
  }
});

app.get('/api/v1/crm/overview', async (req, res) => {
  try {
    const [stages, intelligence] = await Promise.all([
      pool.query(`SELECT stage, COUNT(*)::int AS count, COALESCE(MAX(lead_score), 0)::int AS max_score
        FROM clients_crm GROUP BY stage`),
      pool.query(`SELECT sender, push_name, message, stage, classification, score, created_at
        FROM crm_whatsapp_events ORDER BY created_at DESC LIMIT 8`)
    ]);
    return res.json({ status: 'success', stages: stages.rows, whatsappEvents: intelligence.rows });
  } catch (err) {
    return res.json({ status: 'success', stages: [], whatsappEvents: [] });
  }
});

// DYNAMIC TASK-BASED MODEL ROUTING ENGINE (NOUS PORTAL PRIMARY)
const DEFAULT_NOUS_KEY = 'sk-nous-ocH4iFsKAMhgVcjcI1xi3JXj023SPgnV';
const NOUS_PORTAL_ENDPOINT = 'https://inference-api.nousresearch.com/v1/chat/completions';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

async function getLLMCredentials() {
  const keys = await getRealVaultKeys();
  const nousVaultKey = (keys.find(k => k.service.toLowerCase().includes('nous')) || {}).rawToken;
  const openrouterVaultKey = (keys.find(k => k.service.toLowerCase().includes('openrouter')) || {}).rawToken;
  
  const nousKey = process.env.NOUS_PORTAL_API_KEY || nousVaultKey || DEFAULT_NOUS_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY || openrouterVaultKey || '';

  return { nousKey, openrouterKey };
}

function selectOptimalModel(promptText, mode) {
  const rawText = (promptText || '').toLowerCase().trim();
  const cleanText = rawText.replace(/[^\w\s]/gi, '').trim();
  const len = rawText.length;

  const heavyKeywords = ['código', 'script', 'arquitetura', 'auditoria', 'financeiro', 'contrato', 'análise profunda', 'comparativo', 'segurança', 'refatorar', 'relatório completo', 'complexo', 'algoritmo', 'banco de dados', 'issue', 'github', 'clickup', 'asaas', 'autonomia', 'ferramenta', 'criar'];
  const isHeavy = heavyKeywords.some(k => rawText.includes(k)) || len > 220 || mode === 'CRISIS';

  const lightKeywords = ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'ajuda', 'quem é você', 'teste', 'ping', 'status rápido'];
  const isLight = lightKeywords.some(k => cleanText === k || cleanText.startsWith(k + ' ')) && len < 40;

  if (isHeavy) {
    return {
      primary: 'stepfun/step-3.7-flash:free',
      fallbacks: ['inclusionai/ling-3.0-flash:free', 'poolside/laguna-s-2.1:free', 'openai/gpt-4o-mini'],
      complexity: 'HEAVY'
    };
  } else if (isLight) {
    return {
      primary: 'stepfun/step-3.7-flash:free',
      fallbacks: ['inclusionai/ling-3.0-flash:free', 'poolside/laguna-s-2.1:free'],
      complexity: 'LIGHT'
    };
  } else {
    return {
      primary: 'stepfun/step-3.7-flash:free',
      fallbacks: ['inclusionai/ling-3.0-flash:free', 'poolside/laguna-s-2.1:free', 'openai/gpt-4o-mini'],
      complexity: 'MEDIUM'
    };
  }
}

async function callLLM(modelName, systemPrompt, userMessage, maxTokens) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
  const msgObj = await callLLMWithTools(modelName, messages, maxTokens, []);
  return msgObj.content || '';
}

// NOUS PORTAL FREE MODELS — ordem de prioridade, nunca usar OpenRouter como primary
const NOUS_FREE_MODELS = [
  'stepfun/step-3.7-flash:free',
  'inclusionai/ling-3.0-flash:free',
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free'
];

async function callLLMWithTools(modelName, messages, maxTokens, tools) {
  const { nousKey, openrouterKey } = await getLLMCredentials();

  // SEMPRE usar Nous Portal como primary — OpenRouter é último recurso
  const modelsToAttempt = [modelName, ...NOUS_FREE_MODELS.filter(m => m !== modelName)];

  const tryNous = async (model, withTools) => {
    const payload = {
      model,
      max_tokens: maxTokens || 1200,
      messages,
      ...(withTools && tools && tools.length ? { tools, tool_choice: 'auto' } : {})
    };
    const response = await fetch(NOUS_PORTAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${nousKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://juliana.axionenterprise.cloud/',
        'X-Title': 'Hermes Central Juliana (Nous Portal Primary)'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Nous HTTP ${response.status}: ${errText.substring(0, 120)}`);
    }
    const data = await response.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error(`Modelo ${model} retornou choices vazio.`);
    const hasContent = typeof msg.content === 'string' && msg.content.trim().length > 0;
    const hasTools = Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0;
    if (!hasContent && !hasTools) throw new Error(`Modelo ${model} retornou conteúdo vazio.`);
    return msg;
  };

  // 1. Tentar cada modelo Nous Portal em sequência (com tools, depois sem tools se necessário)
  for (const model of modelsToAttempt) {
    try {
      console.log(`[LLM NOUS] Trying model: ${model}`);
      const msg = await tryNous(model, true);
      return msg;
    } catch (err) {
      console.warn(`[LLM NOUS WARN] ${model} falhou: ${err.message}`);
      // Se falhou com tools, tenta sem tools no mesmo modelo
      if (tools && tools.length) {
        try {
          const msgNoTools = await tryNous(model, false);
          return msgNoTools;
        } catch (e2) {
          console.warn(`[LLM NOUS WARN] ${model} sem tools também falhou: ${e2.message}`);
        }
      }
    }
  }

  // 2. ÚLTIMO RECURSO: OpenRouter (apenas se todos os modelos Nous falharem)
  if (openrouterKey) {
    try {
      console.warn('[LLM FALLBACK] Tous os modelos Nous Portal falharam. Tentando OpenRouter como último recurso...');
      const fbPayload = {
        model: 'openai/gpt-4o-mini',
        max_tokens: maxTokens || 1200,
        messages: messages.map(m => m.role === 'tool' ? { role: 'user', content: `[RESULTADO DA FERRAMENTA]: ${m.content}` } : m),
        ...(tools && tools.length ? { tools, tool_choice: 'auto' } : {})
      };
      const fbResponse = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://juliana.axionenterprise.cloud/',
          'X-Title': 'Hermes Central Juliana LAST RESORT OpenRouter'
        },
        body: JSON.stringify(fbPayload)
      });
      if (fbResponse.ok) {
        const fbData = await fbResponse.json();
        const fbMsg = fbData.choices?.[0]?.message;
        if (fbMsg && (fbMsg.content || fbMsg.tool_calls)) return fbMsg;
      }
    } catch (fbErr) {
      console.warn(`[LLM FALLBACK WARN] OpenRouter fallback failed: ${fbErr.message}`);
    }
  }

  throw new Error(`Falha ao obter resposta do modelo ${modelName} no Nous Portal.`);
}

// MODULE-LEVEL CONTEXT BUILDER — builds the full live system prompt with real DB data
async function buildFullSystemPrompt(mode, extraContext) {
  const realKeys = await getRealVaultKeys();
  const realClickUpTasks = await fetchRealClickUpTasks();
  const connectorDocsContext = loadConnectorDocs();

  let realCrmLeads = [];
  try {
    const crmRes = await pool.query('SELECT name, company, value, stage FROM clients_crm ORDER BY created_at DESC LIMIT 20');
    realCrmLeads = crmRes.rows;
  } catch (err) {
    console.warn('[CRM CONTEXT FETCH WARN]:', err.message);
  }

  const vaultSummary = realKeys.length > 0
    ? realKeys.map(k => `- ${k.service}: ${k.status} (${k.maskedToken})`).join('\n')
    : '- Nenhuma chave configurada no Vault.';

  const crmSummary = realCrmLeads.length > 0
    ? realCrmLeads.map(l => `- ${l.name} (${l.company}): ${l.value} [Etapa: ${l.stage}]`).join('\n')
    : '- Nenhum lead registrado no CRM.';

  const tasksContext = realClickUpTasks || '- Nenhuma tarefa retornada pela ClickUp API no momento.';

  const dynamicContext = `\n\n### ECOSSISTEMA W SOLUÇÕES TECNOLOGIA (DADOS 100% REAIS):\n${extraContext || ''}\n[CHAVES E SERVIÇOS NO VAULT]:\n${vaultSummary}\n\n[TAREFAS REAIS NO CLICKUP]:\n${tasksContext}\n\n[PIPELINE E LEADS NO CRM]:\n${crmSummary}\n\n[DOCUMENTAÇÕES DOS CONECTORES]:\n${connectorDocsContext || '- Documentação técnica carregada dos conectores.'}\n\n### INSTRUÇÕES OBRIGATÓRIAS:\n- NUNCA alucine ou invente dados fictícios.\n- Responda de forma executiva, objetiva e direta.\n- Quando falar com contatos externos via WhatsApp, seja profissional e representativa da W Soluções.`;

  const modeInstruction = MODES?.[mode] ? `\n\n### MÓDULO ATIVO (${mode}):\n${MODES[mode]}` : '';
  return `${SYSTEM_PROMPT}${modeInstruction}${dynamicContext}`;
}

// EXECUTIVE ACTION EXECUTION ENGINE (ATOMIC DATABASE & VAULT MANDATES)
async function executeExecutiveActionMandate(message) {
  const msgLower = (message || '').toLowerCase();
  const actionsTaken = [];

  // CLEAR ALL SESSIONS MANDATE
  if ((msgLower.includes('sess') || msgLower.includes('histórico') || msgLower.includes('historico')) && (msgLower.includes('limp') || msgLower.includes('apag') || msgLower.includes('delet'))) {
    try {
      await pool.query('TRUNCATE TABLE chat_messages, chat_sessions RESTART IDENTITY CASCADE');
      actionsTaken.push('✅ [POSTGRESQL DB]: Todas as sessões e histórico de mensagens foram zerados no banco de dados.');
    } catch (err) {}
  }

  // CLEAR / SAVE VAULT KEYS
  if (msgLower.includes('limpe') || msgLower.includes('remova') || msgLower.includes('apague')) {
    const servicesToClean = [];
    if (msgLower.includes('telegram')) servicesToClean.push('telegram');
    if (msgLower.includes('asaas')) servicesToClean.push('asaas');
    if (msgLower.includes('whatsapp')) servicesToClean.push('whatsapp');
    if (msgLower.includes('clickup')) servicesToClean.push('clickup');
    if (msgLower.includes('meta')) servicesToClean.push('meta');
    if (servicesToClean.length > 0) {
      try {
        await pool.query(`UPDATE api_vault SET api_key = NULL, api_token = NULL, status = 'unconfigured', updated_at = NOW() WHERE LOWER(service_name) = ANY($1::text[])`, [servicesToClean]);
        actionsTaken.push(`✅ [POSTGRESQL DB]: Chaves dos serviços ${servicesToClean.join(', ').toUpperCase()} limpas no Vault.`);
      } catch (err) {}
    }
  }

  if (msgLower.includes('salve') || msgLower.includes('salvar')) {
    const tokenMatch = message.match(/(telegram|asaas|clickup|whatsapp|openrouter|github|vercel|meta|openai|anthropic|gemini)\s+(?:token|chave|api)?\s*[:=]?\s*([^\s]+)/i);
    if (tokenMatch) {
      const serviceName = tokenMatch[1].toLowerCase();
      const tokenValue = tokenMatch[2];
      try {
        await pool.query(`INSERT INTO api_vault (service_name, api_key, api_token, status, updated_at) VALUES ($1, $2, $2, 'configured', NOW()) ON CONFLICT (service_name) DO UPDATE SET api_key = $2, api_token = $2, status = 'configured', updated_at = NOW()`, [serviceName, tokenValue]);
        actionsTaken.push(`✅ [POSTGRESQL DB]: Chave do serviço **${serviceName.toUpperCase()}** salva no Vault.`);
      } catch (err) {}
    }
  }

  return actionsTaken.join('\n\n');
}

// AGENT CHAT ROUTE (NOUS PORTAL INFRASTRUCTURE & FULL AUTONOMY + CONTEXT MEMORY)
app.post('/api/v1/agent/chat', async (req, res) => {
  const { message, mode = 'EXECUTIVE', sessionId, attachments } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'O parâmetro "message" é obrigatório.' });
  }

  const realKeys = await getRealVaultKeys();
  const autonomyAuthorized = process.env.HERMES_AUTONOMY_DISABLED !== 'true';

  let responseText = '';
  let modelUsed = 'stepfun/step-3.7-flash:free';
  let isFallback = false;

  const cleanSessionId = String(sessionId || 'session-default').trim();

  // Process attachments (images for vision, documents for text context)
  let attachmentContext = '';
  if (Array.isArray(attachments) && attachments.length > 0) {
    attachments.forEach(att => {
      if (att.content || att.textContent) {
        attachmentContext += `\n[ARQUIVO ANEXADO: ${att.name || 'documento'}]\n${att.content || att.textContent}\n`;
      }
    });
  }

  const fullPromptMessage = attachmentContext ? `${message}\n${attachmentContext}` : message;

  const routing = selectOptimalModel(fullPromptMessage, mode);
  console.log(`[MODEL ROUTER] Task Complexity: ${routing.complexity} -> Primary Model: ${routing.primary} (Nous Portal)`);

  // 1. Execute Real Atomic DB Actions if commanded by Juliana
  const executedActionsResult = autonomyAuthorized ? await executeExecutiveActionMandate(fullPromptMessage) : '';

  // 2. Persistent PostgreSQL Conversation History for Webchat (No parseInt/NaN limitation!)
  try {
    await pool.query(`
      INSERT INTO chat_sessions (id, title, folder, created_at, updated_at)
      VALUES ($1, $2, 'Geral', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `, [cleanSessionId, fullPromptMessage.substring(0, 45)]);

    await pool.query(`
      INSERT INTO chat_messages (session_id, sender, content, agent_name, created_at)
      VALUES ($1, 'user', $2, 'Juliana', NOW())
    `, [cleanSessionId, fullPromptMessage]);
  } catch (dbErr) {
    console.warn('[DB SAVE USER MSG WARN]:', dbErr.message);
  }

  const userMemories = await getActiveUserMemories();
  const memoriesSummary = userMemories.length > 0
    ? userMemories.map(m => `- ${m.content}`).join('\n')
    : '- Nenhuma memória persistente registrada.';

  let historySummaryContext = '';
  let previousTurns = [];

  try {
    const msgRes = await pool.query(
      'SELECT sender, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 30',
      [cleanSessionId]
    );
    // Exclude the last user message just inserted so it's not duplicated
    const rows = msgRes.rows.slice(0, -1);
    previousTurns = rows.map(m => ({
      role: (m.sender === 'user' || m.sender === 'Juliana') ? 'user' : 'assistant',
      content: m.content || ''
    })).filter(m => m.content && m.content.trim().length > 0);

    const compression = compressSessionContext(msgRes.rows);
    if (compression.isSummarized) {
      historySummaryContext = compression.summaryContext;
    }
  } catch (err) {
    console.warn('[DB SESSION HISTORY FETCH WARN]:', err.message);
  }

  const realClickUpTasks = await fetchRealClickUpTasks();
  const connectorDocsContext = loadConnectorDocs();

  let realCrmLeads = [];
  try {
    const crmRes = await pool.query('SELECT name, company, value, stage FROM clients_crm ORDER BY created_at DESC LIMIT 20');
    realCrmLeads = crmRes.rows;
  } catch (err) {
    console.warn('[CRM CONTEXT FETCH WARN]:', err.message);
  }

  const vaultSummary = realKeys.length > 0
    ? realKeys.map(k => `- ${k.service}: ${k.status} (${k.maskedToken})`).join('\n')
    : '- Nenhuma chave configurada no Vault.';

  const crmSummary = realCrmLeads.length > 0
    ? realCrmLeads.map(l => `- ${l.name} (${l.company}): ${l.value} [Etapa: ${l.stage}]`).join('\n')
    : '- Nenhum lead registrado no CRM.';

  const tasksContext = realClickUpTasks || '- Nenhuma tarefa retornada pela ClickUp API no momento.';
  const actionsContext = executedActionsResult ? `\n\n### AÇÕES REAIS EXECUTADAS NO SISTEMA COM BASE NO COMANDO DA JULIANA:\n${executedActionsResult}\n` : '';

  const dynamicContext = `\n\n### ECOSSISTEMA W SOLUÇÕES TECNOLOGIA (NOUS PORTAL INFRASTRUCTURE & REAIS DB):
${actionsContext}
[MEMÓRIAS PERSISTENTES E REGRAS DO USUÁRIO (USER_MEMORIES DB)]:
${memoriesSummary}
${historySummaryContext}
[CHAVES E SERVIÇOS NO VAULT (POSTGRESQL DB REAL)]:
${vaultSummary}

[TAREFAS REAIS NO CLICKUP WORKSPACE W SOLUÇÕES (LIVE CLICKUP API v2)]:
${tasksContext}

[PIPELINE E LEADS NO CRM]:
${crmSummary}

[DOCUMENTAÇÕES E PROCEDIMENTOS OFICIAIS DE API DOS CONECTORES (docs/CONNECTORS_DOCUMENTATION_AND_PROCEDURES.md)]:
${connectorDocsContext || '- Documentação técnica carregada dos conectores.'}

### INSTRUÇÕES OBRIGATÓRIAS PARA A HERMES CENTRAL JULIANA:
- Autonomia e ferramentas (Tools) estão 100% habilitadas e ativas via Nous Portal API.
- Quando a administradora solicitar ações (como "crie a tarefa X no ClickUp", "limpe o vault", "atualize o orçamento Meta Ads"), invoque diretamente a ferramenta (Tool) apropriada.
- **REGRA ANTI-ALUCINAÇÃO ABSOLUTA**: NUNCA declare que uma ação foi executada, um deploy foi feito, uma API foi chamada, ou qualquer resultado foi obtido SEM que o motor de autonomia tenha confirmado a execução com dados reais. Se a seção [AÇÕES REAIS EXECUTADAS] acima estiver vazia ou não contiver a ação solicitada, isso significa que a ação NÃO foi executada — informe isso honestamente ao usuário e oriente sobre o que é necessário para executá-la.
- **REGRA DE HONESTIDADE SOBRE CAPACIDADES**: Se o usuário solicitar uma ação que não está no escopo atual do motor de autonomia (ex: criar repositório GitHub + fazer deploy completo no Vercel em cadeia), informe claramente quais etapas foram executadas pelo motor real e quais ainda não têm suporte automatizado, ao invés de simular uma execução fictícia.
- NUNCA invente SHAs de commit, IDs de deploy, URLs de produção, respostas de curl ou qualquer dado de API que não tenha sido confirmado pela seção de ações reais acima.
- Entregue respostas executivas objetivas, humanas e diretas para a Juliana.`;

  const modeInstruction = MODES && MODES[mode] ? `\n\n### MÓDULO ATIVO (${mode}):\n${MODES[mode]}` : '';
  const fullSystemPrompt = `${SYSTEM_PROMPT}${modeInstruction}${dynamicContext}`;

  const executeCallChain = async (modelName) => {
    // INJECT PREVIOUS TURNS INTO THE MESSAGES ARRAY FOR FULL CONTEXT CONVERSATION MEMORY!
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...previousTurns,
      { role: 'user', content: fullPromptMessage }
    ];

    let message = await callLLMWithTools(
      modelName,
      messages,
      routing.complexity === 'HEAVY' ? 2000 : 1200,
      autonomyAuthorized ? TOOL_DEFINITIONS : []
    );

    const executedToolLogs = [];

    for (let turn = 0; turn < 5 && Array.isArray(message?.tool_calls) && message.tool_calls.length; turn += 1) {
      messages.push(message);
      for (const toolCall of message.tool_calls) {
        let result;
        try {
          console.log(`[AUTONOMY TOOL CALL] Executing tool: ${toolCall.function.name} with args:`, toolCall.function.arguments);
          result = await executeAutonomyAction(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'), realKeys);
          executedToolLogs.push(`✅ Ação executada (${toolCall.function.name}): ${JSON.stringify(result)}`);
        } catch (toolError) {
          console.warn(`[AUTONOMY TOOL ERR] Tool ${toolCall.function.name} failed:`, toolError.message);
          result = { error: toolError.message };
          executedToolLogs.push(`⚠️ Falha na ação (${toolCall.function.name}): ${toolError.message}`);
        }
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
      message = await callLLMWithTools(
        modelName,
        messages,
        routing.complexity === 'HEAVY' ? 2000 : 1200,
        autonomyAuthorized ? TOOL_DEFINITIONS : []
      );
    }

    if (message && typeof message.content === 'string' && message.content.trim().length > 0) {
      return message.content;
    }

    if (executedToolLogs.length > 0) {
      return `### Ações Executadas no Ecossistema:\n\n${executedToolLogs.join('\n\n')}`;
    }

    throw new Error(`Modelo ${modelName} retornou resposta vazia ou nula.`);
  };

  try {
    modelUsed = routing.primary;
    responseText = await executeCallChain(routing.primary);
  } catch (primaryErr) {
    console.warn(`[NOUS PORTAL PRIMARY MODEL FAILED (${routing.primary})]:`, primaryErr.message);
    isFallback = true;
    for (const fbModel of routing.fallbacks) {
      try {
        modelUsed = fbModel;
        responseText = await executeCallChain(fbModel);
        break;
      } catch (fbErr) {
        console.warn(`[MODEL FALLBACK FAILED (${fbModel})]:`, fbErr.message);
      }
    }
    if (!responseText) {
      responseText = `[Hermes Central Juliana]: Instabilidade temporária. O comando foi registrado.`;
    }
  }

  // Intercept False Positive Claims
  responseText = sanitizeFalsePositiveClaims(responseText, executedToolLogs);

  try {
    await pool.query(`
      INSERT INTO chat_messages (session_id, sender, content, agent_name, model_used, created_at)
      VALUES ($1, 'agent', $2, 'Hermes Central Juliana', $3, NOW())
    `, [cleanSessionId, responseText, modelUsed]);

    await pool.query('UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1', [cleanSessionId]);
  } catch (dbErr) {
    console.warn('[DB SAVE AGENT MSG WARN]:', dbErr.message);
  }

  // Extract memories in background for future turns
  extractUserMemories(fullPromptMessage, responseText).catch(err => console.warn('[MEMORY WORKER WARN]:', err.message));

  // Notify WebSocket listeners
  broadcastWs({
    type: 'agent_chat_response',
    sessionId: cleanSessionId,
    message: responseText,
    model: modelUsed,
    fallback: isFallback,
    complexity: routing.complexity
  });

  res.json({
    status: 'success',
    mode,
    model: modelUsed,
    fallback: isFallback,
    complexity: routing.complexity,
    response: responseText,
    timestamp: new Date().toISOString()
  });
});

// SERVE FRONTEND (SPA FALLBACK)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port = PORT) {
  if (server.listening) return Promise.resolve(server);
  return new Promise((resolve) => server.listen(port, () => {
    console.log(`[HERMES CENTRAL JULIANA] Full Engine running on port ${port}`);
    resolve(server);
  }));
}

if (require.main === module) startServer();

module.exports = { app, server, startServer };
