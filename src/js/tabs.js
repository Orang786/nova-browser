// ============================================
// УПРАВЛЕНИЕ ВКЛАДКАМИ
// ============================================

class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabsContainer = document.getElementById('tabs-container');
    this.webviewContainer = document.getElementById('webview-container');
    this.urlInput = document.getElementById('url-input');
  }

  async init() {
    // Создать первую вкладку
    const newtabPath = await window.electronAPI.getNewtabPath();
    this.createTab(newtabPath, 'Новая вкладка');
  }

  // Создать вкладку
  createTab(url = null, title = 'Новая вкладка') {
    const tabId = Utils.generateId();

    const tab = {
      id: tabId,
      title: title,
      url: url || '',
      favicon: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false
    };

    this.tabs.push(tab);

    // Создать DOM элемент вкладки
    this.renderTab(tab);

    // Создать webview
    this.createWebview(tab, url);

    // Активировать вкладку
    this.activateTab(tabId);

    return tabId;
  }

  // Рендер DOM вкладки (с Drag & Drop)
  renderTab(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.tabId = tab.id;
    tabEl.draggable = true;

    tabEl.innerHTML = `
      <div class="tab-spinner" style="display:none;"></div>
      <div class="tab-favicon-placeholder">
        <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.3"/></svg>
      </div>
      <span class="tab-title">${this.escapeHtml(tab.title)}</span>
      <div class="tab-audio" title="Звук">🔊</div>
      <button class="tab-close" title="Закрыть вкладку">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    // Клик по вкладке
    tabEl.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close')) {
        this.activateTab(tab.id);
      }
    });

    // Средняя кнопка мыши — закрыть
    tabEl.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.closeTab(tab.id);
      }
    });

    // Закрытие вкладки
    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tab.id);
    });

    // ===== DRAG & DROP =====
    tabEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', tab.id);
      tabEl.classList.add('dragging');
      setTimeout(() => tabEl.style.opacity = '0.4', 0);
    });

    tabEl.addEventListener('dragend', () => {
      tabEl.classList.remove('dragging');
      tabEl.style.opacity = '';
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('drag-over-left', 'drag-over-right');
      });
    });

    tabEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = tabEl.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      tabEl.classList.remove('drag-over-left', 'drag-over-right');
      if (e.clientX < midX) {
        tabEl.classList.add('drag-over-left');
      } else {
        tabEl.classList.add('drag-over-right');
      }
    });

    tabEl.addEventListener('dragleave', () => {
      tabEl.classList.remove('drag-over-left', 'drag-over-right');
    });

    tabEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const draggedTabId = e.dataTransfer.getData('text/plain');
      if (draggedTabId === tab.id) return;

      const rect = tabEl.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const insertBefore = e.clientX < midX;

      this.reorderTab(draggedTabId, tab.id, insertBefore);

      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('drag-over-left', 'drag-over-right');
      });
    });

        // ===== TAB PREVIEW =====
    let previewTimeout;
    let previewEl;

    tabEl.addEventListener('mouseenter', () => {
      if (tab.id === this.activeTabId) return;

      previewTimeout = setTimeout(async () => {
        const wv = document.querySelector(`webview[data-tab-id="${tab.id}"]`);
        let imgSrc = '';

        if (wv) {
          try {
            const image = await wv.capturePage();
            imgSrc = image.toDataURL();
          } catch(e) {}
        }

        previewEl = document.createElement('div');
        previewEl.className = 'tab-preview';
        previewEl.innerHTML = `
          <div class="tab-preview-image">
            ${imgSrc ? `<img src="${imgSrc}">` : '<span style="color:var(--text-muted)">📄</span>'}
          </div>
          <div class="tab-preview-info">
            <div class="tab-preview-title">${this.escapeHtml(tab.title || 'Новая вкладка')}</div>
            <div class="tab-preview-url">${tab.url || ''}</div>
          </div>
        `;
        tabEl.style.position = 'relative';
        tabEl.appendChild(previewEl);
      }, 600);
    });

    tabEl.addEventListener('mouseleave', () => {
      clearTimeout(previewTimeout);
      if (previewEl) {
        previewEl.remove();
        previewEl = null;
      }
    });

    this.tabsContainer.appendChild(tabEl);
  }

  reorderTab(draggedId, targetId, before) {
    // Переставить в массиве
    const draggedIndex = this.tabs.findIndex(t => t.id === draggedId);
    const targetIndex = this.tabs.findIndex(t => t.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [dragged] = this.tabs.splice(draggedIndex, 1);
    const newIndex = this.tabs.findIndex(t => t.id === targetId);
    this.tabs.splice(before ? newIndex : newIndex + 1, 0, dragged);

    // Переставить DOM
    const draggedEl = document.querySelector(`.tab[data-tab-id="${draggedId}"]`);
    const targetEl = document.querySelector(`.tab[data-tab-id="${targetId}"]`);
    if (draggedEl && targetEl) {
      if (before) {
        this.tabsContainer.insertBefore(draggedEl, targetEl);
      } else {
        this.tabsContainer.insertBefore(draggedEl, targetEl.nextSibling);
      }
    }
  }

  // Создать webview
  createWebview(tab, url) {
    const webview = document.createElement('webview');
    webview.dataset.tabId = tab.id;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');

    if (url) {
      webview.src = url;
    }

    // События webview
    webview.addEventListener('did-start-loading', () => {
      this.setTabLoading(tab.id, true);
      if (tab.id === this.activeTabId) {
        this.showLoadingBar(true);
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      this.setTabLoading(tab.id, false);
      if (tab.id === this.activeTabId) {
        this.showLoadingBar(false);
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      this.updateTabTitle(tab.id, e.title);

      // Добавить в историю
      if (!webview.src.startsWith('file://') && !webview.src.startsWith('nova://')) {
        window.electronAPI.historyAdd({
          title: e.title,
          url: webview.src
        });
      }
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        this.updateTabFavicon(tab.id, e.favicons[0]);
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      if (tab.id === this.activeTabId) {
        this.urlInput.value = e.url;
        this.updateNavigationState(tab.id);
        this.updateSecurityIndicator(e.url);
        this.checkBookmarkState(e.url);
      }
      tab.url = e.url;
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
      if (tab.id === this.activeTabId && e.isMainFrame) {
        this.urlInput.value = e.url;
        this.updateNavigationState(tab.id);
      }
      tab.url = e.url;
    });

    webview.addEventListener('new-window', (e) => {
      this.createTab(e.url);
    });

    webview.addEventListener('did-fail-load', (e) => {
      if (e.errorCode !== -3) { // Ignore user aborted
        console.log('Failed to load:', e.errorDescription);
      }
    });

    // Контекстное меню (правая кнопка мыши)
    webview.addEventListener('context-menu', (e) => {
      // Можно расширить
    });

    this.webviewContainer.appendChild(webview);
  }

  // Активировать вкладку
  activateTab(tabId) {
    this.activeTabId = tabId;
    const tab = this.tabs.find(t => t.id === tabId);

    // Обновить стили вкладок
    document.querySelectorAll('.tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tabId === tabId);
    });

    // Показать нужный webview
    document.querySelectorAll('#webview-container webview').forEach(wv => {
      wv.classList.toggle('active', wv.dataset.tabId === tabId);
    });

    // Обновить URL
    if (tab) {
      this.urlInput.value = tab.url || '';
      this.updateNavigationState(tabId);
      this.updateSecurityIndicator(tab.url);
      this.checkBookmarkState(tab.url);
    }

    // Скролл к вкладке
    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabEl) {
      tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  // Закрыть вкладку
  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    // Если это последняя вкладка — закрыть окно
    if (this.tabs.length === 1) {
      window.electronAPI.windowClose();
      return;
    }

    // Удалить DOM
    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (tabEl) tabEl.remove();
    if (webview) webview.remove();

    // Удалить из массива
    this.tabs.splice(index, 1);

    // Если закрыли активную вкладку
    if (this.activeTabId === tabId) {
      const newIndex = Math.min(index, this.tabs.length - 1);
      this.activateTab(this.tabs[newIndex].id);
    }
  }

  // Обновить заголовок вкладки
  updateTabTitle(tabId, title) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) tab.title = title;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-title`);
    if (tabEl) tabEl.textContent = title;
  }

  // Обновить favicon вкладки
  updateTabFavicon(tabId, faviconUrl) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) tab.favicon = faviconUrl;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (!tabEl) return;

    const placeholder = tabEl.querySelector('.tab-favicon-placeholder');
    if (placeholder) {
      const img = document.createElement('img');
      img.className = 'tab-favicon';
      img.src = faviconUrl;
      img.onerror = () => img.style.display = 'none';
      placeholder.replaceWith(img);
    }
  }

  // Установить состояние загрузки
  setTabLoading(tabId, isLoading) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) tab.isLoading = isLoading;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (!tabEl) return;

    const spinner = tabEl.querySelector('.tab-spinner');
    const favicon = tabEl.querySelector('.tab-favicon, .tab-favicon-placeholder');

    if (spinner && favicon) {
      spinner.style.display = isLoading ? 'block' : 'none';
      favicon.style.display = isLoading ? 'none' : '';
    }
  }

  // Навигация
  getActiveWebview() {
    return document.querySelector(`webview[data-tab-id="${this.activeTabId}"]`);
  }

  goBack() {
    const wv = this.getActiveWebview();
    if (wv && wv.canGoBack()) wv.goBack();
  }

  goForward() {
    const wv = this.getActiveWebview();
    if (wv && wv.canGoForward()) wv.goForward();
  }

  reload() {
    const wv = this.getActiveWebview();
    if (wv) wv.reload();
  }

  stop() {
    const wv = this.getActiveWebview();
    if (wv) wv.stop();
  }

  async navigate(url) {
    const wv = this.getActiveWebview();
    if (!wv) return;

    // Обработка внутренних URL
    if (url === 'nova://newtab') {
      url = await window.electronAPI.getNewtabPath();
    } else if (url === 'nova://settings') {
      url = await window.electronAPI.getSettingsPath();
    } else if (url === 'nova://history') {
      url = await window.electronAPI.getHistoryPath();
    } else {
      url = Utils.formatUrl(url);
    }

    wv.src = url;
    this.urlInput.value = url;
  }

  // Обновить состояние навигационных кнопок
  updateNavigationState(tabId) {
    const wv = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (!wv) return;

    // Небольшая задержка для правильного определения
    setTimeout(() => {
      document.getElementById('btn-back').disabled = !wv.canGoBack();
      document.getElementById('btn-forward').disabled = !wv.canGoForward();
    }, 100);
  }

  // Обновить индикатор безопасности
  updateSecurityIndicator(url) {
    const indicator = document.getElementById('security-indicator');
    const level = Utils.getSecurityLevel(url);

    indicator.className = `security-${level}`;
    indicator.title = level === 'secure' ? 'Безопасное соединение' :
                      level === 'insecure' ? 'Небезопасное соединение' :
                      'Информация о безопасности';
  }

  // Проверить закладку
  async checkBookmarkState(url) {
    const btn = document.getElementById('btn-bookmark');
    const isBookmarked = await window.electronAPI.bookmarksIsBookmarked(url);
    btn.classList.toggle('bookmarked', isBookmarked);
  }

  // Loading bar
  showLoadingBar(show) {
    const bar = document.getElementById('loading-bar');
    const progress = document.getElementById('loading-progress');

    if (show) {
      bar.classList.remove('hidden');
      progress.style.width = '30%';

      setTimeout(() => progress.style.width = '60%', 300);
      setTimeout(() => progress.style.width = '80%', 800);
    } else {
      progress.style.width = '100%';
      setTimeout(() => {
        bar.classList.add('hidden');
        progress.style.width = '0%';
      }, 300);
    }
  }

  // Следующая вкладка
  nextTab() {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.activateTab(this.tabs[nextIndex].id);
  }

  // Предыдущая вкладка
  prevTab() {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    this.activateTab(this.tabs[prevIndex].id);
  }

  // DevTools
  openDevTools() {
    const wv = this.getActiveWebview();
    if (wv) {
      if (wv.isDevToolsOpened()) {
        wv.closeDevTools();
      } else {
        wv.openDevTools();
      }
    }
  }

  // Масштаб
  zoomIn() {
    const wv = this.getActiveWebview();
    if (wv) {
      const level = wv.getZoomLevel();
      wv.setZoomLevel(Math.min(level + 0.5, 5));
    }
  }

  zoomOut() {
    const wv = this.getActiveWebview();
    if (wv) {
      const level = wv.getZoomLevel();
      wv.setZoomLevel(Math.max(level - 0.5, -5));
    }
  }

  zoomReset() {
    const wv = this.getActiveWebview();
    if (wv) wv.setZoomLevel(0);
  }

  // Найти на странице
  findInPage(text) {
    const wv = this.getActiveWebview();
    if (wv && text) {
      wv.findInPage(text);
    }
  }

  stopFindInPage() {
    const wv = this.getActiveWebview();
    if (wv) {
      wv.stopFindInPage('clearSelection');
    }
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

    // Группы вкладок
  setTabGroup(tabId, groupName, color) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.group = groupName;
    tab.groupColor = color;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (!tabEl) return;

    // Удалить старые группы
    tabEl.className = tabEl.className.replace(/tab-group-\w+/g, '').trim();

    if (color) {
      tabEl.classList.add(`tab-group-${color}`);

      // Добавить индикатор если нет
      if (!tabEl.querySelector('.tab-group-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'tab-group-indicator';
        tabEl.insertBefore(indicator, tabEl.firstChild);
      }
    }
  }

  removeTabGroup(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      delete tab.group;
      delete tab.groupColor;
    }

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabEl) {
      tabEl.className = tabEl.className.replace(/tab-group-\w+/g, '').trim();
      const indicator = tabEl.querySelector('.tab-group-indicator');
      if (indicator) indicator.remove();
    }
  }

    // Закрепить/открепить вкладку
  pinTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.pinned = !tab.pinned;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabEl) {
      tabEl.classList.toggle('pinned', tab.pinned);

      // Переместить закреплённые в начало
      if (tab.pinned) {
        const firstUnpinned = this.tabsContainer.querySelector('.tab:not(.pinned)');
        if (firstUnpinned) {
          this.tabsContainer.insertBefore(tabEl, firstUnpinned);
        }
      }
    }

    // Пересортировать массив
    this.tabs.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }

  // Мут вкладки
  muteTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.muted = !tab.muted;
    const wv = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (wv) {
      wv.setAudioMuted(tab.muted);
    }

    const audioIcon = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-audio`);
    if (audioIcon) {
      audioIcon.textContent = tab.muted ? '🔇' : '🔊';
      audioIcon.title = tab.muted ? 'Включить звук' : 'Выключить звук';
    }
  }

  // Копировать все URL
  copyAllUrls() {
    const urls = this.tabs.map(t => t.url).filter(u => u && !u.startsWith('file://')).join('\n');
    navigator.clipboard.writeText(urls);
    Utils.showNotification(`📋 Скопировано ${this.tabs.length} ссылок`, 2000, 'success');
  }
}