// ============================================
// НАСТРОЙКИ (обновлённые)
// ============================================

class SettingsManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.defaults = {
      theme: 'dark',
      searchEngine: 'google',
      homepage: 'nova://newtab',
      bookmarksBarVisible: false,
      adblockEnabled: true,
      doNotTrack: true,
      defaultZoom: 100,
      fontSize: 'medium',
      hardwareAcceleration: true,
      smoothScrolling: true,
      showHomeButton: true,
      autoplayBlock: true,
      notificationsBlock: false,
      downloadPath: '',
      askBeforeDownload: false,
      language: 'ru',
      startupBehavior: 'newtab',
      tabCloseAction: 'selectRight',
      verticalTabs: false,
      splitViewEnabled: true,
      savePasswords: true,
      autofillEnabled: true,
      passwordLength: 20,
      proxyEnabled: false,
      proxyAddress: '',
      proxyBypass: '<local>',
      aiEnabled: true,
      aiProvider: 'builtin',
      aiApiKey: '',
      readingModeEnabled: true,
      pipEnabled: true,
    };
  }

  async init() {
    await this.applyAllSettings();
    this.listenForChanges();
  }

  async applyAllSettings() {
    const theme = await window.electronAPI.settingsGet('theme', this.defaults.theme);
    this.applyTheme(theme);

    const bookmarksBar = await window.electronAPI.settingsGet('bookmarksBarVisible', this.defaults.bookmarksBarVisible);
    const bar = document.getElementById('bookmarks-bar');
    if (bar) bar.classList.toggle('hidden', !bookmarksBar);

    const showHome = await window.electronAPI.settingsGet('showHomeButton', this.defaults.showHomeButton);
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) homeBtn.style.display = showHome ? '' : 'none';

    const zoom = await window.electronAPI.settingsGet('defaultZoom', this.defaults.defaultZoom);
    this.applyZoom(zoom);
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    window.electronAPI.settingsSet('theme', theme);
  }

  applyZoom(zoomPercent) {
    const wv = this.tabManager?.getActiveWebview();
    if (wv) {
      const zoomFactor = zoomPercent / 100;
      const zoomLevel = Math.log(zoomFactor) / Math.log(1.2);
      wv.setZoomLevel(zoomLevel);
    }
  }

  async getSetting(key) {
    return await window.electronAPI.settingsGet(key, this.defaults[key]);
  }

  async setSetting(key, value) {
    await window.electronAPI.settingsSet(key, value);

    switch (key) {
      case 'theme':
        this.applyTheme(value);
        break;
      case 'bookmarksBarVisible':
        const bar = document.getElementById('bookmarks-bar');
        if (bar) bar.classList.toggle('hidden', !value);
        break;
      case 'showHomeButton':
        const homeBtn = document.getElementById('btn-home');
        if (homeBtn) homeBtn.style.display = value ? '' : 'none';
        break;
      case 'defaultZoom':
        this.applyZoom(value);
        break;
      case 'verticalTabs':
        if (window._toggleVerticalTabs) window._toggleVerticalTabs();
        break;
      case 'proxy':
        if (value && value.enabled) {
          await window.electronAPI.proxySet(value);
        } else {
          await window.electronAPI.proxySet({ enabled: false });
        }
        break;
      case 'openIncognito':
        if (value) window.electronAPI.openIncognito();
        break;
      case 'checkUpdate':
        window.electronAPI.updateCheck();
        Utils.showNotification('🔍 Проверяем обновления...', 3000, 'info');
        break;
    }
  }

  // Слушаем сообщения от страницы настроек
  listenForChanges() {
    window.addEventListener('message', async (event) => {
      if (event.data?.type === 'setting-changed') {
        await this.setSetting(event.data.key, event.data.value);
      }
    });
  }

  async getAllSettings() {
    const all = await window.electronAPI.settingsGetAll();
    return { ...this.defaults, ...all };
  }

  async resetAllSettings() {
    for (const [key, value] of Object.entries(this.defaults)) {
      await window.electronAPI.settingsSet(key, value);
    }
    await this.applyAllSettings();
  }

  getSearchEngines() {
    return {
      google: { name: 'Google', url: 'https://www.google.com/search?q=' },
      yandex: { name: 'Яндекс', url: 'https://yandex.ru/search/?text=' },
      bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
      duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
      ecosia: { name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' }
    };
  }

  async getSearchUrl(query) {
    const engine = await this.getSetting('searchEngine');
    const engines = this.getSearchEngines();
    const selected = engines[engine] || engines.google;
    return selected.url + encodeURIComponent(query);
  }
}