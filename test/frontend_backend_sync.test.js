const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../public/index.html');
const cssPath = path.join(__dirname, '../public/styles.css');
const jsPath = path.join(__dirname, '../public/app.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

test('Frontend-Backend Sync - Endpoint Alignment', () => {
  const serverPath = path.join(__dirname, '../server.js');
  const serverCode = fs.readFileSync(serverPath, 'utf8');

  const clientEndpoints = [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/agent/chat',
    '/api/v1/agent/sessions',
    '/api/v1/vault',
    '/api/v1/vault/keys',
    '/api/v1/connectors/status',
    '/api/v1/connectors/whatsapp/qrcode',
    '/api/v1/connectors/whatsapp/logout',
    '/api/v1/connectors/whatsapp/reconnect',
    '/api/v1/connectors/telegram/token',
    '/api/v1/crm/leads',
    '/api/v1/crm/overview',
    '/api/v1/skills'
  ];

  for (const ep of clientEndpoints) {
    assert.ok(
      serverCode.includes(ep) || serverCode.includes(ep.replace('/api/v1', '')),
      `Backend must implement endpoint called by frontend: ${ep}`
    );
  }
});

test('Frontend DOM Schema - Critical Element IDs Presence', () => {
  const criticalElementIds = [
    'app-container',
    'login-modal',
    'login-form',
    'login-email',
    'login-password',
    'login-error',
    'btn-login-submit',
    'btn-logout',
    'toast-container',
    'chat-form',
    'chat-input',
    'chat-messages',
    'btn-attach',
    'vault-keys-list',
    'vault-service-select',
    'btn-save-vault-key',
    'connectors-list',
    'qr-code-box',
    'cards-lead_recebido',
    'cards-reuniao_agendada',
    'cards-proposta_enviada',
    'cards-fechado_ganho'
  ];

  for (const id of criticalElementIds) {
    assert.ok(
      html.includes(`id="${id}"`),
      `index.html must contain DOM element with id="${id}"`
    );
  }
});

test('Frontend UX - Modern Toast Notification System', () => {
  assert.ok(html.includes('id="toast-container"'), 'index.html must contain #toast-container');
  assert.ok(css.includes('.toast-container'), 'styles.css must style .toast-container');
  assert.ok(css.includes('.toast-success'), 'styles.css must style .toast-success');
  assert.ok(css.includes('.toast-error'), 'styles.css must style .toast-error');
  assert.ok(css.includes('.toast-warning'), 'styles.css must style .toast-warning');
  assert.ok(css.includes('.toast-info'), 'styles.css must style .toast-info');
  assert.ok(js.includes('function showToast('), 'app.js must define showToast()');
});

test('Frontend UX - Zero Native Alert Popups Contract', () => {
  const alertMatches = js.match(/\balert\s*\(/g);
  assert.strictEqual(alertMatches, null, 'app.js must not contain any native alert() calls');
});

test('Frontend Security - Universal Auto-Logout on 401/403', () => {
  assert.ok(js.includes('function performAutoLogout('), 'app.js must implement performAutoLogout');
  assert.ok(js.includes("localStorage.removeItem('hermes_token')"), 'Auto-logout must purge hermes_token');
  assert.ok(js.includes("localStorage.removeItem('hermes_auth')"), 'Auto-logout must purge hermes_auth');
  assert.ok(js.includes('response.status === 401 || response.status === 403'), 'Fetch interceptor must catch 401 and 403');
  assert.ok(js.includes('btn-logout'), 'Logout button must be bound in frontend');
});

test('Frontend Brand & Engine - OpenRouter MiMo-V2.5 Branding', () => {
  assert.ok(html.includes('OpenRouter (MiMo-V2.5)'), 'Sidebar must display OpenRouter (MiMo-V2.5)');
  assert.ok(!html.includes('Nous Portal (Free)'), 'Sidebar must not reference obsolete Nous Portal');
  assert.ok(html.includes('value="openrouter" selected'), 'Vault select must have OpenRouter as selected primary');
  assert.ok(!html.includes('value="nous_portal"'), 'Vault select must not contain nous_portal');
});

test('Frontend Assets - Cache Busting Version Synchronization', () => {
  const cssVersionMatch = html.match(/href="styles\.css\?v=([^"]+)"/);
  const jsVersionMatch = html.match(/src="app\.js\?v=([^"]+)"/);

  assert.ok(cssVersionMatch, 'styles.css must include version cache-buster in index.html');
  assert.ok(jsVersionMatch, 'app.js must include version cache-buster in index.html');
  assert.strictEqual(cssVersionMatch[1], jsVersionMatch[1], 'styles.css and app.js versions must match');
});

test('Frontend Mobile UX - Responsive Meta & Touch Standards', () => {
  assert.ok(html.includes('name="viewport"'), 'index.html must include viewport meta tag');
  assert.ok(html.includes('width=device-width'), 'Viewport must define width=device-width');
  assert.ok(css.includes('@media (max-width:'), 'styles.css must include mobile responsive media queries');
});
