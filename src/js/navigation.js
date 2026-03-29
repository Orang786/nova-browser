// ============================================
// НАВИГАЦИЯ
// ============================================

class Navigation {
  constructor(tabManager) {
    this.tabManager = tabManager;
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
        const url = urlInput.value.trim();
        if (url) {
          this.tabManager.navigate(url);
          urlInput.blur();
        }
      }
      // Escape — отменить
      if (e.key === 'Escape') {
        const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
        if (tab) urlInput.value = tab.url;
        urlInput.blur();
      }
    });

    // Фокус на URL — выделить всё
    urlInput.addEventListener('focus', () => {
      setTimeout(() => urlInput.select(), 50);
    });

    // Навигационные кнопки
    btnBack.addEventListener('click', () => this.tabManager.goBack());
    btnForward.addEventListener('click', () => this.tabManager.goForward());
    btnReload.addEventListener('click', () => {
      const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
      if (tab?.isLoading) {
        this.tabManager.stop();
      } else {
        this.tabManager.reload();
      }
    });
    btnHome.addEventListener('click', () => this.tabManager.navigate('nova://newtab'));
  }
}