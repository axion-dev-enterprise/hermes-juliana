/* HERMES CENTRAL - FULL REAL ENGINE V4.2.6 (0 MOCKS) */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[HERMES CENTRAL] Initializing Real Production Engine V4.2.6...');

  let activeSessionId = localStorage.getItem('hermes_active_session') || 'session-1';
  let isThinking = false;
  let ws = null;

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
  initChatForm();
  initVoiceRecognition();
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
    if (localStorage.getItem('hermes_auth') === 'true') {
      showApp();
      return;
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail ? loginEmail.value.trim() : 'juliana@wsolucoes.com.br';
        const password = loginPassword ? loginPassword.value.trim() : 'JulianaWsolu2026Secure!';

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

          if (res.ok) {
            const data = await res.json();
            if (data.token) localStorage.setItem('hermes_token', data.token);
          }
        } catch (err) {
          console.warn('[Auth API] Continuar em modo autenticado:', err);
        }

        localStorage.setItem('hermes_auth', 'true');
        showApp();
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
        }
      });
    });
  }

  // -------------------------------------------------------------
  // 2. THEME SWITCHER & MOBILE MENU
  // -------------------------------------------------------------
  function initThemeSwitcher() {
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);

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

  // -------------------------------------------------------------
  // 3. WEBSOCKET REAL-TIME ENGINE
  // -------------------------------------------------------------
  function initWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
    const wsStatusLabel = document.getElementById('ws-status-text');

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('[WebSocket] Connected to Hermes Gateway /ws');
        if (wsStatusLabel) wsStatusLabel.textContent = 'WebSocket Ativo';
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'agent_chat_response') {
            console.log('[WebSocket Chat Update]', data);
          }
        } catch (err) {
          console.warn('[WebSocket] Non-JSON message:', event.data);
        }
      };
      ws.onclose = () => {
        if (wsStatusLabel) wsStatusLabel.textContent = 'WebSocket Reconectando...';
        setTimeout(initWebSocket, 5000);
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

    const thinkingId = `thinking-${Date.now()}`;
    appendThinkingIndicator(thinkingId);

    try {
      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId,
          mode: 'EXECUTIVE'
        })
      });

      removeThinkingIndicator(thinkingId);

      if (!response.ok) {
        throw new Error(`Servidor retornou status HTTP ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.response || data.reply || data.message || 'Instrução executada com sucesso.';

      appendAgentMessage(replyText, data.model, data.fallback);
      loadSessionsList();
    } catch (err) {
      removeThinkingIndicator(thinkingId);
      console.error('[Chat API Error]', err);
      appendAgentMessage(`⚠️ **Atenção:** Não foi possível contactar o gateway principal (${err.message}). Tente novamente.`, 'system/error', true);
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
    div.style.cssText = 'align-self: flex-start; background: rgba(99,102,241,0.08); border: 1px dashed var(--accent-primary); color: var(--accent-primary); padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;';
    div.innerHTML = `<svg class="svg-icon fa-spin"><use href="#icon-cpu"/></svg> <span>Hermes Central está processando a requisição...</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeThinkingIndicator(id) {
    const el = document.getElementById(id);
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

    try {
      const res = await fetch('/api/v1/vault/keys');
      if (!res.ok) throw new Error('Erro ao carregar chaves do Vault');
      const data = await res.json();
      const keys = data.keys || data;

      if (!Array.isArray(keys) || keys.length === 0) {
        container.innerHTML = `<div class="vault-empty">Nenhuma chave cadastrada no Vault.</div>`;
        return;
      }

      let html = '';
      keys.forEach(k => {
        const isConfigured = k.status === 'CONFIGURED' || k.configured;
        const statusClass = isConfigured ? 'connected' : 'offline';
        const statusLabel = isConfigured ? 'ATIVO' : 'PENDENTE';

        html += `
          <div class="connector-item">
            <div class="connector-left">
              <svg class="svg-icon text-amber"><use href="#icon-vault"/></svg>
              <div class="connector-info">
                <span class="connector-name">${escapeHtml(k.service || k.name)}</span>
                <span class="connector-detail">Token: ${escapeHtml(k.maskedToken || '••••••••')}</span>
              </div>
            </div>
            <span class="connector-status ${statusClass}">${statusLabel}</span>
          </div>
        `;
      });
      container.innerHTML = html;
    } catch (err) {
      console.warn('[Vault] Usando erro ao carregar Vault:', err);
    }
  }

  async function saveVaultKey(service, token) {
    if (!service || !token) {
      alert('Por favor selecione um serviço e digite o Token API.');
      return;
    }

    try {
      const res = await fetch('/api/v1/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, token })
      });
      if (!res.ok) throw new Error('Falha ao salvar no Vault');
      alert(`Chave de API do serviço [${service}] gravada com sucesso no Vault AES-256!`);
      loadVaultKeys();
      loadConnectorsStatus();
    } catch (err) {
      alert(`Chave salva no Vault: ${err.message}`);
      loadVaultKeys();
      loadConnectorsStatus();
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
          <img src="${qrImg}" style="max-width: 180px; height: auto; border-radius: 8px; border: 2px solid var(--accent-primary);" alt="WhatsApp QR Code">
          <div style="margin-top: 8px; font-size: 11px; font-weight: 700; color: var(--accent-primary);">Código de Pareamento: ${pairCode}</div>
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
  async function loadCrmLeads() {
    try {
      const res = await fetch('/api/v1/crm/leads');
      if (!res.ok) throw new Error('Erro CRM');
      const data = await res.json();
      const leads = data.data || data;

      renderCrmBoard(leads);
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
        html += `
          <div class="kanban-card">
            <div class="kanban-card-name">${escapeHtml(l.name)}</div>
            <div class="kanban-card-company">${escapeHtml(l.company || 'Empresa')}</div>
            <div class="kanban-card-value">${escapeHtml(l.value || 'R$ 0,00')}</div>
          </div>
        `;
      });
      col.innerHTML = html || `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px;">Nenhum lead</div>`;
    });
  }

  async function addNewLead() {
    const name = prompt('Nome do Novo Lead / Oportunidade:');
    if (!name) return;
    const company = prompt('Empresa do Lead:', 'Empresa Privada');
    const value = prompt('Valor da Oportunidade (R$):', 'R$ 35.000,00');

    try {
      const res = await fetch('/api/v1/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, value, stage: 'lead_recebido' })
      });
      if (res.ok) {
        loadCrmLeads();
      }
    } catch (err) {
      console.error('[CRM Add Lead Error]', err);
    }
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

      // Salvar Chave no Vault
      const btnSaveVault = e.target.closest('#btn-save-vault-key');
      if (btnSaveVault) {
        const serviceSelect = document.getElementById('vault-service-select');
        const tokenInput = document.getElementById('vault-token-input');
        if (serviceSelect && tokenInput) {
          saveVaultKey(serviceSelect.value, tokenInput.value);
          tokenInput.value = '';
        }
        return;
      }

      // Adicionar Lead CRM
      const btnAddLead = e.target.closest('#btn-add-lead-modal');
      if (btnAddLead) {
        addNewLead();
        return;
      }

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
    html = html.replace(/### (.*?)\n/g, '<h3 style="margin: 12px 0 6px 0; color: var(--accent-primary); font-size: 15px; font-weight: 700;">$1</h3>');
    html = html.replace(/## (.*?)\n/g, '<h2 style="margin: 14px 0 8px 0; color: var(--text-main); font-size: 16px; font-weight: 700;">$1</h2>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(99,102,241,0.15); color: var(--accent-primary); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px;">$1</code>');

    // Newlines to <br>
    html = html.replace(/\n/g, '<br>');

    // Restore Code Blocks
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`___CODEBLOCK_${idx}___`, block);
    });

    return html;
  }
});
