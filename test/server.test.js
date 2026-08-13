const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Hermes Juliana - System Prompt Verification', () => {
  const { SYSTEM_PROMPT } = require('../prompts/juliana_system_prompt');
  assert.ok(SYSTEM_PROMPT.includes('AGENTE CENTRAL EXECUTIVO'));
  assert.ok(SYSTEM_PROMPT.includes('W SOLUÇÕES TECNOLOGIA'));
  assert.ok(SYSTEM_PROMPT.includes('ZERO-MOCK'));
});

test('Hermes Juliana - Integrations KB JSON Schema', () => {
  const kb = require('../lib/integrations_kb.json');
  assert.strictEqual(kb.system, 'HERMES_INTEGRATIONS_KB_V5.0');
  assert.ok(Array.isArray(kb.integrations));
  assert.ok(kb.integrations.length >= 60);
});

test('Hermes Juliana - Frontend Assets Presence', () => {
  const htmlPath = path.join(__dirname, '../public/index.html');
  const cssPath = path.join(__dirname, '../public/styles.css');
  const jsPath = path.join(__dirname, '../public/app.js');

  assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
  assert.ok(fs.existsSync(cssPath), 'styles.css must exist');
  assert.ok(fs.existsSync(jsPath), 'app.js must exist');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(htmlContent.includes('<svg style="display: none;">'), 'Inline SVG sprite must be present');
  assert.ok(htmlContent.includes('id="icon-history"'), 'History SVG icon symbol must be present');
  assert.ok(htmlContent.includes('id="command-palette-modal"'), 'Command Palette modal must be present');

  const jsContent = fs.readFileSync(jsPath, 'utf8');
  assert.ok(jsContent.includes('data-tab'), 'Tab switching logic must be present');
  assert.ok(jsContent.includes('/api/v1/agent/chat'), 'Real Chat API endpoint call must be present');
  assert.ok(jsContent.includes('/api/v1/vault'), 'Real Vault API endpoint call must be present');
  assert.ok(jsContent.includes('/api/v1/crm/leads'), 'Real CRM API endpoint call must be present');
  assert.ok(jsContent.includes('initCommandPalette'), 'Command Palette init function must be present');
});

test('Hermes Juliana V5.0 - Server Engine & API Endpoints Verification', () => {
  const serverPath = path.join(__dirname, '../server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');

  assert.ok(serverContent.includes('/api/v1/user/memories'), 'User memories API endpoint must exist');
  assert.ok(serverContent.includes('/api/v1/agent/blackboard'), 'Shared Blackboard API endpoint must exist');
  assert.ok(serverContent.includes('/api/v1/agent/actions/confirm'), 'Executive Action confirmation API endpoint must exist');
  assert.ok(serverContent.includes('loginRateLimiter'), 'Login rate limiter middleware must exist');
  assert.ok(serverContent.includes('compressSessionContext'), 'Sliding window context compressor must exist');
  assert.ok(serverContent.includes('resilientAgentChat'), 'Agent chat must have an async recovery boundary');
  assert.ok(serverContent.includes("status: 'degraded'"), 'Recovery boundary must return an explicit degraded response');
});

test('Hermes Juliana - Chat transport never retries through an undefined function', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.ok(!jsContent.includes('sendUserChatMessage('), 'Undefined chat retry function must not be called');
  assert.ok(jsContent.includes('Solicitação preservada'), 'HTTP failures must render a useful recovery response');
  assert.ok(jsContent.includes("type: 'ping'"), 'WebSocket heartbeat must be enabled');
});

test('Hermes Juliana - Production security boundaries', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const jsContent = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  assert.ok(serverContent.includes('HERMES_TEST_MODE=true is forbidden in production'));
  assert.ok(serverContent.includes("res.status(401).json({ error: 'Autenticação obrigatória.' })"));
  assert.ok(serverContent.includes("req.auth?.role === 'admin'"));
  assert.ok(serverContent.includes('keys.map(({ rawToken, ...safe }) => safe)'));
  assert.ok(!jsContent.includes('JulianaWsolu2026Secure'));
});

test('Hermes Juliana - Durable task and correlated logging contracts', () => {
  const serverContent = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  assert.ok(serverContent.includes('CREATE TABLE IF NOT EXISTS agent_tasks'));
  assert.ok(serverContent.includes('CREATE TABLE IF NOT EXISTS agent_task_events'));
  assert.ok(serverContent.includes('/api/v1/agent/tasks/:requestId'));
  assert.ok(serverContent.includes("existingTask.rows[0]"));
  assert.ok(serverContent.includes("log('info', 'http_request'"));
  assert.ok(serverContent.includes("res.setHeader('X-Request-Id'"));
  assert.ok(serverContent.includes('[REDACTED]'));
  assert.ok(serverContent.includes('/api/v1/observability/metrics'));
  assert.ok(serverContent.includes('HERMES_LOG_DIR'));
  assert.ok(fs.existsSync(path.join(__dirname, '../docs/OBSERVABILITY_SLO.md')));
  assert.ok(fs.existsSync(path.join(__dirname, '../.github/workflows/production-monitor.yml')));
});
