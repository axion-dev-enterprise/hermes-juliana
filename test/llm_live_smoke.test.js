process.env.HERMES_TEST_MODE = 'true';

const test = require('node:test');
const assert = require('node:assert');
const { getLLMCredentials, callLLMWithTools, MIMO_PRIMARY_MODEL } = require('../server');

test('LLM Engine - OpenRouter Credentials Loading', async () => {
  const { openrouterKey } = await getLLMCredentials();
  assert.ok(openrouterKey, 'OpenRouter API Key must be resolved from env or vault file');
  assert.ok(openrouterKey.startsWith('sk-or-v1-'), 'Key must match OpenRouter format');
});

test('LLM Engine - Live MiMo-V2.5 Response Verification', async () => {
  const messages = [
    { role: 'system', content: 'Você é a Hermes Central Juliana. Responda apenas "ONLINE_OK".' },
    { role: 'user', content: 'Status check' }
  ];

  try {
    const started = Date.now();
    const result = await callLLMWithTools(MIMO_PRIMARY_MODEL, messages, 20, []);
    const duration = Date.now() - started;

    assert.ok(result, 'Result message must not be empty');
    assert.ok(typeof result.content === 'string', 'Message content must be string');
    assert.ok(result.content.trim().length > 0, 'Content must contain text');
    console.log(`[LIVE LLM SMOKE] MiMo-V2.5 call completed in ${duration}ms with content: "${result.content.trim()}"`);
  } catch (err) {
    if (err.message.includes('fetch failed') || err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
      console.warn('[LIVE LLM SMOKE] Network offline / unreachable during test run. Test skipped gracefully.');
    } else {
      throw err;
    }
  }
});
