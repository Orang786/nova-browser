// ============================================
// МЕНЕДЖЕР РАСШИРЕНИЙ (UI)
// ============================================

class ExtensionsUI {
  constructor(tabManager) {
    this.tabManager = tabManager;
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const searchInput = document.getElementById('sidebar-search-input');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = '🧩 Расширения';
    searchInput.placeholder = 'Поиск или ID расширения...';

    const extensions = await window.electronAPI.extensionsGetAll();
    this.renderList(extensions, sidebarContent);

    searchInput.oninput = null;
  }

  renderList(extensions, container) {
    container.innerHTML = `
      <div class="ext-actions">
        <button class="ext-action-btn" id="ext-load-folder">
          📁 Загрузить папку
        </button>
        <button class="ext-action-btn" id="ext-load-crx">
          📦 Загрузить .crx
        </button>
        <button class="ext-action-btn" id="ext-from-store">
          🏪 Из Chrome Store
        </button>
      </div>

      ${extensions.length === 0 ? `
        <div class="empty-state">
          <div style="font-size:48px; margin-bottom:12px;">🧩</div>
          <div style="font-weight:600; margin-bottom:8px;">Нет расширений</div>
          <div style="font-size:12px; color:var(--text-muted); line-height:1.5;">
            Загрузите расширение из папки,<br>
            .crx файла или Chrome Web Store
          </div>
        </div>
      ` : extensions.map(ext => `
        <div class="sidebar-item ext-item" data-id="${ext.id}">
          <div class="ext-icon">🧩</div>
          <div class="sidebar-item-info">
            <div class="sidebar-item-title">${this.escapeHtml(ext.name)}</div>
            <div class="sidebar-item-url">v${ext.version} • ${ext.type || 'extension'}</div>
          </div>
          <label class="toggle-switch-sm">
            <input type="checkbox" class="ext-toggle" data-id="${ext.id}" 
                   ${ext.enabled ? 'checked' : ''}>
            <span class="toggle-slider-sm"></span>
          </label>
          <button class="sidebar-item-delete ext-remove" data-id="${ext.id}" title="Удалить">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `).join('')}
    `;

    // Загрузить из папки
    container.querySelector('#ext-load-folder')?.addEventListener('click', async () => {
      const result = await window.electronAPI.extensionsLoadFolder();
      if (result.success) {
        Utils.showNotification(`🧩 ${result.extension.name} установлено!`, 3000, 'success');
        this.showInSidebar();
      } else if (result.error !== 'Отменено') {
        Utils.showNotification('❌ ' + result.error, 3000, 'error');
      }
    });

    // Загрузить CRX
    container.querySelector('#ext-load-crx')?.addEventListener('click', async () => {
      const result = await window.electronAPI.extensionsLoadCRX();
      if (result.success) {
        Utils.showNotification(`🧩 ${result.extension.name} установлено!`, 3000, 'success');
        this.showInSidebar();
      } else if (result.error !== 'Отменено') {
        Utils.showNotification('❌ ' + result.error, 3000, 'error');
      }
    });

    // Из Chrome Store
    container.querySelector('#ext-from-store')?.addEventListener('click', () => {
      this.showStoreDialog(container);
    });

    // Переключатель
    container.querySelectorAll('.ext-toggle').forEach(toggle => {
      toggle.addEventListener('change', async () => {
        const result = await window.electronAPI.extensionsToggle(
          toggle.dataset.id, toggle.checked
        );
        if (result.success) {
          Utils.showNotification(
            toggle.checked ? '✅ Расширение включено' : '❌ Расширение выключено',
            2000, 'info'
          );
        }
      });
    });

    // Удалить
    container.querySelectorAll('.ext-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Удалить это расширение?')) {
          await window.electronAPI.extensionsRemove(btn.dataset.id);
          Utils.showNotification('🗑️ Расширение удалено', 2000, 'info');
          this.showInSidebar();
        }
      });
    });
  }

  showStoreDialog(container) {
    const dialog = document.createElement('div');
    dialog.className = 'ext-store-dialog';
    dialog.innerHTML = `
      <div style="padding:16px; background:var(--bg-tertiary); border-radius:8px; margin-bottom:12px;">
        <h4 style="margin-bottom:8px; font-size:14px;">🏪 Chrome Web Store</h4>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px; line-height:1.5;">
          Как найти ID расширения:<br>
          1. Откройте расширение в Chrome Web Store<br>
          2. Скопируйте ID из URL:<br>
          <code style="background:var(--bg-input); padding:2px 6px; border-radius:4px; font-size:11px;">
            chrome.google.com/webstore/detail/название/<strong>ID_ЗДЕСЬ</strong>
          </code>
        </p>
        <input type="text" class="password-dialog-input" id="ext-store-id" 
               placeholder="Вставьте ID расширения (например: cjpalhdlnbpafiamejdnhcphjbkeiagm)">
        
        <div style="margin-top:8px;">
          <p style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Популярные расширения:</p>
          <div class="ext-popular-list">
            <button class="ext-popular-item" data-id="cjpalhdlnbpafiamejdnhcphjbkeiagm">
              🛡️ uBlock Origin
            </button>
            <button class="ext-popular-item" data-id="nngceckbapebfimnlniiiahkandclblb">
              🌙 Dark Reader
            </button>
            <button class="ext-popular-item" data-id="gcbommkclmhbkzddftdipkbkiafnkahh">
              🔑 Bitwarden
            </button>
            <button class="ext-popular-item" data-id="bgnkhhnnamicmpeenaelnjfhikgbkllg">
              🔤 AdGuard
            </button>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="pwd-save-btn" id="ext-store-install">📥 Установить</button>
          <button class="pwd-cancel-btn" id="ext-store-cancel">Отмена</button>
        </div>
        <div id="ext-store-status" style="margin-top:8px; font-size:12px; color:var(--text-muted);"></div>
      </div>
    `;

    // Вставить после кнопок
    const actions = container.querySelector('.ext-actions');
    if (actions) {
      actions.after(dialog);
    } else {
      container.insertBefore(dialog, container.firstChild);
    }

    // Популярные расширения
    dialog.querySelectorAll('.ext-popular-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('ext-store-id').value = btn.dataset.id;
      });
    });

    // Установить
    dialog.querySelector('#ext-store-install').addEventListener('click', async () => {
      const extId = document.getElementById('ext-store-id').value.trim();
      const status = document.getElementById('ext-store-status');

      if (!extId) {
        status.textContent = '⚠️ Введите ID расширения';
        status.style.color = 'var(--warning)';
        return;
      }

      status.textContent = '📥 Скачивание...';
      status.style.color = 'var(--accent)';

      const result = await window.electronAPI.extensionsInstallFromStore(extId);

      if (result.success) {
        Utils.showNotification(`🧩 ${result.extension.name} установлено!`, 3000, 'success');
        dialog.remove();
        this.showInSidebar();
      } else {
        status.textContent = '❌ ' + result.error;
        status.style.color = 'var(--danger)';
      }
    });

    // Отмена
    dialog.querySelector('#ext-store-cancel').addEventListener('click', () => {
      dialog.remove();
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}