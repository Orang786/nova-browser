// ============================================
// ИСТОРИЯ
// ============================================

class HistoryManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const btnHistory = document.getElementById('btn-history');
    btnHistory.addEventListener('click', () => this.showInSidebar());
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const searchInput = document.getElementById('sidebar-search-input');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = 'История';

    const history = await window.electronAPI.historyGet();
    this.renderHistoryList(history.slice(0, 100), sidebarContent);

    // Поиск
    searchInput.oninput = Utils.debounce(async () => {
      const query = searchInput.value.trim();
      if (query) {
        const results = await window.electronAPI.historySearch(query);
        this.renderHistoryList(results.slice(0, 100), sidebarContent);
      } else {
        this.renderHistoryList(history.slice(0, 100), sidebarContent);
      }
    }, 300);
  }

  renderHistoryList(items, container) {
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">История пуста</div>';
      return;
    }

    // Группировка по дням
    const grouped = {};
    items.forEach(item => {
      const date = new Date(item.date);
      const dayKey = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(item);
    });

    let html = '';
    for (const [day, entries] of Object.entries(grouped)) {
      html += `<div class="sidebar-section-header">${day}</div>`;
      html += entries.map(h => `
        <div class="sidebar-item" data-url="${this.escapeAttr(h.url)}">
          <img class="sidebar-item-favicon" src="${Utils.getFaviconUrl(h.url) || ''}"
               onerror="this.style.display='none'" alt="">
          <div class="sidebar-item-info">
            <div class="sidebar-item-title">${this.escapeHtml(h.title || 'Без названия')}</div>
            <div class="sidebar-item-url">${Utils.shortenUrl(h.url, 40)}</div>
          </div>
          <span class="sidebar-item-date">${Utils.formatDate(h.date)}</span>
        </div>
      `).join('');
    }

    container.innerHTML = html;

    // Клик по элементу
    container.querySelectorAll('.sidebar-item').forEach(el => {
      el.addEventListener('click', () => {
        this.tabManager.navigate(el.dataset.url);
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;');
  }
}