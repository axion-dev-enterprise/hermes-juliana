process.env.HERMES_TEST_MODE = 'true';
process.env.HERMES_OPERATOR_TOKEN = 'test-token-at-least-32-bytes-long-for-hmac-sha256-signing';
process.env.HERMES_DEMO_PASSWORD = 'test-password';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const { server, startServer, signSession } = require('../server.js');

test('Hermes Juliana - E2E Integration Suite', async (t) => {
  const PORT = 8002 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${PORT}`;
  await startServer(PORT);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const validToken = signSession({ role: 'admin', user: 'Juliana', exp: Date.now() + 3600000 });
  const authHeaders = { 'Authorization': `Bearer ${validToken}`, 'Content-Type': 'application/json' };

  await t.test('GET /api/v1/health', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ONLINE');
    assert.strictEqual(data.system, 'HERMES_CENTRAL_JULIANA');
  });

  await t.test('POST /api/v1/auth/login', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'juliana@wsolucoes.com.br', password: 'test-password' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(data.token);
    assert.strictEqual(data.user.name, 'Juliana');
  });

  await t.test('POST /api/v1/connectors/whatsapp/qrcode', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/qrcode`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(['success', 'INITIALIZING', 'CONNECTED'].includes(data.status));
  });

  await t.test('POST /api/v1/connectors/whatsapp/logout & reconnect', async () => {
    const resLogout = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/logout`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.strictEqual(resLogout.status, 200);
    const logoutData = await resLogout.json();
    assert.strictEqual(logoutData.status, 'success');
    assert.strictEqual(logoutData.connected, false);

    const resReconnect = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/reconnect`, {
      method: 'POST',
      headers: authHeaders
    });
    assert.strictEqual(resReconnect.status, 200);
    const reconnectData = await resReconnect.json();
    assert.strictEqual(reconnectData.status, 'success');
  });

  await t.test('POST /api/v1/connectors/telegram/token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/telegram/token`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ token: '123456789:ABC_TEST_TOKEN' })
    });
    assert.strictEqual(res.status, 200);
  });

  await t.test('SPA Static Asset Delivery', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('<title>Hermes Central | W Soluções Tecnologia</title>'));
    assert.ok(html.includes('app.js?v=6.2.0'));
    assert.ok(html.includes('styles.css?v=6.2.0'));
    assert.ok(html.includes('toast-container'));
  });
});

