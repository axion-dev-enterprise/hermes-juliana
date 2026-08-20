process.env.HERMES_TEST_MODE = 'true';
process.env.HERMES_OPERATOR_TOKEN = 'test-token-at-least-32-bytes-long-for-hmac-sha256-signing';
process.env.HERMES_DEMO_PASSWORD = 'test-password';

const test = require('node:test');
const assert = require('node:assert');
const { app, startServer, server, signSession, verifySession } = require('../server');

test('API Cascading Suite - Full Lifecycle & Integration Flow', async (t) => {
  const PORT = 8001 + Math.floor(Math.random() * 500);
  const baseUrl = `http://localhost:${PORT}`;
  await startServer(PORT);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  // Generate valid test JWT token
  const validAdminToken = signSession({ role: 'admin', user: 'Juliana', exp: Date.now() + 3600000 });
  const authHeader = { 'Authorization': `Bearer ${validAdminToken}`, 'Content-Type': 'application/json' };

  // 1. Health Endpoint
  await t.test('1. Health Check - Server Online Contract', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ONLINE');
    assert.strictEqual(data.system, 'HERMES_CENTRAL_JULIANA');
  });

  // 2. Authentication Rejection (Unauthenticated)
  await t.test('2. Security Boundary - 401 on Missing Auth', async () => {
    const resChat = await fetch(`${baseUrl}/api/v1/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'teste' })
    });
    assert.strictEqual(resChat.status, 401);

    const resVault = await fetch(`${baseUrl}/api/v1/vault/keys`);
    assert.strictEqual(resVault.status, 401);

    const resCrm = await fetch(`${baseUrl}/api/v1/crm/leads`);
    assert.strictEqual(resCrm.status, 401);
  });

  // 3. Authentication Verification & Token Issuance
  await t.test('3. Auth Flow - Demo Password Login & Session Signing', async () => {
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

    const verified = verifySession(data.token);
    assert.ok(verified);
    assert.strictEqual(verified.role, 'admin');
  });

  // 4. Session Token Signing & Revocation
  await t.test('4. Token Security - Expiration & Signature Tampering', () => {
    const expiredToken = signSession({ role: 'admin', exp: Date.now() - 1000 });
    assert.strictEqual(verifySession(expiredToken), null, 'Expired token must not verify');

    const tamperedToken = validAdminToken.slice(0, -4) + 'abcd';
    assert.strictEqual(verifySession(tamperedToken), null, 'Tampered token must not verify');
  });

  // 5. Connectors - Status & Baileys Lifecycle
  await t.test('5. Connectors API - Status, QR & Session Reset', async () => {
    const resStatus = await fetch(`${baseUrl}/api/v1/connectors/status`, { headers: authHeader });
    assert.strictEqual(resStatus.status, 200);
    const statusData = await resStatus.json();
    assert.ok(statusData.whatsapp);
    assert.ok(statusData.telegram);

    const resQr = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/qrcode`, {
      method: 'POST',
      headers: authHeader
    });
    assert.strictEqual(resQr.status, 200);
    const qrData = await resQr.json();
    assert.ok(['success', 'INITIALIZING', 'CONNECTED'].includes(qrData.status));

    const resLogout = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/logout`, {
      method: 'POST',
      headers: authHeader
    });
    assert.strictEqual(resLogout.status, 200);
    const logoutData = await resLogout.json();
    assert.strictEqual(logoutData.status, 'success');
    assert.strictEqual(logoutData.connected, false);
  });

  // 6. Telegram Connector Token
  await t.test('6. Telegram Connector - Token Storage', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/telegram/token`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ token: '123456789:TEST_BOT_TOKEN_ABCDEF' })
    });
    assert.strictEqual(res.status, 200);
  });

  // 7. Observability & Analytics Metrics
  await t.test('7. Observability API - Metrics & SLO Contract', async () => {
    const resObs = await fetch(`${baseUrl}/api/v1/observability/metrics`, { headers: authHeader });
    assert.strictEqual(resObs.status, 200);
    const obsData = await resObs.json();
    assert.strictEqual(obsData.status, 'success');
    assert.ok(typeof obsData.uptime_seconds === 'number');

    const resAnalytics = await fetch(`${baseUrl}/api/v1/analytics/metrics`, { headers: authHeader });
    assert.strictEqual(resAnalytics.status, 200);
  });

  // 8. Session FSM Endpoint
  await t.test('8. Session FSM - State Invariant', async () => {
    const res = await fetch(`${baseUrl}/api/v1/agent/sessions/test-session-123/fsm`, { headers: authHeader });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.sessionId, 'test-session-123');
    assert.ok(data.state);
  });

  // 9. SPA Delivery & Cache Buster Contract
  await t.test('9. SPA Assets - HTML & Header Integrity', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('Hermes Central'));
    assert.ok(html.includes('OpenRouter (MiMo-V2.5)'));
    assert.ok(html.includes('toast-container'));
  });
});
