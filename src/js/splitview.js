// ============================================
// SPLIT VIEW
// ============================================

class SplitView {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.isActive = false;
    this.leftTabId = null;
    this.rightTabId = null;
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
      return;
    }

    if (this.tabManager.tabs.length < 2) {
      Utils.showNotification('Нужно минимум 2 вкладки для Split View', 2000, 'warning');
      return;
    }

    this.activate();
  }

  activate() {
    this.isActive = true;
    const container = document.getElementById('webview-container');

    // Берём текущую и следующую вкладку
    const currentIndex = this.tabManager.tabs.findIndex(
      t => t.id === this.tabManager.activeTabId
    );
    const nextIndex = (currentIndex + 1) % this.tabManager.tabs.length;

    this.leftTabId = this.tabManager.tabs[currentIndex].id;
    this.rightTabId = this.tabManager.tabs[nextIndex].id;

    // Добавить разделитель если нет
    if (!document.getElementById('split-divider')) {
      const divider = document.createElement('div');
      divider.id = 'split-divider';
      container.appendChild(divider);

      // Resize
      let isResizing = false;
      divider.addEventListener('mousedown', () => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const rect = container.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(20, Math.min(80, percent));
        container.style.gridTemplateColumns = `${clamped}% 4px ${100 - clamped}%`;
      });

      document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });
    }

    // Скрыть все webview
    container.querySelectorAll('webview').forEach(wv => {
      wv.classList.remove('active', 'split-left', 'split-right');
    });

    // Показать два
    const leftWv = container.querySelector(`webview[data-tab-id="${this.leftTabId}"]`);
    const rightWv = container.querySelector(`webview[data-tab-id="${this.rightTabId}"]`);

    if (leftWv) {
      leftWv.classList.add('split-left');
      container.insertBefore(leftWv, container.firstChild);
    }

    const divider = document.getElementById('split-divider');
    if (divider && rightWv) {
      container.insertBefore(divider, rightWv);
    }

    if (rightWv) {
      rightWv.classList.add('split-right');
    }

    document.body.classList.add('split-view-mode');
    container.style.gridTemplateColumns = '1fr 4px 1fr';

    Utils.showNotification('🔀 Split View активирован', 2000, 'success');
  }

  deactivate() {
    this.isActive = false;

    document.body.classList.remove('split-view-mode');

    const container = document.getElementById('webview-container');
    container.style.gridTemplateColumns = '';

    // Убрать split классы
    container.querySelectorAll('webview').forEach(wv => {
      wv.classList.remove('split-left', 'split-right');
    });

    // Показать активную вкладку
    this.tabManager.activateTab(this.tabManager.activeTabId);

    this.leftTabId = null;
    this.rightTabId = null;

    Utils.showNotification('🔀 Split View деактивирован', 2000, 'info');
  }
}