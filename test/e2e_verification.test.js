process.env.HERMES_TEST_MODE = 'true';
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

// Import server app logic without listening on default port
const express = require('express');
const { SYSTEM_PROMPT } = require('../prompts/juliana_system_prompt');
const integrationsKb = require('../lib/integrations_kb.json');

test('Hermes Juliana - E2E Integration Suite', async (t) => {
  // Start server on dynamic port
  const { server, startServer } = require('../server.js');
  
  // Test REST API & Static Files via HTTP
  const PORT = process.env.PORT || 8000;
  const baseUrl = `http://localhost:${PORT}`;
  await startServer(PORT);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  await t.test('GET /api/v1/health', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ONLINE');
    assert.strictEqual(data.system, 'HERMES_CENTRAL_JULIANA');
  });

  await t.test('POST /api/v1/auth/login', async () => {
    process.env.HERMES_TEST_MODE = 'true';
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'juliana@wsolucoes.com.br', password: 'any' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(data.token);
    assert.strictEqual(data.user.name, 'Juliana');
  });

  await t.test('GET & POST /api/v1/agent/sessions', async () => {
    const getRes = await fetch(`${baseUrl}/api/v1/agent/sessions`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(Array.isArray(getData.data));

    const postRes = await fetch(`${baseUrl}/api/v1/agent/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Sessão E2E Teste' })
    });
    assert.strictEqual(postRes.status, 201);
    const postData = await postRes.json();
    assert.strictEqual(postData.title, 'Sessão E2E Teste');
  });

  await t.test('POST /api/v1/agent/chat (Executive Response)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Qual o status dos projetos?', mode: 'EXECUTIVE' })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(typeof data.response === 'string' && data.response.length > 0);
  });

  await t.test('GET & POST /api/v1/vault', async () => {
    const postRes = await fetch(`${baseUrl}/api/v1/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'Asaas', token: '$aact_test_123456789' })
    });
    assert.strictEqual(postRes.status, 200);

    const getRes = await fetch(`${baseUrl}/api/v1/vault/keys`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(Array.isArray(getData.keys));
    assert.ok(getData.keys.some(k => k.service.toLowerCase().includes('asaas')));
  });

  await t.test('POST /api/v1/connectors/whatsapp/qrcode', async () => {
    const res = await fetch(`${baseUrl}/api/v1/connectors/whatsapp/qrcode`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'success');
    assert.ok(data.qrBase64.startsWith('data:image/svg+xml'));
    assert.ok(data.pairCode.startsWith('HERMES-'));
  });

  await t.test('GET & POST /api/v1/crm/leads', async () => {
    const postRes = await fetch(`${baseUrl}/api/v1/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Cliente E2E', company: 'Empresa Teste', value: 'R$ 50.000,00', stage: 'lead_recebido' })
    });
    assert.strictEqual(postRes.status, 201);

    const getRes = await fetch(`${baseUrl}/api/v1/crm/leads`);
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(Array.isArray(getData.data));
    assert.ok(getData.data.some(l => l.name === 'Cliente E2E'));
  });

  await t.test('WebSocket Gateway /ws Connection & Ping', async () => {
    const wsUrl = `ws://localhost:${PORT}/ws`;
    const ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 3000);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
      });
      ws.on('message', (msg) => {
        const data = JSON.parse(msg.toString());
        if (data.type === 'pong') {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });
      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  await t.test('SPA Static Asset Delivery', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('<title>Hermes Central | W Soluções Tecnologia</title>'));
    assert.ok(html.includes('app.js?v=6.0.0'));
  });
});
