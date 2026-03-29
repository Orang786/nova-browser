// ============================================
// ЗАКЛАДКИ
// ============================================

class BookmarksManager {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const btnBookmark = document.getElementById('btn-bookmark');
    const btnBookmarksPanel = document.getElementById('btn-bookmarks-panel');

    btnBookmark.addEventListener('click', () => this.toggleBookmark());
    btnBookmarksPanel.addEventListener('click', () => this.showInSidebar());
  }

  async toggleBookmark() {
    const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
    if (!tab || !tab.url) return;

    const isBookmarked = await window.electronAPI.bookmarksIsBookmarked(tab.url);

    if (isBookmarked) {
      // Удалить закладку
      const bookmarks = await window.electronAPI.bookmarksGet();
      const bookmark = bookmarks.find(b => b.url === tab.url);
      if (bookmark) {
        await window.electronAPI.bookmarksRemove(bookmark.id);
        Utils.showNotification('Закладка удалена');
      }
    } else {
      // Добавить закладку
      await window.electronAPI.bookmarksAdd({
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon
      });
      Utils.showNotification('Закладка добавлена ⭐');
    }

    // Обновить UI
    this.tabManager.checkBookmarkState(tab.url);
    this.updateBookmarksBar();
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const searchInput = document.getElementById('sidebar-search-input');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = 'Закладки';

    const bookmarks = await window.electronAPI.bookmarksGet();
    this.renderBookmarksList(bookmarks, sidebarContent);

    // Поиск
    searchInput.oninput = Utils.debounce(async () => {
      const query = searchInput.value.toLowerCase();
      const filtered = bookmarks.filter(b =>
        b.title?.toLowerCase().includes(query) ||
        b.url?.toLowerCase().includes(query)
      );
      this.renderBookmarksList(filtered, sidebarContent);
    }, 200);
  }

  renderBookmarksList(bookmarks, container) {
    if (bookmarks.length === 0) {
      container.innerHTML = '<div class="empty-state">Нет закладок</div>';
      return;
    }

    container.innerHTML = bookmarks.map(b => `
      <div class="sidebar-item" data-url="${this.escapeAttr(b.url)}" data-id="${b.id}">
        <img class="sidebar-item-favicon" src="${b.favicon || Utils.getFaviconUrl(b.url) || ''}"
             onerror="this.style.display='none'" alt="">
        <div class="sidebar-item-info">
          <div class="sidebar-item-title">${this.escapeHtml(b.title || 'Без названия')}</div>
          <div class="sidebar-item-url">${Utils.shortenUrl(b.url, 40)}</div>
        </div>
        <span class="sidebar-item-date">${Utils.formatDate(b.date)}</span>
        <button class="sidebar-item-delete" data-id="${b.id}" title="Удалить">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Клик по элементу
    container.querySelectorAll('.sidebar-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.sidebar-item-delete')) return;
        const url = el.dataset.url;
        this.tabManager.navigate(url);
      });
    });

    // Удаление
    container.querySelectorAll('.sidebar-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await window.electronAPI.bookmarksRemove(btn.dataset.id);
        this.showInSidebar(); // Перезагрузить
        this.updateBookmarksBar();
        Utils.showNotification('Закладка удалена');
      });
    });
  }

  async updateBookmarksBar() {
    const bookmarks = await window.electronAPI.bookmarksGet();
    const container = document.getElementById('bookmarks-bar-items');

    container.innerHTML = bookmarks.slice(0, 20).map(b => `
      <button class="bookmark-bar-item" data-url="${this.escapeAttr(b.url)}" title="${this.escapeAttr(b.url)}">
        <img src="${b.favicon || Utils.getFaviconUrl(b.url) || ''}" onerror="this.style.display='none'" alt="" width="14" height="14">
        <span>${this.escapeHtml((b.title || Utils.getDomain(b.url)).substring(0, 25))}</span>
      </button>
    `).join('');

    container.querySelectorAll('.bookmark-bar-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabManager.navigate(btn.dataset.url);
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  escapeAttr(text) {
    return (text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}