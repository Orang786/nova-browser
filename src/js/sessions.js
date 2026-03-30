// ============================================
// СЕССИИ (сохранение групп вкладок)
// ============================================

class SessionManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
  }

  async saveSession(name) {
    const tabs = this.tabManager.tabs.map(t => ({
      url: t.url,
      title: t.title,
      pinned: t.pinned || false
    })).filter(t => t.url && !t.url.startsWith('file://'));

    const sessions = await window.electronAPI.settingsGet('sessions', []);
    sessions.unshift({
      id: Date.now().toString(),
      name: name || `Сессия ${new Date().toLocaleString('ru-RU')}`,
      tabs: tabs,
      date: new Date().toISOString()
    });

    await window.electronAPI.settingsSet('sessions', sessions.slice(0, 50));
    Utils.showNotification(`📑 Сессия сохранена (${tabs.length} вкладок)`, 2000, 'success');
  }

  async restoreSession(sessionId) {
    const sessions = await window.electronAPI.settingsGet('sessions', []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    for (const tab of session.tabs) {
      this.tabManager.createTab(tab.url, tab.title);
    }

    Utils.showNotification(`📑 Восстановлено ${session.tabs.length} вкладок`, 2000, 'success');
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = '📑 Сессии';

    const sessions = await window.electronAPI.settingsGet('sessions', []);

    sidebarContent.innerHTML = `
      <button class="sidebar-add-btn" id="btn-save-session">💾 Сохранить текущую сессию</button>
      ${sessions.length === 0 ? '<div class="empty-state">Нет сохранённых сессий</div>' :
        sessions.map(s => `
          <div class="sidebar-item" data-id="${s.id}">
            <div class="sidebar-item-info">
              <div class="sidebar-item-title">${s.name}</div>
              <div class="sidebar-item-url">${s.tabs.length} вкладок • ${Utils.formatDate(s.date)}</div>
            </div>
            <button class="sidebar-item-delete" data-id="${s.id}">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        `).join('')}
    `;

    // Сохранить сессию
    sidebarContent.querySelector('#btn-save-session').onclick = () => {
      const name = prompt('Название сессии:', `Сессия ${new Date().toLocaleTimeString('ru-RU')}`);
      if (name) this.saveSession(name).then(() => this.showInSidebar());
    };

    // Восстановить
    sidebarContent.querySelectorAll('.sidebar-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar-item-delete')) return;
        this.restoreSession(el.dataset.id);
      });
    });

    // Удалить
    sidebarContent.querySelectorAll('.sidebar-item-delete').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        let sessions = await window.electronAPI.settingsGet('sessions', []);
        sessions = sessions.filter(s => s.id !== btn.dataset.id);
        await window.electronAPI.settingsSet('sessions', sessions);
        this.showInSidebar();
      };
    });
  }
}