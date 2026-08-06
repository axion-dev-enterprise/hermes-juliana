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
});
