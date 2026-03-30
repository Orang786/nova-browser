// ============================================
// ЗАМЕТКИ К САЙТАМ
// ============================================

class SiteNotes {
  constructor(tabManager) {
    this.tabManager = tabManager;
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = '📝 Заметки';

    const tab = this.tabManager.tabs.find(t => t.id === this.tabManager.activeTabId);
    const domain = tab?.url ? Utils.getDomain(tab.url) : '';
    const allNotes = await window.electronAPI.settingsGet('siteNotes', {});
    const currentNote = allNotes[domain] || '';

    sidebarContent.innerHTML = `
      <div style="padding:8px;">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
          Заметка для: <strong style="color:var(--accent);">${domain || 'эта страница'}</strong>
        </div>
        <textarea id="site-note-input" placeholder="Добавьте заметку к этому сайту..."
                  style="width:100%;min-height:200px;background:var(--bg-input);border:1px solid var(--border-color);
                         border-radius:8px;padding:12px;color:var(--text-primary);font-size:13px;
                         font-family:inherit;resize:vertical;outline:none;line-height:1.6;">${currentNote}</textarea>
        <button id="site-note-save" style="margin-top:8px;padding:8px 16px;background:var(--accent);
                color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;width:100%;">
          💾 Сохранить
        </button>
        
        <h4 style="margin-top:24px;margin-bottom:8px;font-size:13px;color:var(--text-secondary);">Все заметки</h4>
        <div id="all-notes-list">
          ${Object.entries(allNotes).map(([site, note]) => `
            <div class="sidebar-item" style="cursor:pointer;" data-domain="${site}">
              <div class="sidebar-item-info">
                <div class="sidebar-item-title">${site}</div>
                <div class="sidebar-item-url" style="white-space:pre-wrap;">${note.substring(0, 50)}${note.length > 50 ? '...' : ''}</div>
              </div>
              <button class="sidebar-item-delete" data-domain="${site}">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          `).join('') || '<div class="empty-state">Нет заметок</div>'}
        </div>
      </div>
    `;

    // Сохранить
    sidebarContent.querySelector('#site-note-save').onclick = async () => {
      const note = sidebarContent.querySelector('#site-note-input').value;
      const notes = await window.electronAPI.settingsGet('siteNotes', {});
      if (note.trim()) {
        notes[domain] = note;
      } else {
        delete notes[domain];
      }
      await window.electronAPI.settingsSet('siteNotes', notes);
      Utils.showNotification('📝 Заметка сохранена', 2000, 'success');
      this.showInSidebar();
    };

    // Удалить заметку
    sidebarContent.querySelectorAll('.sidebar-item-delete').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const notes = await window.electronAPI.settingsGet('siteNotes', {});
        delete notes[btn.dataset.domain];
        await window.electronAPI.settingsSet('siteNotes', notes);
        this.showInSidebar();
      };
    });
  }
}