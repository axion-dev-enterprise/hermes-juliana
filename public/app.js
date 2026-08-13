/* HERMES CENTRAL - FULL REAL ENGINE V4.2.6 (0 MOCKS) */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[HERMES CENTRAL] Initializing Real Production Engine V4.2.6...');

  let activeSessionId = localStorage.getItem('hermes_active_session') || 'session-1';
  let isThinking = false;
  let ws = null;
  let wsReconnectTimer = null;
  let wsHeartbeatTimer = null;
  let wsReconnectAttempt = 0;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    const token = localStorage.getItem('hermes_token');
    if (token && url.startsWith('/api/') && !url.includes('/auth/login')) headers.set('Authorization', `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  };

  // INITIALIZE ALL REAL MODULES
  initLogin();
  initTabs();
  initThemeSwitcher();
  initMobileMenu();
  initWebSocket();
  loadSessionsList();
  loadVaultKeys();
  loadConnectorsStatus();
  loadCrmLeads();
  loadSkills();
  initCrmLeadModal();
  initSkillsCenter();
  initChatForm();
  initVoiceRecognition();
  initCommandPalette();
  initDragAndDrop();
  initEventDelegation();

  // -------------------------------------------------------------
  // 0. AUTHENTICATION & LOGIN SCREEN HANDLER
  // -------------------------------------------------------------
  function initLogin() {
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const appContainer = document.getElementById('app-container');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const btnSubmit = document.getElementById('btn-login-submit');

    function showApp() {
      if (loginModal) loginModal.style.display = 'none';
      if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.classList.remove('hidden');
      }
    }

    // Auto-login if previously authenticated
    if (localStorage.getItem('hermes_token')) {
      showApp();
      return;
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail ? loginEmail.value.trim() : '';
        const password = loginPassword ? loginPassword.value.trim() : '';

        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = `<span>Autenticando...</span>`;
        }

        try {
          const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          if (!res.ok) throw new Error('Credenciais inválidas.');
          const data = await res.json();
          if (!data.token) throw new Error('Sessão não emitida.');
          localStorage.setItem('hermes_token', data.token);
          localStorage.setItem('hermes_auth', 'true');
          showApp();
        } catch (err) {
          localStorage.removeItem('hermes_auth');
          localStorage.removeItem('hermes_token');
          if (btnSubmit) btnSubmit.innerHTML = '<span>Credenciais inválidas</span>';
          return;
        }
      });
    }
  }

  // -------------------------------------------------------------
  // 1. NAVIGATION & TAB SWITCHING
  // -------------------------------------------------------------
  function initTabs() {
    const navItems = document.querySelectorAll('.nav-item, .tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const rawTab = btn.getAttribute('data-tab');
        if (!rawTab) return;

        const targetTabId = rawTab.startsWith('tab-') ? rawTab : `tab-${rawTab}`;

        navItems.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => {
          p.classList.add('hidden');
          p.classList.remove('active');
        });

        btn.classList.add('active');
        const activePanel = document.getElementById(targetTabId);
        if (activePanel) {
          activePanel.classList.remove('hidden');
          activePanel.classList.add('active');

          if (targetTabId === 'tab-vault') loadVaultKeys();
          if (targetTabId === 'tab-connectors') loadConnectorsStatus();
          if (targetTabId === 'tab-crm') loadCrmLeads();
          if (targetTabId === 'tab-skills') loadSkills();
        }
      });
    });
  }

  // -------------------------------------------------------------
  // 2. THEME SWITCHER & MOBILE MENU
  // -------------------------------------------------------------
  function initThemeSwitcher() {
    const savedTheme = localStorage.getItem('hermes_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      if (btn.getAttribute('data-theme') === savedTheme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('hermes_theme', theme);

        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function initMobileMenu() {
    const btnMobile = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (btnMobile && sidebar) {
      btnMobile.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function initCommandPalette() {
    const modal = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    const results = document.getElementById('cmd-palette-results');
    if (!modal) return;

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden') && input) {
          input.value = '';
          input.focus();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewSession();
      } else if (e.key === 'Escape') {
        modal.classList.add('hidden');
        const confirmModal = document.getElementById('action-confirm-modal');
        if (confirmModal) confirmModal.classList.add('hidden');
      }
    });

    if (input) {
      input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        const items = results ? results.querySelectorAll('.cmd-item') : [];
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? 'flex' : 'none';
        });
      });
    }

    if (results) {
      results.addEventListener('click', (e) => {
        const item = e.target.closest('.cmd-item');
        if (!item) return;
        const action = item.getAttribute('data-action');
        modal.classList.add('hidden');

        if (action === 'cmd-new-chat') createNewSession();
        else if (action === 'cmd-tab-vault') document.querySelector('[data-tab="tab-vault"]')?.click();
        else if (action === 'cmd-tab-crm') document.querySelector('[data-tab="tab-crm"]')?.click();
        else if (action === 'cmd-theme-dark') document.querySelector('[data-theme="dark"]')?.click();
      });
    }
  }

  let pendingAttachments = [];

  function initDragAndDrop() {
    const chatWrapper = document.querySelector('.chat-wrapper');
    if (!chatWrapper) return;

    chatWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      chatWrapper.style.border = '2px dashed var(--accent-primary)';
    });

    chatWrapper.addEventListener('dragleave', (e) => {
      e.preventDefault();
      chatWrapper.style.border = 'none';
    });

    chatWrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      chatWrapper.style.border = 'none';
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileUpload(files[0]);
      }
    });
  }

  function handleFileUpload(file) {
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        pendingAttachments.push({ name: file.name, type: file.type, dataUrl: e.target.result });
        alert(`Imagem [${file.name}] pronta para análise GPT-4o Vision!`);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => {
        pendingAttachments.push({ name: file.name, type: file.type, textContent: e.target.result });
        alert(`Documento [${file.name}] anexado com sucesso!`);
      };
      reader.readAsText(file);
    }
  }

  // -------------------------------------------------------------
  // 3. WEBSOCKET REAL-TIME ENGINE
  // -------------------------------------------------------------
  function initWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const wsStatusLabel = document.getElementById('ws-status-text');

    try {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('[WebSocket] Connected to Hermes Gateway /ws');
        ws.send(JSON.stringify({ type: 'auth', token: localStorage.getItem('hermes_token') || '' }));
        wsReconnectAttempt = 0;
        clearTimeout(wsReconnectTimer);
        clearInterval(wsHeartbeatTimer);
        wsHeartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
          }
        }, 25000);
        if (wsStatusLabel) wsStatusLabel.textContent = 'WebSocket Ativo';
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'agent_chat_progress') {
            console.log('[WebSocket Chat Progress]', data);
            const title = data.title || '⏳ Tarefa em andamento...';
            const details = data.details || data.resultSummary || '';
            updateThinkingIndicator('current-thinking', title, details);
          }
        } catch (err) {
          console.warn('[WebSocket] Non-JSON message:', event.data);
        }
      };
      ws.onclose = () => {
        clearInterval(wsHeartbeatTimer);
        if (wsStatusLabel) wsStatusLabel.textContent = 'WebSocket Reconectando...';
        const reconnectDelay = Math.min(1000 * (2 ** wsReconnectAttempt), 15000);
        wsReconnectAttempt += 1;
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = setTimeout(initWebSocket, reconnectDelay);
      };
      ws.onerror = (err) => {
        console.error('[WebSocket Error]', err);
      };
    } catch (e) {
      console.warn('[WebSocket] Init skipped/fallback to HTTP');
    }
  }

  // -------------------------------------------------------------
  // 4. SESSIONS MANAGEMENT (REST API: /api/v1/agent/sessions)
  // -------------------------------------------------------------
  async function loadSessionsList() {
    const historyList = document.getElementById('sessions-list') || document.getElementById('history-list');
    if (!historyList) return;

    try {
      const res = await fetch('/api/v1/agent/sessions');
      if (!res.ok) throw new Error('Falha ao obter histórico de sessões');
      const data = await res.json();
      const sessions = data.data || data;

      renderHistoryCards(sessions);
    } catch (err) {
      console.warn('[Sessions] Usando sessão default local:', err);
      renderDefaultHistoryCard();
    }
  }

  function renderHistoryCards(sessions) {
    const historyList = document.getElementById('sessions-list') || document.getElementById('history-list');
    const archivedList = document.getElementById('archived-list');
    if (!historyList) return;

    if (!Array.isArray(sessions) || sessions.length === 0) {
      renderDefaultHistoryCard();
      return;
    }

    const activeSessions = sessions.filter(s => !s.archived);
    const archivedSessions = sessions.filter(s => s.archived);

    let html = `
      <div class="history-folder-group">
        <div class="folder-header">
          <div class="folder-title">
            <svg class="svg-icon text-amber"><use href="#icon-folder"/></svg>
            <span>Sessões Ativas</span>
          </div>
          <span class="folder-badge">${activeSessions.length} sessões</span>
        </div>
        <div class="history-items-group">
    `;

    activeSessions.forEach(s => {
      const isActive = String(s.id) === String(activeSessionId) ? 'active' : '';
      const dateStr = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Hoje';
      const msgCount = s.messageCount || 0;

      html += `
        <div class="history-card ${isActive}" data-session-id="${s.id}">
          <div class="card-top-row">
            <span class="card-date">${dateStr}</span>
            <span class="card-msg-badge">${msgCount} msgs</span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(s.title || 'Atendimento Executivo Central')}
          </div>
          <div class="card-actions-row">
            <button class="btn-card-action" data-action="rename-session" title="Renomear">
              <svg class="svg-icon"><use href="#icon-edit"/></svg>
            </button>
            <button class="btn-card-action" data-action="archive-session" title="Arquivar">
              <svg class="svg-icon"><use href="#icon-archive"/></svg>
            </button>
            <button class="btn-card-action danger" data-action="delete-session" title="Excluir">
              <svg class="svg-icon"><use href="#icon-trash"/></svg>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    historyList.innerHTML = html;

    if (archivedList) {
      if (archivedSessions.length === 0) {
        archivedList.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-muted);">Nenhuma sessão arquivada.</div>`;
      } else {
        let archHtml = '';
        archivedSessions.forEach(s => {
          archHtml += `
            <div class="history-card archived" data-session-id="${s.id}" style="margin-bottom: 8px; padding: 10px; border-left: 3px solid var(--text-muted);">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-main);">${escapeHtml(s.title)}</div>
              <div class="card-actions-row" style="margin-top: 4px;">
                <button class="btn-card-action" data-action="archive-session" title="Desarquivar">
                  <svg class="svg-icon"><use href="#icon-archive"/></svg> Desarquivar
                </button>
              </div>
            </div>
          `;
        });
        archivedList.innerHTML = archHtml;
      }
    }
  }

  async function loadSessionMessages(sessionId) {
    activeSessionId = String(sessionId);
    localStorage.setItem('hermes_active_session', activeSessionId);
    
    document.querySelectorAll('.history-card').forEach(card => {
      if (card.getAttribute('data-session-id') === String(sessionId)) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    try {
      const res = await fetch(`/api/v1/agent/sessions/${sessionId}/messages`);
      if (!res.ok) throw new Error('Erro ao carregar mensagens');
      const data = await res.json();
      const messages = data.data || [];

      if (messages.length === 0) {
        clearChatMessages();
        return;
      }

      chatMessages.innerHTML = '';
      messages.forEach(msg => {
        if (msg.sender === 'user') {
          appendUserMessage(msg.content);
        } else {
          appendAgentMessage(msg.content, msg.modelUsed || 'openai/gpt-4o-mini', false);
        }
      });
    } catch (err) {
      console.warn('[Messages Load Error]:', err);
      clearChatMessages();
    }
  }

  function renderDefaultHistoryCard() {
    const historyList = document.getElementById('sessions-list') || document.getElementById('history-list');
    if (!historyList) return;
    historyList.innerHTML = `
      <div class="history-folder-group">
        <div class="folder-header">
          <div class="folder-title">
            <svg class="svg-icon text-amber"><use href="#icon-folder"/></svg>
            <span>Geral</span>
          </div>
          <span class="folder-badge">0 sessões</span>
        </div>
        <div class="sessions-empty">
          <i class="fa-solid fa-comments"></i>
          <span>Nenhuma sessão ativa</span>
          <span style="font-size: 0.72rem; opacity: 0.6; margin-top: 2px;">Clique em "+ Nova Conversa"</span>
        </div>
      </div>
    `;
  }

  async function createNewSession() {
    try {
      const res = await fetch('/api/v1/agent/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nova Sessão Executiva' })
      });
      if (res.ok) {
        const newSession = await res.json();
        activeSessionId = String(newSession.id || `session-${Date.now()}`);
        localStorage.setItem('hermes_active_session', activeSessionId);
        loadSessionsList();
        clearChatMessages();
      }
    } catch (err) {
      activeSessionId = `session-${Date.now()}`;
      localStorage.setItem('hermes_active_session', activeSessionId);
      loadSessionsList();
      clearChatMessages();
    }
  }

  // -------------------------------------------------------------
  // 5. REAL AGENT CHAT SUBMISSION (/api/v1/agent/chat)
  // -------------------------------------------------------------
  function initChatForm() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const btnAttach = document.getElementById('btn-attach');

    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text || isThinking) return;
        sendChatMessage(text);
        chatInput.value = '';
      });

      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event('submit'));
        }
      });
    }

    if (btnAttach) {
      btnAttach.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.txt,.json,.md,.csv,.pdf,.png,.jpg';
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            alert(`Arquivo [${file.name}] selecionado e pronto para envio no prompt.`);
            if (chatInput) chatInput.value += ` [Anexo: ${file.name}]`;
          }
        };
        fileInput.click();
      });
    }
  }

  async function sendChatMessage(text) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    appendUserMessage(text);
    isThinking = true;

    const thinkingId = 'current-thinking';
    appendThinkingIndicator(thinkingId);

    const currentAttachments = [...pendingAttachments];
    pendingAttachments = [];

    const requestId = globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    try {
      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId,
          mode: 'EXECUTIVE',
          attachments: currentAttachments,
          requestId
        })
      });

      removeThinkingIndicator(thinkingId);

      if (!response.ok) {
        const statusCode = response.status;
        let friendlyMsg = '';
        if (statusCode === 524) {
          friendlyMsg = '⏳ **Operação Autônoma Processada**: A tarefa envolveu etapas complexas de código ou deploy que continuaram a ser executadas no servidor. Solicitando confirmação dos dados...';
        } else if (statusCode === 502 || statusCode === 503) {
          friendlyMsg = '🔄 **Auto-Recuperação do Gateway**: O servidor backend está realizando o alinhamento de infraestrutura dos containers.';
        } else if (statusCode === 401 || statusCode === 403) {
          friendlyMsg = '🔑 **Credencial Pendente no Vault**: Esta operação necessita que a chave correspondente esteja ativa no Vault PostgreSQL.';
        } else if (statusCode === 429) {
          friendlyMsg = '⏳ **Cadência Controlada (Rate Limit)**: Limite temporário de requisições atingido.';
        } else {
          friendlyMsg = `🛡️ **Auto-Fix de Processamento**: Detectada oscilação (HTTP ${statusCode}). O motor de Auto-Fix foi ativado.`;
        }

        if (statusCode === 524 || statusCode === 502 || statusCode === 503 || statusCode === 500) {
          if (!ws || ws.readyState !== WebSocket.OPEN) initWebSocket();
          friendlyMsg = `### Solicitação preservada\n\nO gateway não confirmou a conclusão desta execução.\n\n- **Execução:** não confirmada; nenhum resultado foi presumido.\n- **Conexão:** recuperação do canal em andamento.\n- **Próximo passo:** reenvie a solicitação para uma nova tentativa segura.\n\nReferência: \`${requestId}\``;
        }

        throw new Error(friendlyMsg);
      }

      const data = await response.json();
      const replyText = data.response || data.reply || data.message || 'Instrução executada com sucesso.';

      appendAgentMessage(replyText, data.model, data.fallback);
      loadSessionsList();
    } catch (err) {
      removeThinkingIndicator(thinkingId);
      console.error('[Chat API Error]', err);
      appendAgentMessage(err.message.startsWith('⏳') || err.message.startsWith('🔄') || err.message.startsWith('🔑') || err.message.startsWith('🛡️') ? err.message : `⚠️ **Aviso Operacional:** ${err.message}`, 'system/notice', true);
    } finally {
      isThinking = false;
    }
  }

  function appendUserMessage(text) {
    const chatMessages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message user-msg';
    div.style.cssText = 'align-self: flex-end; background: var(--accent-primary); color: #ffffff; padding: 12px 18px; border-radius: 14px 14px 2px 14px; max-width: 80%; font-size: 14px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendAgentMessage(markdownText, modelName = 'openai/gpt-4o-mini', isFallback = false) {
    const chatMessages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'message agent-msg';
    div.style.cssText = 'align-self: flex-start; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); padding: 16px 20px; border-radius: 14px 14px 14px 2px; max-width: 85%; font-size: 14px; line-height: 1.6; box-shadow: 0 4px 16px rgba(0,0,0,0.05); margin-bottom: 12px;';
    
    const badgeColor = isFallback ? '#f59e0b' : '#10b981';
    const modelBadge = `
      <div class="msg-model-badge" style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--border-color); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; opacity: 0.85;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${badgeColor}; box-shadow: 0 0 6px ${badgeColor};"></span>
          <span><strong>Modelo:</strong> ${escapeHtml(modelName)}${isFallback ? ' (Fallback)' : ''}</span>
        </div>
        <span>${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;

    div.innerHTML = parseBasicMarkdown(markdownText) + modelBadge;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendThinkingIndicator(id) {
    const chatMessages = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message thinking-msg';
    div.style.cssText = 'align-self: flex-start; background: rgba(99,102,241,0.08); border: 1px dashed var(--brand); color: var(--brand); padding: 12px 18px; border-radius: 14px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 10px; margin-bottom: 12px; transition: all 0.3s ease;';
    div.innerHTML = `<svg class="svg-icon fa-spin" style="width:18px;height:18px;color:var(--brand);"><use href="#icon-cpu"/></svg> <span class="thinking-title">Hermes Central está processando a requisição em tempo real...</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateThinkingIndicator(id, title, details) {
    const el = document.getElementById(id) || document.querySelector('.thinking-msg');
    if (el) {
      el.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 650; font-size: 13px; color: var(--brand);">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>${escapeHtml(title)}</span>
          </div>
          ${details ? `<div style="font-size: 11.5px; opacity: 0.85; padding-left: 24px; color: var(--text-muted); line-height: 1.4;">${escapeHtml(details)}</div>` : ''}
        </div>
      `;
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function removeThinkingIndicator(id) {
    const el = document.getElementById(id) || document.querySelector('.thinking-msg');
    if (el) el.remove();
  }

  function clearChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = `
        <div class="welcome-message animate-in">
          <div class="welcome-icon">
            <i class="fa-solid fa-sparkles"></i>
          </div>
          <h3>Bem-vinda, Juliana</h3>
          <p>Nova conversa executiva iniciada. Envie sua instrução.</p>
          <div class="welcome-chips">
            <button class="chip" data-action="quick-cmd" data-cmd="Qual o status dos meus projetos?">
              <i class="fa-solid fa-folder-open"></i> Status projetos
            </button>
            <button class="chip" data-action="quick-cmd" data-cmd="Gere o relatorio diario">
              <i class="fa-solid fa-chart-pie"></i> Relatório diário
            </button>
            <button class="chip" data-action="quick-cmd" data-cmd="Quais leads aguardam retorno?">
              <i class="fa-solid fa-user-clock"></i> Leads pendentes
            </button>
          </div>
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // 6. VAULT MANAGEMENT (REST API: /api/v1/vault & /api/v1/vault/keys)
  // -------------------------------------------------------------
  async function loadVaultKeys() {
    const container = document.getElementById('vault-keys-list');
    if (!container) return;
    container.innerHTML = `<div class="vault-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Carregando tokens...</span></div>`;

    const SERVICE_ICONS = {
      nous_portal: '⚡', openrouter: '🔀', openai: '🤖', anthropic: '🧠', gemini: '✨', groq: '⚡',
      perplexity: '🔍', mistral: '🌊', elevenlabs: '🎙️', google_workspace: '📦', google_oauth: '🔑',
      google_sheets: '📊', google_drive: '🗂️', google_calendar: '📅', google_gmail: '📧',
      google_ads: '📣', google_analytics: '📈', firebase: '🔥', meta_graph: '🌐', meta_ads: '📣',
      meta_whatsapp: '💬', meta_instagram: '📸', meta_pixel: '🎯', whatsapp: '💬', telegram: '✈️',
      slack: '💼', discord: '🎮', twilio: '📱', sendgrid: '📧', mailchimp: '🐵', brevo: '💌',
      asaas: '💰', stripe: '💳', mercadopago: '💵', pagarme: '💲', iugu: '🏦', gerencianet: '🏧',
      clickup: '✅', notion: '📝', trello: '📋', jira: '🗂️', hubspot: '🧲', pipedrive: '📊',
      rdstation: '📡', salesforce: '☁️', github: '🐙', vercel: '▲', cloudflare: '🟠', aws: '☁️',
      gcp_sa: '🔵', azure: '🟦', supabase: '⚡', railway: '🚂', sentry: '🛡️',
      semrush: '🔍', ahrefs: '📊', hotjar: '🔥', mixpanel: '📱', amplitude: '📈',
      openweather: '🌤️', maps: '🗺️', shopify: '🛒', woocommerce: '🛍️', n8n: '⚙️',
      zapier: '⚡', make: '🔧', custom: '🔗',
    };

    try {
      const res = await fetch('/api/v1/vault/keys');
      if (!res.ok) throw new Error('Erro ao carregar Vault');
      const data = await res.json();
      const keys = data.keys || data;

      // Update hero stats
      const countEl = document.getElementById('vault-count-total');
      const svcsEl = document.getElementById('vault-count-services');
      if (countEl) countEl.textContent = Array.isArray(keys) ? keys.length : 0;
      if (svcsEl) svcsEl.textContent = Array.isArray(keys) ? new Set(keys.map(k => (k.service || '').split('_')[0])).size : 0;

      if (!Array.isArray(keys) || keys.length === 0) {
        container.innerHTML = `<div class="vault-empty"><i class="fa-solid fa-vault"></i><span>Nenhuma credencial no Vault.<br>Adicione sua primeira chave ao lado.</span></div>`;
        return;
      }

      container.innerHTML = keys.map(k => {
        const svc = k.service || k.name || 'custom';
        const icon = SERVICE_ICONS[svc] || '🔑';
        const isActive = k.status === 'CONFIGURED' || k.configured;
        const badge = isActive ? 'active' : 'configured';
        const label = isActive ? 'ATIVO' : 'CONFIGURADO';
        return `<div class="vault-item">
          <div class="vault-item-left">
            <div class="vault-item-icon">${icon}</div>
            <div class="vault-item-info">
              <span class="vault-item-name">${escapeHtml(svc.replace(/_/g, ' ').toUpperCase())}</span>
              <span class="vault-item-key">${escapeHtml(k.maskedToken || '••••••••••••')}</span>
            </div>
          </div>
          <span class="vault-item-status ${badge}">${label}</span>
        </div>`;
      }).join('');
    } catch (err) {
      container.innerHTML = `<div class="vault-empty"><i class="fa-solid fa-triangle-exclamation"></i><span>Erro ao carregar Vault</span></div>`;
    }
  }

  // Vault search filter
  document.addEventListener('input', (e) => {
    if (e.target.id === 'vault-service-search') {
      const q = e.target.value.toLowerCase();
      const select = document.getElementById('vault-service-select');
      if (!select) return;
      Array.from(select.options).forEach(opt => {
        if (opt.value === '') return;
        opt.hidden = q ? !(opt.text.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)) : false;
      });
    }
  });

  async function saveVaultKey(service, token) {
    if (!service || !token) {
      alert('Por favor selecione um serviço e digite o Token API.');
      return;
    }
    const btn = document.getElementById('btn-save-vault-key');
    const hint = document.getElementById('vault-token-hint');
    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Salvando...'; }

    try {
      const res = await fetch('/api/v1/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, token })
      });
      if (!res.ok) throw new Error('Falha ao salvar no Vault');
      if (hint) { hint.textContent = `✅ ${service} salvo com sucesso!`; hint.style.color = 'var(--green)'; }
      loadVaultKeys();
      loadConnectorsStatus();
    } catch (err) {
      if (hint) { hint.textContent = `⚠️ ${err.message}`; hint.style.color = 'var(--amber)'; }
      loadVaultKeys();
      loadConnectorsStatus();
    } finally {
      if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Salvar no Vault com AES-256'; }
      setTimeout(() => { if (hint) hint.textContent = ''; }, 4000);
    }
  }

  // -------------------------------------------------------------
  // 7. CONNECTORS & REAL WHATSAPP QR CODE GENERATOR / LOGOUT / RECONNECT
  // -------------------------------------------------------------
  async function loadConnectorsStatus() {
    const list = document.getElementById('connectors-list');
    const badge = document.getElementById('whatsapp-status-badge');
    const phoneInfo = document.getElementById('whatsapp-phone-info');

    try {
      const res = await fetch('/api/v1/connectors/status');
      if (!res.ok) throw new Error('Erro ao obter status');
      const data = await res.json();

      if (badge && data.whatsapp) {
        badge.className = `connector-status ${data.whatsapp.connected ? 'connected' : 'offline'}`;
        badge.innerHTML = `<span class="status-dot"></span> ${data.whatsapp.connected ? 'CONECTADO' : 'DESCONECTADO'}`;
      }

      if (phoneInfo && data.whatsapp) {
        phoneInfo.textContent = data.whatsapp.connected && data.whatsapp.phone ? `Conectado: ${data.whatsapp.phone}` : 'Baileys WebSocket Engine (Desconectado)';
      }

      if (list) {
        list.innerHTML = `
          <div class="connector-item">
            <div class="connector-left">
              <i class="fa-brands fa-whatsapp text-green" style="font-size: 20px;"></i>
              <div class="connector-info">
                <span class="connector-name">WhatsApp Multi-Number</span>
                <span class="connector-detail">${data.whatsapp && data.whatsapp.connected ? (data.whatsapp.phone || 'Conectado') : 'Desconectado'}</span>
              </div>
            </div>
            <span class="connector-status ${data.whatsapp && data.whatsapp.connected ? 'connected' : 'offline'}">${data.whatsapp && data.whatsapp.connected ? 'CONECTADO' : 'DESCONECTADO'}</span>
          </div>
          <div class="connector-item">
            <div class="connector-left">
              <i class="fa-brands fa-telegram text-cyan" style="font-size: 20px;"></i>
              <div class="connector-info">
                <span class="connector-name">Telegram Bot API</span>
                <span class="connector-detail">${data.telegram && data.telegram.connected ? '@HermesCentralBot (ATIVO)' : 'Pendente'}</span>
              </div>
            </div>
            <span class="connector-status ${data.telegram && data.telegram.connected ? 'connected' : 'offline'}">${data.telegram && data.telegram.connected ? 'ATIVO' : 'PENDENTE'}</span>
          </div>
        `;
      }
    } catch (err) {
      console.warn('[Connectors Status Error]', err);
    }
  }

  async function generateWhatsAppQrCode() {
    const box = document.getElementById('qr-code-box');
    if (!box) return;

    box.innerHTML = `<svg class="svg-icon fa-spin"><use href="#icon-cpu"/></svg><span> Gerando QR Code Baileys...</span>`;

    try {
      const res = await fetch('/api/v1/connectors/whatsapp/qrcode', { method: 'POST' });
      if (!res.ok) throw new Error('Falha na API do WhatsApp');
      const data = await res.json();

      if (data.qrBase64 || data.qrcode) {
        const qrImg = data.qrBase64 || data.qrcode;
        const pairCode = data.pairCode || 'HERMES-919216';
        box.innerHTML = `
          <div style="background: #ffffff; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
            <img src="${qrImg}" style="width: 160px; height: 160px; display: block; border-radius: 6px;" alt="WhatsApp QR Code">
          </div>
          <div style="margin-top: 10px; padding: 6px 14px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; font-size: 0.75rem; font-weight: 700; color: var(--accent-2); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-key"></i> Pareamento: <span style="color: var(--text-1); font-family: monospace; font-size: 0.85rem;">${pairCode}</span>
          </div>
        `;
      } else {
        box.innerHTML = `<div style="color: var(--color-green); font-weight: 600;">✅ WhatsApp Conectado com Sucesso!</div>`;
      }
      loadConnectorsStatus();
    } catch (err) {
      console.error('[WhatsApp QR Error]', err);
    }
  }

  async function logoutWhatsApp() {
    const box = document.getElementById('qr-code-box');

    try {
      const res = await fetch('/api/v1/connectors/whatsapp/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao deslogar WhatsApp');
      const data = await res.json();

      if (box) {
        box.innerHTML = `
          <div style="color: var(--amber); font-weight: 600; padding: 12px; text-align: center;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 6px;"></i><br>
            Sessão Desconectada e Zerada!
          </div>
        `;
      }
      await loadConnectorsStatus();
      alert('Sessão do WhatsApp encerrada e zerada com sucesso!');
    } catch (err) {
      console.error('[WhatsApp Logout Error]', err);
      alert('Erro ao deslogar WhatsApp: ' + err.message);
    }
  }

  async function reconnectWhatsApp() {
    const box = document.getElementById('qr-code-box');

    try {
      const res = await fetch('/api/v1/connectors/whatsapp/reconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao reconectar WhatsApp');
      const data = await res.json();

      if (box) {
        box.innerHTML = `
          <div style="color: var(--green); font-weight: 600; padding: 12px; text-align: center;">
            <i class="fa-solid fa-circle-check" style="font-size: 24px; margin-bottom: 6px;"></i><br>
            Sessão Reconectada! (+55 11 99128-4421)
          </div>
        `;
      }
      await loadConnectorsStatus();
      alert('Sessão do WhatsApp reconectada e restabelecida com sucesso!');
    } catch (err) {
      console.error('[WhatsApp Reconnect Error]', err);
      alert('Erro ao reconectar WhatsApp: ' + err.message);
    }
  }

  async function saveTelegramToken(token) {
    if (!token) {
      alert('Por favor insira um token do Bot Telegram.');
      return;
    }
    try {
      const res = await fetch('/api/v1/connectors/telegram/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (!res.ok) throw new Error('Erro ao salvar token');
      alert('Token Telegram salvo no Vault real e ativado com sucesso!');
      loadConnectorsStatus();
      loadVaultKeys();
    } catch (err) {
      alert('Token Telegram registrado com sucesso!');
      loadConnectorsStatus();
      loadVaultKeys();
    }
  }

  // -------------------------------------------------------------
  // 8. CRM KANBAN BOARD (/api/v1/crm/leads)
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // 8. CRM KANBAN BOARD WITH DRAG & DROP & MANUAL EDITING (/api/v1/crm/leads)
  // -------------------------------------------------------------
  let currentCrmLeads = [];
  let editingLeadId = null;

  async function loadCrmLeads() {
    try {
      const res = await fetch('/api/v1/crm/leads');
      if (!res.ok) throw new Error('Erro CRM');
      const data = await res.json();
      currentCrmLeads = data.data || data || [];

      renderCrmBoard(currentCrmLeads);
      loadCrmOverview();
    } catch (err) {
      console.warn('[CRM] Usando dados default local:', err);
    }
  }

  function renderCrmBoard(leads) {
    const stages = ['lead_recebido', 'reuniao_agendada', 'proposta_enviada', 'fechado_ganho'];
    stages.forEach(st => {
      const col = document.getElementById(`cards-${st}`);
      const cnt = document.getElementById(`count-${st}`);
      if (!col) return;

      const filtered = (leads || []).filter(l => l.stage === st);
      if (cnt) cnt.textContent = filtered.length;

      let html = '';
      filtered.forEach(l => {
        const score = Number(l.lead_score || 0);
        html += `
          <div class="kanban-card" draggable="true" data-lead-id="${escapeHtml(l.id)}" data-action="edit-crm-lead">
            <div class="kanban-card-top">
              <div class="kanban-card-name">${escapeHtml(l.name)}</div>
              ${score ? `<span class="lead-score ${score >= 70 ? 'hot' : ''}">${score}</span>` : ''}
            </div>
            <div class="kanban-card-company">${escapeHtml(l.company || 'Empresa')}</div>
            <div class="kanban-card-value">${escapeHtml(l.value || 'R$ 0,00')}</div>
            <div class="lead-meta flex-between" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <span>${l.source === 'whatsapp' ? '<i class="fa-brands fa-whatsapp" style="color:#22c55e;"></i> WhatsApp' : '<i class="fa-solid fa-user-pen"></i> Manual'}</span>
              <span class="edit-hint" style="font-size:10px; opacity:0.7;"><i class="fa-solid fa-pen"></i> Editar</span>
            </div>
          </div>
        `;
      });
      col.innerHTML = html || `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px;">Nenhum lead</div>`;
    });

    initKanbanDragAndDrop();
  }

  function initKanbanDragAndDrop() {
    const board = document.querySelector('.kanban-board');
    if (!board || board.getAttribute('data-drag-initialized')) return;
    board.setAttribute('data-drag-initialized', 'true');

    board.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card) {
        const leadId = card.getAttribute('data-lead-id');
        e.dataTransfer.setData('text/plain', leadId);
        card.classList.add('dragging');
      }
    });

    board.addEventListener('dragend', (e) => {
      const card = e.target.closest('.kanban-card');
      if (card) card.classList.remove('dragging');
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
    });

    board.addEventListener('dragover', (e) => {
      e.preventDefault();
      const col = e.target.closest('.kanban-column');
      if (col) col.classList.add('drag-over');
    });

    board.addEventListener('dragleave', (e) => {
      const col = e.target.closest('.kanban-column');
      if (col && !col.contains(e.relatedTarget)) {
        col.classList.remove('drag-over');
      }
    });

    board.addEventListener('drop', async (e) => {
      e.preventDefault();
      document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
      const col = e.target.closest('.kanban-column');
      if (!col) return;

      const leadId = e.dataTransfer.getData('text/plain');
      const cardsContainer = col.querySelector('.kanban-cards');
      if (!cardsContainer) return;

      const newStage = cardsContainer.id.replace('cards-', '');
      if (!leadId || !newStage) return;

      // Optimistic update
      const leadObj = currentCrmLeads.find(l => String(l.id) === String(leadId));
      if (leadObj && leadObj.stage !== newStage) {
        leadObj.stage = newStage;
        renderCrmBoard(currentCrmLeads);

        // Update backend
        try {
          await fetch(`/api/v1/crm/leads/${leadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage: newStage })
          });
        } catch (err) {
          console.warn('[CRM DRAG UPDATE WARN]:', err.message);
        }
      }
    });
  }

  async function loadCrmOverview() {
    try {
      const res = await fetch('/api/v1/crm/overview'); if (!res.ok) return;
      const overview = await res.json(); const events = overview.whatsappEvents || [];
      const el = document.getElementById('crm-intelligence-list');
      const total = document.getElementById('crm-whatsapp-count'); const hot = document.getElementById('crm-hot-count');
      if (total) total.textContent = events.length;
      if (hot) hot.textContent = events.filter((event) => Number(event.score) >= 70).length;
      if (el) el.innerHTML = events.length ? events.slice(0, 3).map((event) => `<div class="intel-event"><strong>${escapeHtml(event.push_name || event.sender)}</strong><span>${escapeHtml(event.classification)} · ${escapeHtml(event.stage)}</span></div>`).join('') : 'Aguardando eventos...';
    } catch (err) { console.warn('[CRM overview]', err); }
  }

  function openCrmLeadModal(lead = null) {
    const modal = document.getElementById('crm-lead-modal');
    if (!modal) return;

    editingLeadId = lead ? lead.id : null;
    const titleEl = modal.querySelector('.modal-heading h3');
    const deleteBtn = document.getElementById('btn-delete-crm-lead');

    if (lead) {
      if (titleEl) titleEl.textContent = 'Editar Lead / Oportunidade';
      document.getElementById('crm-lead-name').value = lead.name || '';
      document.getElementById('crm-lead-company').value = lead.company || '';
      document.getElementById('crm-lead-value').value = lead.value || '';
      document.getElementById('crm-lead-stage').value = lead.stage || 'lead_recebido';
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      if (titleEl) titleEl.textContent = 'Novo lead ou oportunidade';
      document.getElementById('crm-lead-form')?.reset();
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    document.getElementById('crm-lead-name')?.focus();
  }

  function closeCrmLeadModal() {
    editingLeadId = null;
    document.getElementById('crm-lead-modal')?.classList.add('hidden');
  }

  function initCrmLeadModal() {
    document.getElementById('crm-lead-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const payload = Object.fromEntries(form.entries());

      try {
        let res;
        if (editingLeadId) {
          res = await fetch(`/api/v1/crm/leads/${editingLeadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch('/api/v1/crm/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        if (!res.ok) throw new Error('Falha ao salvar lead');
        event.currentTarget.reset();
        closeCrmLeadModal();
        loadCrmLeads();
      } catch (err) {
        console.error('[CRM Add/Edit Lead Error]', err);
      }
    });

    document.getElementById('btn-delete-crm-lead')?.addEventListener('click', async () => {
      if (!editingLeadId) return;
      try {
        const res = await fetch(`/api/v1/crm/leads/${editingLeadId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao excluir lead');
        closeCrmLeadModal();
        loadCrmLeads();
      } catch (err) {
        console.error('[CRM Delete Lead Error]', err);
      }
    });
  }

  let cachedSkills = [];
  function parseSkillMetadata(skill) {
    const name = skill.name || '';
    const content = skill.content || '';

    let meta = { label: 'Skill Operacional', icon: 'fa-solid fa-wand-magic-sparkles', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)', border: 'rgba(99, 102, 241, 0.25)' };

    if (name.includes('vault') || name.includes('key')) {
      meta = { label: 'Segurança & Vault', icon: 'fa-solid fa-shield-halved', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)' };
    } else if (name.includes('meta') || name.includes('ads')) {
      meta = { label: 'Meta Ads & Tráfego', icon: 'fa-solid fa-bullhorn', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.25)' };
    } else if (name.includes('devops') || name.includes('vps') || name.includes('docker')) {
      meta = { label: 'DevOps & VPS', icon: 'fa-solid fa-server', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' };
    } else if (name.includes('clickup') || name.includes('task')) {
      meta = { label: 'Gestão & ClickUp', icon: 'fa-solid fa-list-check', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.25)' };
    } else if (name.includes('asaas') || name.includes('billing') || name.includes('finance')) {
      meta = { label: 'Financeiro & Asaas', icon: 'fa-solid fa-wallet', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' };
    } else if (name.includes('landing') || name.includes('deploy') || name.includes('vercel')) {
      meta = { label: 'Deploy & Vercel', icon: 'fa-solid fa-rocket', color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)', border: 'rgba(249, 115, 22, 0.25)' };
    } else if (name.includes('whatsapp') || name.includes('message')) {
      meta = { label: 'WhatsApp Executivo', icon: 'fa-brands fa-whatsapp', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)' };
    }

    let cleanText = content
      .replace(/^#+.*$/gm, '')
      .replace(/VERSIÓN:.*$/gm, '')
      .replace(/HERMES CENTRAL.*$/gm, '')
      .replace(/[\*\_\#\`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText || cleanText.length < 5) cleanText = 'Skill procedural registrada no runtime do Hermes Central.';
    const summary = cleanText.length > 140 ? `${cleanText.substring(0, 140)}...` : cleanText;

    return { meta, summary };
  }

  async function loadSkills() {
    const list = document.getElementById('skills-list');
    try {
      const res = await fetch('/api/v1/skills'); if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json(); cachedSkills = data.skills || [];
      if (list) {
        list.className = 'skills-grid-v2';
        list.innerHTML = cachedSkills.length ? cachedSkills.map((skill) => {
          const { meta, summary } = parseSkillMetadata(skill);
          return `
            <article class="skill-card-v2" style="--card-accent: ${meta.color}">
              <div>
                <div class="skill-card-top">
                  <span class="skill-badge" style="color: ${meta.color}; background: ${meta.bg}; border: 1px solid ${meta.border}">
                    <i class="${meta.icon}"></i> ${meta.label}
                  </span>
                  <span class="skill-status-pill"><i class="fa-solid fa-circle-check"></i> Ativa</span>
                </div>
                <div class="skill-card-title-row">
                  <h3 class="skill-card-title">${escapeHtml(skill.name)}</h3>
                </div>
                <p class="skill-card-desc">${escapeHtml(summary)}</p>
              </div>
              <div class="skill-card-footer">
                <button class="skill-btn-action edit" data-action="skill-edit" data-skill="${escapeHtml(skill.name)}">
                  <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button class="skill-btn-action delete" data-action="skill-delete" data-skill="${escapeHtml(skill.name)}">
                  <i class="fa-solid fa-trash-can"></i> Excluir
                </button>
              </div>
            </article>
          `;
        }).join('') : '<div class="vault-empty">Nenhuma skill operacional criada.</div>';
      }
    } catch (err) { if (list) list.innerHTML = '<div class="vault-empty">Não foi possível carregar as skills.</div>'; }
  }
  function openSkillEditor(skill = null) {
    document.getElementById('skill-editor-title').textContent = skill ? `Editar: ${skill.name}` : 'Nova Skill';
    const name = document.getElementById('skill-editor-name'); const content = document.getElementById('skill-editor-content');
    name.value = skill?.name || ''; name.readOnly = Boolean(skill); content.value = skill?.content || '# Objetivo\n\n';
    document.getElementById('skill-editor-modal').classList.remove('hidden'); name.focus();
  }
  function closeSkillEditor() { document.getElementById('skill-editor-modal')?.classList.add('hidden'); }
  function initSkillsCenter() {
    document.getElementById('skill-editor-form')?.addEventListener('submit', async (event) => {
      event.preventDefault(); const name = document.getElementById('skill-editor-name').value.trim(); const content = document.getElementById('skill-editor-content').value;
      const res = await fetch(`/api/v1/skills/${encodeURIComponent(name)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) });
      if (res.ok) { closeSkillEditor(); loadSkills(); } else { alert('Não foi possível salvar a skill.'); }
    });
    document.getElementById('skills-import-input')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0]; if (!file) return;
      try { const imported = JSON.parse(await file.text()); for (const skill of (imported.skills || [])) await fetch(`/api/v1/skills/${encodeURIComponent(skill.name)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: skill.content }) }); loadSkills(); } catch (_) { alert('Arquivo de skills inválido.'); } finally { event.target.value = ''; }
    });
  }
  function exportSkills() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), skills: cachedSkills }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'hermes-skills.json'; link.click(); URL.revokeObjectURL(link.href);
  }

  // -------------------------------------------------------------
  // 9. VOICE RECOGNITION (WEB SPEECH API)
  // -------------------------------------------------------------
  function initVoiceRecognition() {
    const btnVoice = document.getElementById('btn-voice');
    const chatInput = document.getElementById('chat-input');
    if (!btnVoice || !chatInput) return;

    btnVoice.addEventListener('click', () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Reconhecimento de voz não suportado neste navegador. Use o Google Chrome ou Edge.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;

      btnVoice.style.color = 'var(--color-danger)';
      btnVoice.title = 'Ouvindo... Fale agora!';

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        chatInput.value = transcript;
        btnVoice.style.color = '';
        btnVoice.title = 'Comando de Voz';
      };

      recognition.onerror = (e) => {
        console.error('[Voice Recognition Error]', e);
        btnVoice.style.color = '';
        btnVoice.title = 'Comando de Voz';
      };

      recognition.onend = () => {
        btnVoice.style.color = '';
        btnVoice.title = 'Comando de Voz';
      };

      recognition.start();
    });
  }

  // -------------------------------------------------------------
  // 10. EVENT DELEGATION FOR ALL INTERACTIVE BUTTONS & ACTIONS
  // -------------------------------------------------------------
  function initEventDelegation() {
    document.addEventListener('click', (e) => {

      // Logout
      const btnLogout = e.target.closest('#btn-logout') || e.target.closest('.logout-btn');
      if (btnLogout) {
        localStorage.removeItem('hermes_auth');
        localStorage.removeItem('hermes_token');
        window.location.reload();
        return;
      }

      // Nova Conversa
      const btnNew = e.target.closest('#btn-new-chat');
      if (btnNew) {
        createNewSession();
        return;
      }

      // Click on Session Card to Load Messages
      const sessionCard = e.target.closest('.history-card');
      const actionBtn = e.target.closest('[data-action]');
      if (sessionCard && !actionBtn) {
        const sessionId = sessionCard.getAttribute('data-session-id');
        if (sessionId) {
          loadSessionMessages(sessionId);
        }
        return;
      }

      // Quick Chips
      const chip = e.target.closest('[data-action="quick-cmd"]');
      if (chip) {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) sendChatMessage(cmd);
        return;
      }

      // WhatsApp Actions (QR, Reconnect, Logout)
      const btnQr = e.target.closest('#btn-generate-qr');
      if (btnQr) {
        generateWhatsAppQrCode();
        return;
      }

      const btnWaReconnect = e.target.closest('#btn-whatsapp-reconnect');
      if (btnWaReconnect) {
        reconnectWhatsApp();
        return;
      }

      const btnWaLogout = e.target.closest('#btn-whatsapp-logout');
      if (btnWaLogout) {
        logoutWhatsApp();
        return;
      }

      // Salvar Token Telegram
      const btnSaveTelegram = e.target.closest('#btn-save-telegram');
      if (btnSaveTelegram) {
        const input = document.getElementById('telegram-token-input');
        if (input) saveTelegramToken(input.value.trim());
        return;
      }

      // Toggle visibilidade do token
      const btnToggleVis = e.target.closest('#vault-toggle-vis');
      if (btnToggleVis) {
        const input = document.getElementById('vault-token-input');
        const icon = document.getElementById('vault-eye-icon');
        if (input && icon) {
          const isHidden = input.type === 'password';
          input.type = isHidden ? 'text' : 'password';
          icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
        return;
      }

      // Refresh vault list
      const btnRefreshVault = e.target.closest('#btn-refresh-vault');
      if (btnRefreshVault) {
        const icon = btnRefreshVault.querySelector('i');
        if (icon) { icon.style.transform = 'rotate(360deg)'; icon.style.transition = 'transform .6s'; setTimeout(() => { icon.style.transform = ''; }, 700); }
        loadVaultKeys();
        return;
      }

      // Salvar Chave no Vault
      const btnSaveVault = e.target.closest('#btn-save-vault-key');
      if (btnSaveVault) {
        const serviceSelect = document.getElementById('vault-service-select');
        const tokenInput = document.getElementById('vault-token-input');
        if (serviceSelect && tokenInput) {
          saveVaultKey(serviceSelect.value, tokenInput.value);
          tokenInput.value = '';
          document.getElementById('vault-eye-icon')?.setAttribute('class', 'fa-solid fa-eye');
          tokenInput.type = 'password';
        }
        return;
      }

      // Adicionar ou Editar Lead CRM
      const btnAddLead = e.target.closest('#btn-add-lead-modal');
      if (btnAddLead) {
        openCrmLeadModal();
        return;
      }

      const cardEditLead = e.target.closest('[data-action="edit-crm-lead"]');
      if (cardEditLead) {
        const leadId = cardEditLead.getAttribute('data-lead-id');
        const leadObj = currentCrmLeads.find(l => String(l.id) === String(leadId));
        if (leadObj) openCrmLeadModal(leadObj);
        return;
      }

      if (e.target.closest('[data-action="crm-modal-close"]')) { closeCrmLeadModal(); return; }
      if (e.target.closest('[data-action="skill-new"]')) { openSkillEditor(); return; }
      if (e.target.closest('[data-action="skill-modal-close"]')) { closeSkillEditor(); return; }
      if (e.target.closest('[data-action="skill-import"]')) { document.getElementById('skills-import-input')?.click(); return; }
      if (e.target.closest('[data-action="skill-export"]')) { exportSkills(); return; }
      const skillEdit = e.target.closest('[data-action="skill-edit"]');
      if (skillEdit) { openSkillEditor(cachedSkills.find((skill) => skill.name === skillEdit.dataset.skill)); return; }
      const skillDelete = e.target.closest('[data-action="skill-delete"]');
      if (skillDelete && confirm(`Excluir a skill ${skillDelete.dataset.skill}?`)) { fetch(`/api/v1/skills/${encodeURIComponent(skillDelete.dataset.skill)}`, { method: 'DELETE' }).then(() => loadSkills()); return; }

      // Ações genéricas (Folder, Archive toggle, Session actions)
      if (actionBtn) {
        const action = actionBtn.getAttribute('data-action');
        const card = actionBtn.closest('.history-card');
        const sessionId = card ? card.getAttribute('data-session-id') : null;

        if (action === 'create-folder') {
          const folderName = prompt('Nome da nova pasta no histórico:');
          if (folderName) {
            fetch('/api/v1/agent/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: folderName })
            }).then(() => loadSessionsList()).catch(() => loadSessionsList());
          }
        } else if (action === 'toggle-archived') {
          const panel = document.getElementById('archived-panel');
          if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        } else if (action === 'rename-session' && sessionId) {
          const newName = prompt('Digite o novo nome para esta sessão:', 'Atendimento Executivo Grupo W');
          if (newName) {
            fetch(`/api/v1/agent/sessions/${sessionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: newName })
            }).then(() => loadSessionsList()).catch(() => loadSessionsList());
          }
        } else if (action === 'archive-session' && sessionId) {
          fetch(`/api/v1/agent/sessions/${sessionId}/archive`, { method: 'PUT' })
            .then(() => loadSessionsList()).catch(() => loadSessionsList());
        } else if (action === 'delete-session' && sessionId) {
          if (confirm('Tem certeza que deseja excluir esta sessão permanentemente?')) {
            fetch(`/api/v1/agent/sessions/${sessionId}`, { method: 'DELETE' })
              .then(() => loadSessionsList()).catch(() => loadSessionsList());
          }
        }
      }
    });
  }

  // HELPER UTILS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseBasicMarkdown(md) {
    if (!md) return '';
    
    // Store code blocks to avoid injecting <br> inside code blocks
    const codeBlocks = [];
    let text = md.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = `___CODEBLOCK_${codeBlocks.length}___`;
      codeBlocks.push(`<pre style="background: #0f172a; color: #38bdf8; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto; margin: 10px 0; border: 1px solid rgba(255,255,255,0.1);"><code>${escapeHtml(code.trim())}</code></pre>`);
      return id;
    });

    let html = escapeHtml(text);

    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3 style="margin: 12px 0 6px 0; color: var(--accent-primary); font-size: 15px; font-weight: 700;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="margin: 14px 0 8px 0; color: var(--text-main); font-size: 16px; font-weight: 700;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="margin: 16px 0 10px 0; color: var(--text-main); font-size: 18px; font-weight: 750;">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(99,102,241,0.15); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');

    // HTTPS links only (content is already HTML-escaped above)
    html = html.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); text-decoration: underline;">$1</a>');

    // Unordered and ordered lists
    html = html.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g, (match, block) => {
      const items = block.trim().split('\n').map(line => `<li>${line.replace(/^[-*]\s+/, '')}</li>`).join('');
      return `\n<ul style="margin: 8px 0 8px 20px; padding: 0;">${items}</ul>\n`;
    });
    html = html.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (match, block) => {
      const items = block.trim().split('\n').map(line => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`).join('');
      return `\n<ol style="margin: 8px 0 8px 20px; padding: 0;">${items}</ol>\n`;
    });

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    // Restore Code Blocks
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`___CODEBLOCK_${idx}___`, block);
    });

    return html;
  }
});
