// ============================================
// AI CHAT SIDEBAR
// ============================================

class AIChatPanel {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.messages = [];
    this.isOpen = false;
  }

  toggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const searchContainer = document.getElementById('sidebar-search');

    if (this.isOpen && sidebarTitle.textContent === '🤖 AI Ассистент') {
      sidebar.classList.add('hidden');
      this.isOpen = false;
      return;
    }

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = '🤖 AI Ассистент';
    searchContainer.style.display = 'none';
    this.isOpen = true;

    this.render(sidebarContent);
  }

  render(container) {
    container.innerHTML = `
      <div class="ai-chat-container">
        <div class="ai-chat-messages" id="ai-messages">
          ${this.messages.length === 0 ? `
            <div class="ai-welcome">
              <div style="font-size:48px; margin-bottom:12px;">🤖</div>
              <h3 style="margin-bottom:8px;">Nova AI</h3>
              <p style="color:var(--text-muted); font-size:13px; line-height:1.5;">
                Привет! Я AI-ассистент Nova Browser.<br>
                Задайте мне вопрос или выберите действие:
              </p>
              <div class="ai-suggestions">
                <button class="ai-suggestion" data-msg="Расскажи о текущей странице">📄 О странице</button>
                <button class="ai-suggestion" data-msg="Переведи страницу на русский">🌐 Перевести</button>
                <button class="ai-suggestion" data-msg="Сделай краткое содержание">📝 Резюме</button>
                <button class="ai-suggestion" data-msg="Найди похожие сайты">🔍 Похожие</button>
              </div>
            </div>
          ` : this.messages.map(m => `
            <div class="ai-message ai-message-${m.role}">
              <div class="ai-message-avatar">${m.role === 'user' ? '👤' : '🤖'}</div>
              <div class="ai-message-content">${this.formatMessage(m.content)}</div>
            </div>
          `).join('')}
        </div>
        <div class="ai-chat-input-container">
          <textarea class="ai-chat-input" id="ai-input" 
                    placeholder="Спросите что-нибудь..." rows="1"></textarea>
          <button class="ai-send-btn" id="ai-send">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2 8l5-5v3h5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H7v3L2 8z" 
                    fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    const input = container.querySelector('#ai-input');
    const sendBtn = container.querySelector('#ai-send');
    const messagesDiv = container.querySelector('#ai-messages');

    // Отправка сообщения
    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      this.messages.push({ role: 'user', content: text });
      input.value = '';

      this.render(container);

      // Имитация AI ответа (в реальности — API запрос)
      setTimeout(() => {
        const response = this.generateResponse(text);
        this.messages.push({ role: 'assistant', content: response });
        this.render(container);

        // Scroll to bottom
        const msgs = container.querySelector('#ai-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
      }, 800 + Math.random() * 1200);
    };

    sendBtn?.addEventListener('click', sendMessage);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Suggestions
    container.querySelectorAll('.ai-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        input.value = btn.dataset.msg;
        sendMessage();
      });
    });

    // Scroll to bottom
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  generateResponse(question) {
    const q = question.toLowerCase();
    const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
    const currentUrl = tab?.url || '';
    const currentTitle = tab?.title || '';

    if (q.includes('страниц') || q.includes('page')) {
      return `📄 **Текущая страница:**\n\n` +
             `**Заголовок:** ${currentTitle}\n` +
             `**URL:** ${currentUrl}\n` +
             `**Домен:** ${Utils.getDomain(currentUrl)}\n` +
             `**Протокол:** ${currentUrl.startsWith('https') ? '🔒 Безопасный (HTTPS)' : '⚠️ Небезопасный'}`;
    }

    if (q.includes('перевед') || q.includes('translat')) {
      return `🌐 Для перевода страницы могу предложить:\n\n` +
             `1. Откройте через Google Translate:\n` +
             `\`translate.google.com/translate?u=${encodeURIComponent(currentUrl)}\`\n\n` +
             `2. Или используйте расширение-переводчик`;
    }

    if (q.includes('резюме') || q.includes('содержан') || q.includes('summar')) {
      return `📝 **Анализ страницы "${currentTitle}"**\n\n` +
             `Это страница на сайте **${Utils.getDomain(currentUrl)}**.\n\n` +
             `Для полноценного анализа содержимого подключите API (OpenAI, Claude и др.) ` +
             `в настройках браузера.\n\n` +
             `_Совет: Ctrl+Shift+P → "Настройки" → "AI"_`;
    }

    if (q.includes('похож') || q.includes('similar')) {
      const domain = Utils.getDomain(currentUrl);
      return `🔍 **Похожие на ${domain}:**\n\n` +
             `Поищите аналоги на:\n` +
             `• [alternativeto.net](https://alternativeto.net)\n` +
             `• [similarweb.com](https://similarweb.com)\n` +
             `• Google: "sites like ${domain}"`;
    }

    if (q.includes('привет') || q.includes('hello') || q.includes('hi')) {
      return `👋 Привет! Я Nova AI — ваш браузерный ассистент.\n\n` +
             `Я могу помочь с:\n` +
             `• 📄 Информация о текущей странице\n` +
             `• 🌐 Перевод страниц\n` +
             `• 📝 Анализ контента\n` +
             `• 🔍 Поиск похожих сайтов\n` +
             `• ⚙️ Настройки браузера\n\n` +
             `Просто спросите!`;
    }

    if (q.includes('настройк') || q.includes('setting')) {
      return `⚙️ **Быстрые настройки:**\n\n` +
             `• Ctrl+Shift+P — панель команд\n` +
             `• Тема: тёмная/светлая\n` +
             `• Ctrl+D — добавить закладку\n` +
             `• Ctrl+H — история\n\n` +
             `Для всех настроек: Меню → Настройки`;
    }

    // Дефолтный ответ
    const responses = [
      `🤔 Интересный вопрос! К сожалению, для полноценных AI-ответов нужно подключить API ключ в настройках.\n\n` +
      `Могу помочь с:\n• Информацией о странице\n• Переводом\n• Навигацией\n• Настройками браузера`,

      `💡 Чтобы я мог отвечать на сложные вопросы, подключите OpenAI API в настройках.\n\n` +
      `А пока попробуйте:\n• "Расскажи о странице"\n• "Переведи"\n• "Настройки"`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ');
  }
}