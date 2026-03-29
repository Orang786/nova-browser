// ============================================
// ГЛАВНЫЙ РЕНДЕР — ИНИЦИАЛИЗАЦИЯ
// ============================================

let tabManager;
let navigation;
let bookmarksManager;
let historyManager;
let downloadsManager;
let settingsManager;
let passwordsUI;
let aiChat;
let readingMode;
let splitView;
let extensionsUI;

document.addEventListener('DOMContentLoaded', async () => {
  // Инициализация менеджеров
  tabManager = new TabManager();
  navigation = new Navigation(tabManager);
  bookmarksManager = new BookmarksManager(tabManager);
  historyManager = new HistoryManager(tabManager);
  downloadsManager = new DownloadsManager();
  settingsManager = new SettingsManager(tabManager);
  passwordsUI = new PasswordsUI(tabManager);
  aiChat = new AIChatPanel(tabManager);
  readingMode = new ReadingMode(tabManager);
  splitView = new SplitView(tabManager);

  // Автообновление
  updaterUI = new UpdaterUI();
  extensionsUI = new ExtensionsUI(tabManager);

  // Первая вкладка
  await tabManager.init();
  await settingsManager.init();
  await bookmarksManager.updateBookmarksBar();

  // Настроить UI
  setupWindowControls();
  setupMenu();
  setupSidebar();
  setupFindInPage();
  setupShortcuts();
  setupNewTab();
  setupNotifications();
  setupExternalLinks();
  setupContextMenu();
  setupCommandPalette();
  setupVerticalTabs();

  console.log('🚀 Nova Browser v1.0.0 initialized with all features!');
});

// ============================================
// ТЕМА
// ============================================

async function loadTheme() {
  const theme = await window.electronAPI.settingsGet('theme', 'dark');
  document.documentElement.setAttribute('data-theme', theme);
}

// ============================================
// УПРАВЛЕНИЕ ОКНОМ
// ============================================

function setupWindowControls() {
  document.getElementById('btn-minimize').addEventListener('click', () => {
    window.electronAPI.windowMinimize();
  });

  document.getElementById('btn-maximize').addEventListener('click', () => {
    window.electronAPI.windowMaximize();
  });

  document.getElementById('btn-close').addEventListener('click', () => {
    window.electronAPI.windowClose();
  });
}

// ============================================
// НОВАЯ ВКЛАДКА
// ============================================

function setupNewTab() {
  document.getElementById('btn-new-tab').addEventListener('click', async () => {
    const newtabPath = await window.electronAPI.getNewtabPath();
    tabManager.createTab(newtabPath, 'Новая вкладка');
  });
}

// ============================================
// МЕНЮ
// ============================================

function setupMenu() {
  const btnMenu = document.getElementById('btn-menu');
  const menu = document.getElementById('dropdown-menu');

  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');

    // Закрыть другие панели
    document.getElementById('downloads-panel').classList.add('hidden');
  });

  // Закрыть при клике вне
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btnMenu) {
      menu.classList.add('hidden');
    }
    const downloadsPanel = document.getElementById('downloads-panel');
    const btnDownloads = document.getElementById('btn-downloads');
    if (!downloadsPanel.contains(e.target) && e.target !== btnDownloads) {
      downloadsPanel.classList.add('hidden');
    }
  });

  // Действия меню
  menu.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      menu.classList.add('hidden');

      switch (action) {
        case 'new-tab':
          const newtabPath = await window.electronAPI.getNewtabPath();
          tabManager.createTab(newtabPath, 'Новая вкладка');
          break;
        case 'incognito':
          window.electronAPI.openIncognito();
          break;
        case 'zoom-in':
          tabManager.zoomIn();
          break;
        case 'zoom-out':
          tabManager.zoomOut();
          break;
        case 'zoom-reset':
          tabManager.zoomReset();
          break;
        case 'fullscreen':
          // F11
          break;
        case 'devtools':
          tabManager.openDevTools();
          break;
        case 'toggle-bookmarks-bar':
          toggleBookmarksBar();
          break;
        case 'clear-data':
          await clearBrowsingData();
          break;
        case 'settings':
          const settingsPath = await window.electronAPI.getSettingsPath();
          tabManager.createTab(settingsPath, 'Настройки');
          break;
        case 'about':
          Utils.showNotification('Nova Browser v1.0.0 — Создан на Electron 🚀', 5000, 'info');
          break;
        case 'passwords':
          passwordsUI.showInSidebar();
          break;
        case 'ai-chat':
          aiChat.toggle();
          break;
        case 'reading-mode':
          readingMode.toggle();
          break;
        case 'split-view':
          splitView.toggle();
          break;
        case 'vertical-tabs':
          if (window._toggleVerticalTabs) {
            window._toggleVerticalTabs();
          }
          break;
        case 'screenshot':
          const res = await window.electronAPI.captureScreenshot({ saveToFile: true });
          if (res && res.saved) {
            Utils.showNotification('📸 Скриншот сохранён', 2000, 'success');
          }
          break;
        case 'extensions':
          extensionsUI.showInSidebar();
          break;
      }
    });
  });
}

function toggleBookmarksBar() {
  const bar = document.getElementById('bookmarks-bar');
  const isHidden = bar.classList.toggle('hidden');
  window.electronAPI.settingsSet('bookmarksBarVisible', !isHidden);
}

async function clearBrowsingData() {
  if (confirm('Очистить все данные просмотра (историю, закладки)?')) {
    await window.electronAPI.historyClear();
    Utils.showNotification('Данные просмотра очищены 🗑️');
  }
}

// ============================================
// САЙДБАР
// ============================================

function setupSidebar() {
  const btnToggle = document.getElementById('btn-sidebar-toggle');
  const btnClose = document.getElementById('btn-sidebar-close');
  const sidebar = document.getElementById('sidebar');

  btnToggle.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
    btnToggle.classList.toggle('active');
  });

  btnClose.addEventListener('click', () => {
    sidebar.classList.add('hidden');
    btnToggle.classList.remove('active');
  });
}

// ============================================
// ПОИСК НА СТРАНИЦЕ
// ============================================

function setupFindInPage() {
  const findBar = document.getElementById('find-bar');
  const findInput = document.getElementById('find-input');
  const findNext = document.getElementById('find-next');
  const findPrev = document.getElementById('find-prev');
  const findClose = document.getElementById('find-close');
  const findCount = document.getElementById('find-count');

  // Ctrl+F
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      findBar.classList.remove('hidden');
      findInput.focus();
    }
    if (e.key === 'Escape') {
      findBar.classList.add('hidden');
      tabManager.stopFindInPage();
    }
  });

  findInput.addEventListener('input', Utils.debounce(() => {
    const text = findInput.value;
    if (text) {
      tabManager.findInPage(text);
    } else {
      tabManager.stopFindInPage();
      findCount.textContent = '0/0';
    }
  }, 200));

  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        tabManager.findInPage(findInput.value);
      } else {
        tabManager.findInPage(findInput.value);
      }
    }
  });

  findNext.addEventListener('click', () => tabManager.findInPage(findInput.value));
  findPrev.addEventListener('click', () => tabManager.findInPage(findInput.value));
  findClose.addEventListener('click', () => {
    findBar.classList.add('hidden');
    tabManager.stopFindInPage();
  });

  // Обновить счётчик
  const observer = new MutationObserver(() => {
    const wv = tabManager.getActiveWebview();
    if (wv) {
      wv.addEventListener('found-in-page', (e) => {
        if (e.result) {
          findCount.textContent = `${e.result.activeMatchOrdinal}/${e.result.matches}`;
        }
      });
    }
  });
}

// ============================================
// ГОРЯЧИЕ КЛАВИШИ
// ============================================

function setupShortcuts() {
  window.electronAPI.onShortcut(async (action) => {
    switch (action) {
      case 'new-tab':
        const newtabPath = await window.electronAPI.getNewtabPath();
        tabManager.createTab(newtabPath, 'Новая вкладка');
        break;
      case 'close-tab':
        tabManager.closeTab(tabManager.activeTabId);
        break;
      case 'next-tab':
        tabManager.nextTab();
        break;
      case 'focus-url':
        document.getElementById('url-input').focus();
        break;
      case 'reload':
        tabManager.reload();
        break;
      case 'devtools':
        tabManager.openDevTools();
        break;
      case 'history':
        historyManager.showInSidebar();
        break;
      case 'bookmark':
        bookmarksManager.toggleBookmark();
        break;
      case 'clear-data':
        await clearBrowsingData();
        break;
    }
  });
}

// ============================================
// УВЕДОМЛЕНИЯ
// ============================================

function setupNotifications() {
  document.getElementById('notification-close').addEventListener('click', () => {
    document.getElementById('notification').classList.add('hidden');
  });
}

// ============================================
// ВНЕШНИЕ ССЫЛКИ
// ============================================

function setupExternalLinks() {
  window.electronAPI.onOpenUrlInNewTab((url) => {
    tabManager.createTab(url);
  });
}

// ============================================
// КОНТЕКСТНОЕ МЕНЮ
// ============================================

function setupContextMenu() {
  const ctxMenu = document.getElementById('context-menu');

  // Правая кнопка мыши на webview-container
  document.getElementById('webview-container').addEventListener('contextmenu', (e) => {
    e.preventDefault();

    // Позиция меню
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 350);

    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top = y + 'px';
    ctxMenu.classList.remove('hidden');
  });

  // Закрыть при клике в другом месте
  document.addEventListener('click', (e) => {
    if (!ctxMenu.contains(e.target)) {
      ctxMenu.classList.add('hidden');
    }
  });

  // Закрыть при скролле
  document.addEventListener('scroll', () => {
    ctxMenu.classList.add('hidden');
  });

  // Обработчики действий
  ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      ctxMenu.classList.add('hidden');

      switch (action) {
        case 'ctx-back':
          tabManager.goBack();
          break;
        case 'ctx-forward':
          tabManager.goForward();
          break;
        case 'ctx-reload':
          tabManager.reload();
          break;
        case 'ctx-screenshot':
          const result = await window.electronAPI.captureScreenshot({ saveToFile: true });
          if (result?.saved) {
            Utils.showNotification(`📸 Скриншот сохранён`);
          }
          break;
        case 'ctx-copy-url':
          const tab = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
          if (tab?.url) {
            navigator.clipboard.writeText(tab.url);
            Utils.showNotification('📋 URL скопирован');
          }
          break;
        case 'ctx-bookmark':
          bookmarksManager.toggleBookmark();
          break;
        case 'ctx-view-source':
          const activeTab = tabManager.tabs.find(t => t.id === tabManager.activeTabId);
          if (activeTab?.url) {
            tabManager.createTab('view-source:' + activeTab.url, 'Исходный код');
          }
          break;
        case 'ctx-devtools':
          tabManager.openDevTools();
          break;
        case 'ctx-incognito':
          window.electronAPI.openIncognito();
          break;
      }
    });
  });
}

// ============================================
// COMMAND PALETTE (Ctrl+Shift+P)
// ============================================

function setupCommandPalette() {
  const overlay = document.getElementById('command-overlay');
  const input = document.getElementById('command-input');
  const results = document.getElementById('command-results');
  let selectedIndex = 0;

  const commands = [
    { icon: '➕', title: 'Новая вкладка', shortcut: 'Ctrl+T', action: async () => { const p = await window.electronAPI.getNewtabPath(); tabManager.createTab(p, 'Новая вкладка'); }},
    { icon: '🕶️', title: 'Новое окно инкогнито', shortcut: 'Ctrl+Shift+N', action: () => window.electronAPI.openIncognito() },
    { icon: '✕', title: 'Закрыть вкладку', shortcut: 'Ctrl+W', action: () => tabManager.closeTab(tabManager.activeTabId) },
    { icon: '↻', title: 'Обновить страницу', shortcut: 'F5', action: () => tabManager.reload() },
    { icon: '📸', title: 'Сделать скриншот', shortcut: 'Ctrl+Shift+S', action: () => window.electronAPI.captureScreenshot({ saveToFile: true }) },
    { icon: '⭐', title: 'Добавить в закладки', shortcut: 'Ctrl+D', action: () => bookmarksManager.toggleBookmark() },
    { icon: '📑', title: 'Показать закладки', action: () => bookmarksManager.showInSidebar() },
    { icon: '🕐', title: 'Показать историю', shortcut: 'Ctrl+H', action: () => historyManager.showInSidebar() },
    { icon: '📥', title: 'Загрузки', action: () => downloadsManager.togglePanel() },
    { icon: '🔍', title: 'Найти на странице', shortcut: 'Ctrl+F', action: () => { document.getElementById('find-bar').classList.remove('hidden'); document.getElementById('find-input').focus(); }},
    { icon: '🔧', title: 'Инструменты разработчика', shortcut: 'Ctrl+Shift+I', action: () => tabManager.openDevTools() },
    { icon: '➕', title: 'Увеличить масштаб', shortcut: 'Ctrl++', action: () => tabManager.zoomIn() },
    { icon: '➖', title: 'Уменьшить масштаб', shortcut: 'Ctrl+-', action: () => tabManager.zoomOut() },
    { icon: '↺', title: 'Сбросить масштаб', shortcut: 'Ctrl+0', action: () => tabManager.zoomReset() },
    { icon: '🌙', title: 'Тёмная тема', action: () => { settingsManager.setSetting('theme', 'dark'); }},
    { icon: '☀️', title: 'Светлая тема', action: () => { settingsManager.setSetting('theme', 'light'); }},
    { icon: '📑', title: 'Панель закладок вкл/выкл', action: () => toggleBookmarksBar() },
    { icon: '⚙️', title: 'Настройки', action: async () => { const p = await window.electronAPI.getSettingsPath(); tabManager.createTab(p, 'Настройки'); }},
    { icon: '🗑️', title: 'Очистить историю', action: () => clearBrowsingData() },
    { icon: 'ℹ️', title: 'О браузере', action: () => Utils.showNotification('Nova Browser v1.0.0 🚀', 3000, 'info') },
    { icon: '🧩', title: 'Расширения', action: () => extensionsUI.showInSidebar() },
  ];

  function show() {
    overlay.classList.remove('hidden');
    input.value = '';
    input.focus();
    selectedIndex = 0;
    renderResults(commands);
  }

  function hide() {
    overlay.classList.add('hidden');
    input.value = '';
  }

  function renderResults(items) {
    results.innerHTML = items.map((cmd, i) => `
      <div class="command-item ${i === selectedIndex ? 'selected' : ''}" data-index="${i}">
        <span class="command-item-icon">${cmd.icon}</span>
        <span class="command-item-title">${cmd.title}</span>
        ${cmd.shortcut ? `<span class="command-item-shortcut">${cmd.shortcut}</span>` : ''}
      </div>
    `).join('');

    results.querySelectorAll('.command-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        items[i].action();
        hide();
      });
      el.addEventListener('mouseenter', () => {
        selectedIndex = i;
        results.querySelectorAll('.command-item').forEach((e, j) => {
          e.classList.toggle('selected', j === i);
        });
      });
    });
  }

  // Фильтрация
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    const filtered = commands.filter(c => c.title.toLowerCase().includes(query));
    selectedIndex = 0;
    renderResults(filtered);
  });

  // Навигация стрелками
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.command-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('selected', i === selectedIndex));
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('selected', i === selectedIndex));
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }

    if (e.key === 'Enter') {
      const query = input.value.toLowerCase();
      const filtered = commands.filter(c => c.title.toLowerCase().includes(query));
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        hide();
      }
    }

    if (e.key === 'Escape') hide();
  });

  // Клик на overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  // Ctrl+Shift+P или Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key === 'P') || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      show();
    }
  });
}

// ============================================
// ВЕРТИКАЛЬНЫЕ ВКЛАДКИ
// ============================================

function setupVerticalTabs() {
  let isVerticalMode = false;
  const panel = document.getElementById('vertical-tabs-panel');
  const list = document.getElementById('vertical-tabs-list');
  const toggleBtn = document.getElementById('vtab-toggle-mode');
  const newBtn = document.getElementById('vtab-new-btn');
  const resizeHandle = document.getElementById('vertical-tabs-resize');

  function toggleVerticalMode() {
    isVerticalMode = !isVerticalMode;
    document.body.classList.toggle('vertical-tabs-mode', isVerticalMode);

    if (isVerticalMode) {
      updateVerticalTabs();
      Utils.showNotification('📌 Вертикальные вкладки включены', 2000, 'info');
    } else {
      Utils.showNotification('📑 Горизонтальные вкладки включены', 2000, 'info');
    }

    window.electronAPI.settingsSet('verticalTabs', isVerticalMode);
  }

  function updateVerticalTabs() {
    if (!isVerticalMode) return;

    list.innerHTML = tabManager.tabs.map(tab => {
      const faviconHtml = tab.favicon
        ? `<img class="vtab-favicon" src="${tab.favicon}" onerror="this.className='vtab-favicon-placeholder'">`
        : `<div class="vtab-favicon-placeholder"></div>`;

      const spinnerHtml = tab.isLoading
        ? `<div class="vtab-spinner"></div>`
        : '';

      return `
        <div class="vtab ${tab.id === tabManager.activeTabId ? 'active' : ''}"
             data-tab-id="${tab.id}">
          ${spinnerHtml || faviconHtml}
          <div class="vtab-info">
            <div class="vtab-title">${escapeHtml(tab.title || 'Новая вкладка')}</div>
            <div class="vtab-url">${Utils.getDomain(tab.url || '')}</div>
          </div>
          <button class="vtab-close" data-tab-id="${tab.id}">✕</button>
        </div>
      `;
    }).join('');

    // Клик по вкладке
    list.querySelectorAll('.vtab').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.vtab-close')) return;
        tabManager.activateTab(el.dataset.tabId);
        updateVerticalTabs();
      });
    });

    // Закрыть вкладку
    list.querySelectorAll('.vtab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        tabManager.closeTab(btn.dataset.tabId);
        setTimeout(updateVerticalTabs, 50);
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toggle
  toggleBtn.addEventListener('click', toggleVerticalMode);

  // Новая вкладка
  newBtn.addEventListener('click', async () => {
    const p = await window.electronAPI.getNewtabPath();
    tabManager.createTab(p, 'Новая вкладка');
    setTimeout(updateVerticalTabs, 100);
  });

  // Обновлять при изменении вкладок
  const origActivate = tabManager.activateTab.bind(tabManager);
  tabManager.activateTab = function(tabId) {
    origActivate(tabId);
    updateVerticalTabs();
  };

  const origClose = tabManager.closeTab.bind(tabManager);
  tabManager.closeTab = function(tabId) {
    origClose(tabId);
    setTimeout(updateVerticalTabs, 50);
  };

  const origUpdateTitle = tabManager.updateTabTitle.bind(tabManager);
  tabManager.updateTabTitle = function(tabId, title) {
    origUpdateTitle(tabId, title);
    updateVerticalTabs();
  };

  // Resize handle
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.max(180, Math.min(400, e.clientX));
    panel.style.width = newWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Добавить в меню
  window._toggleVerticalTabs = toggleVerticalMode;

  // Загрузить настройку
  window.electronAPI.settingsGet('verticalTabs', false).then(value => {
    if (value) toggleVerticalMode();
  });
}