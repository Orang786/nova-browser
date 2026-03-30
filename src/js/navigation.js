// ============================================
// НАВИГАЦИЯ + УМНЫЕ ПОДСКАЗКИ
// ============================================

class Navigation {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.suggestionsEl = document.getElementById('url-suggestions');
    this.selectedIndex = -1;
    this.suggestions = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    const urlInput = document.getElementById('url-input');
    const btnBack = document.getElementById('btn-back');
    const btnForward = document.getElementById('btn-forward');
    const btnReload = document.getElementById('btn-reload');
    const btnHome = document.getElementById('btn-home');

    // URL input — Enter
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selected = this.suggestions[this.selectedIndex];
        if (selected) {
          this.tabManager.navigate(selected.url);
        } else {
          const url = urlInput.value.trim();
          if (url) this.tabManager.navigate(url);
        }
        urlInput.blur();
        this.hideSuggestions();
      }
      if (e.key === 'Escape') {
        const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
        if (tab) urlInput.value = tab.url;
        urlInput.blur();
        this.hideSuggestions();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
        this.updateSelection();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
      }
    });

    // Ввод — показать подсказки
    urlInput.addEventListener('input', Utils.debounce(() => {
      this.showSuggestions(urlInput.value.trim());
    }, 200));

    // Фокус
    urlInput.addEventListener('focus', () => {
      setTimeout(() => urlInput.select(), 50);
      if (urlInput.value.trim()) {
        this.showSuggestions(urlInput.value.trim());
      }
    });

    // Потеря фокуса
    urlInput.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions(), 200);
    });

    // Навигация
    btnBack.addEventListener('click', () => this.tabManager.goBack());
    btnForward.addEventListener('click', () => this.tabManager.goForward());
    btnReload.addEventListener('click', () => {
      const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
      if (tab?.isLoading) this.tabManager.stop();
      else this.tabManager.reload();
    });
    btnHome.addEventListener('click', () => this.tabManager.navigate('nova://newtab'));
  }

  async showSuggestions(query) {
    if (!query || query.length < 1) {
      this.hideSuggestions();
      return;
    }

    const q = query.toLowerCase();
    this.suggestions = [];

    // Из истории
    try {
      const history = await window.electronAPI.historySearch(q);
      history.slice(0, 5).forEach(h => {
        this.suggestions.push({
          type: 'history',
          icon: '🕐',
          title: h.title || h.url,
          url: h.url,
          favicon: h.url
        });
      });
    } catch(e) {}

    // Из закладок
    try {
      const bookmarks = await window.electronAPI.bookmarksGet();
      bookmarks.filter(b =>
        b.title?.toLowerCase().includes(q) || b.url?.toLowerCase().includes(q)
      ).slice(0, 3).forEach(b => {
        if (!this.suggestions.find(s => s.url === b.url)) {
          this.suggestions.push({
            type: 'bookmark',
            icon: '⭐',
            title: b.title || b.url,
            url: b.url,
            favicon: b.url
          });
        }
      });
    } catch(e) {}

    // Из открытых вкладок
    this.tabManager.tabs.forEach(tab => {
      if (tab.title?.toLowerCase().includes(q) || tab.url?.toLowerCase().includes(q)) {
        if (!this.suggestions.find(s => s.url === tab.url)) {
          this.suggestions.push({
            type: 'tab',
            icon: '📑',
            title: tab.title || tab.url,
            url: tab.url,
            tabId: tab.id,
            favicon: tab.url
          });
        }
      }
    });

    // Поиск Google
    this.suggestions.push({
      type: 'search',
      icon: '🔍',
      title: `Искать "${query}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
    });

    // Убрать дубликаты
    const seen = new Set();
    this.suggestions = this.suggestions.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    }).slice(0, 10);

    this.selectedIndex = -1;
    this.renderSuggestions();
  }

  renderSuggestions() {
    if (this.suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestionsEl.innerHTML = this.suggestions.map((s, i) => {
      const faviconUrl = s.favicon ? Utils.getFaviconUrl(s.favicon) : '';
      return `
        <div class="suggestion-item ${i === this.selectedIndex ? 'selected' : ''}" data-index="${i}">
          <div class="suggestion-icon">
            ${faviconUrl ? `<img src="${faviconUrl}" onerror="this.parentElement.textContent='${s.icon}'">` : s.icon}
          </div>
          <div class="suggestion-info">
            <div class="suggestion-title">${this.escapeHtml(s.title)}</div>
            ${s.type !== 'search' ? `<div class="suggestion-url">${this.escapeHtml(s.url)}</div>` : ''}
          </div>
          <span class="suggestion-type">${
            s.type === 'history' ? 'История' :
            s.type === 'bookmark' ? 'Закладка' :
            s.type === 'tab' ? 'Вкладка' : 'Поиск'
          }</span>
        </div>
      `;
    }).join('');

    this.suggestionsEl.classList.add('visible');

    // Клик по подсказке
    this.suggestionsEl.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const index = parseInt(el.dataset.index);
        const s = this.suggestions[index];
        if (s.tabId) {
          this.tabManager.activateTab(s.tabId);
        } else {
          this.tabManager.navigate(s.url);
        }
        this.hideSuggestions();
      });
    });
  }

  updateSelection() {
    this.suggestionsEl.querySelectorAll('.suggestion-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
    const selected = this.suggestionsEl.querySelector('.suggestion-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  hideSuggestions() {
    this.suggestionsEl.classList.remove('visible');
    this.suggestions = [];
    this.selectedIndex = -1;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}