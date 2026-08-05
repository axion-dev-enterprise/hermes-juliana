// HELPER UTILITIES FOR ALL HERMES CONNECTORS
// Authoritative helper functions implementing standard procedures from docs/CONNECTORS_DOCUMENTATION_AND_PROCEDURES.md

const fs = require('fs');
const path = require('path');

const DOCS_PATH = path.join(__dirname, '..', 'docs', 'CONNECTORS_DOCUMENTATION_AND_PROCEDURES.md');

// Load connector docs on startup to ensure agent guidelines are always up-to-date
function loadConnectorDocs() {
  try {
    if (fs.existsSync(DOCS_PATH)) {
      return fs.readFileSync(DOCS_PATH, 'utf-8');
    }
  } catch (err) {
    console.warn('[DOCS LOAD WARN]:', err.message);
  }
  return '';
}

// 1. ClickUp API v2 Helpers
async function clickupRequest(endpoint, method = 'GET', body = null, apiKey) {
  if (!apiKey) throw new Error('Token do ClickUp não configurado no Vault.');
  const url = `https://api.clickup.com/api/v2${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ClickUp API HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

// 2. Telegram Bot API Helpers
async function telegramRequest(endpoint, body = null, botToken) {
  if (!botToken) throw new Error('Token do Telegram Bot não configurado no Vault.');
  const url = `https://api.telegram.org/bot${botToken}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram API HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

// 3. Asaas API v3 Helpers
async function asaasRequest(endpoint, method = 'GET', body = null, apiKey) {
  if (!apiKey) throw new Error('Token do Asaas não configurado no Vault.');
  const url = `https://www.asaas.com/api/v3${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const options = {
    method,
    headers: {
      'access_token': apiKey,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asaas API HTTP ${res.status}: ${text}`);
  }
  return await res.json();
}

module.exports = {
  loadConnectorDocs,
  clickupRequest,
  telegramRequest,
  asaasRequest
};
