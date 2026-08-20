const test = require('node:test');
const assert = require('node:assert');
const {
  selectOptimalModel,
  normalizeTextToolCalls,
  sanitizeSensitiveTokens,
  isOperationalActionRequest,
  isUnfinishedCommitment,
  compressSessionContext,
  MODAL_SPECIALIST_MODELS,
  OPENROUTER_FALLBACK_MODELS,
  MIMO_PRIMARY_MODEL
} = require('../server');

test('LLM Routing - Canonical Models Integrity', () => {
  assert.strictEqual(MIMO_PRIMARY_MODEL, 'xiaomi/mimo-v2.5', 'Primary model must be xiaomi/mimo-v2.5');
  assert.ok(OPENROUTER_FALLBACK_MODELS.includes('xiaomi/mimo-v2.5'));
  assert.ok(OPENROUTER_FALLBACK_MODELS.includes('meta-llama/llama-3.3-70b-instruct:free'));
  assert.ok(OPENROUTER_FALLBACK_MODELS.includes('nvidia/nemotron-nano-12b-v2-vl:free'));
  assert.ok(OPENROUTER_FALLBACK_MODELS.includes('poolside/laguna-s-2.1:free'));
});

test('LLM Routing - Vision Modality Selection', () => {
  const resultImgAttachment = selectOptimalModel('Analise isto', 'EXECUTIVE', [{ name: 'grafico.png', type: 'image' }]);
  assert.strictEqual(resultImgAttachment.primary, MODAL_SPECIALIST_MODELS.VISION);
  assert.strictEqual(resultImgAttachment.category, 'VISION');

  const resultKeyword = selectOptimalModel('Veja o print em anexo', 'EXECUTIVE', []);
  assert.strictEqual(resultKeyword.primary, MODAL_SPECIALIST_MODELS.VISION);
  assert.strictEqual(resultKeyword.category, 'VISION');
});

test('LLM Routing - Code & DevOps Modality Selection', () => {
  const resultDevOps = selectOptimalModel('Verifique o status do deploy', 'DEVOPS', []);
  assert.strictEqual(resultDevOps.primary, MODAL_SPECIALIST_MODELS.CODE);
  assert.strictEqual(resultDevOps.category, 'CODE');

  const resultCodeText = selectOptimalModel('Refatore a função de login em javascript com node e docker', 'EXECUTIVE', []);
  assert.strictEqual(resultCodeText.primary, MODAL_SPECIALIST_MODELS.CODE);
  assert.strictEqual(resultCodeText.category, 'CODE');
});

test('LLM Routing - Heavy Reasoning Modality Selection', () => {
  const resultCrisis = selectOptimalModel('Situação urgente na empresa', 'CRISIS', []);
  assert.strictEqual(resultCrisis.primary, MODAL_SPECIALIST_MODELS.REASONING);
  assert.strictEqual(resultCrisis.category, 'REASONING');

  const longPrompt = 'Preciso de uma análise aprofundada de todas as despesas operacionais da empresa, cruzando os dados do Asaas, as notas fiscais emitidas no mês anterior, os impostos retidos na fonte e a projeção de fluxo de caixa para os próximos três trimestres, considerando um cenário de expansão de 20%.';
  const resultLong = selectOptimalModel(longPrompt, 'EXECUTIVE', []);
  assert.strictEqual(resultLong.primary, MODAL_SPECIALIST_MODELS.REASONING);
  assert.strictEqual(resultLong.category, 'REASONING');
});

test('LLM Routing - General Modality Fallback', () => {
  const resultGeneral = selectOptimalModel('Olá Juliana, bom dia', 'EXECUTIVE', []);
  assert.strictEqual(resultGeneral.primary, MIMO_PRIMARY_MODEL);
  assert.strictEqual(resultGeneral.category, 'GENERAL');
});

test('Text Tool Calling - Normalize JSON Block Format', () => {
  const tools = [{ function: { name: 'CREATE_CLICKUP_TASK' } }];
  const messageWithTool = {
    role: 'assistant',
    content: '<tool_call>{"name": "CREATE_CLICKUP_TASK", "arguments": {"name": "Nova Tarefa"}}</tool_call>'
  };

  const normalized = normalizeTextToolCalls(messageWithTool, tools, 'xiaomi/mimo-v2.5');
  assert.strictEqual(normalized.content, null);
  assert.ok(Array.isArray(normalized.tool_calls));
  assert.strictEqual(normalized.tool_calls.length, 1);
  assert.strictEqual(normalized.tool_calls[0].function.name, 'CREATE_CLICKUP_TASK');
  const args = JSON.parse(normalized.tool_calls[0].function.arguments);
  assert.strictEqual(args.name, 'Nova Tarefa');
});

test('Text Tool Calling - Normalize XML Arg Format', () => {
  const tools = [{ function: { name: 'UPDATE_META_ADS_BUDGET' } }];
  const messageWithTool = {
    role: 'assistant',
    content: '<tool_call>UPDATE_META_ADS_BUDGET <arg_key>campaign_id</arg_key><arg_value>12345</arg_value><arg_key>daily_budget</arg_key><arg_value>500</arg_value></tool_call>'
  };

  const normalized = normalizeTextToolCalls(messageWithTool, tools, 'xiaomi/mimo-v2.5');
  assert.strictEqual(normalized.content, null);
  assert.ok(Array.isArray(normalized.tool_calls));
  assert.strictEqual(normalized.tool_calls[0].function.name, 'UPDATE_META_ADS_BUDGET');
  const args = JSON.parse(normalized.tool_calls[0].function.arguments);
  assert.strictEqual(args.campaign_id, '12345');
  assert.strictEqual(args.daily_budget, '500');
});

test('Text Tool Calling - Reject Unauthorized Tools', () => {
  const tools = [{ function: { name: 'CREATE_CLICKUP_TASK' } }];
  const messageWithInvalidTool = {
    role: 'assistant',
    content: '<tool_call>{"name": "DROP_DATABASE", "arguments": {}}</tool_call>'
  };

  assert.throws(() => {
    normalizeTextToolCalls(messageWithInvalidTool, tools, 'xiaomi/mimo-v2.5');
  }, /não autorizada/i);
});

test('Security Sanitizer - Mask Sensitive Tokens in Output', () => {
  const sampleWithTokens = `
    GitHub: ghp_1234567890abcdef1234567890
    OpenRouter: sk-or-v1-abcdef0123456789abcdef0123456789
    OpenAI: sk-proj-123456789012345678901234567890
    Asaas: $aact_1234567890abcdef1234567890
    ClickUp: pk_12345678901234567890
    Telegram: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ123456789
  `;

  const sanitized = sanitizeSensitiveTokens(sampleWithTokens);
  assert.ok(!sanitized.includes('ghp_1234567890abcdef1234567890'));
  assert.ok(sanitized.includes('ghp_••••••••7890'));
  assert.ok(!sanitized.includes('sk-or-v1-abcdef0123456789abcdef0123456789'));
  assert.ok(!sanitized.includes('$aact_1234567890abcdef1234567890'));
  assert.ok(!sanitized.includes('pk_12345678901234567890'));
  assert.ok(!sanitized.includes('123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ123456789'));
});

test('Guardrails - Operational Action Detection', () => {
  assert.ok(isOperationalActionRequest('Por favor, crie uma tarefa no ClickUp'));
  assert.ok(isOperationalActionRequest('Faça o deploy da landing page'));
  assert.ok(isOperationalActionRequest('Atualize o orçamento no Meta Ads'));
  assert.ok(isOperationalActionRequest('Sim, prossiga'));
  assert.ok(!isOperationalActionRequest('O que é o ClickUp?'));
});

test('Guardrails - Unfinished Commitment Detection', () => {
  assert.ok(isUnfinishedCommitment('Irei fazer isso agora mesmo. Confirme para prosseguir'));
  assert.ok(isUnfinishedCommitment('Aguardando sua autorização'));
  assert.ok(isUnfinishedCommitment('Qual opção você prefere?'));
  assert.ok(!isUnfinishedCommitment('Tarefa criada com sucesso no ClickUp com ID #12345'));
});

test('Context Compressor - Sliding Window Summarization', () => {
  const shortHistory = [
    { sender: 'user', content: 'Olá' },
    { sender: 'agent', content: 'Olá Juliana, como posso ajudar?' }
  ];
  const shortResult = compressSessionContext(shortHistory);
  assert.strictEqual(shortResult.isSummarized, false);

  const longHistory = Array.from({ length: 30 }, (_, i) => ({
    sender: i % 2 === 0 ? 'user' : 'agent',
    content: `Mensagem de teste número ${i} com detalhes operacionais e relatórios.`
  }));
  const longResult = compressSessionContext(longHistory);
  assert.strictEqual(longResult.isSummarized, true);
  assert.ok(longResult.summaryContext.includes('RESUMO'));
});
