// ============================================
// МЕНЕДЖЕР ПАРОЛЕЙ (UI)
// ============================================

class PasswordsUI {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.visible = false;
  }

  async showInSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    const searchInput = document.getElementById('sidebar-search-input');

    sidebar.classList.remove('hidden');
    sidebarTitle.textContent = '🔐 Пароли';

    const passwords = await window.electronAPI.passwordsGetAll();
    this.renderList(passwords, sidebarContent);

    searchInput.placeholder = 'Поиск паролей...';
    searchInput.oninput = Utils.debounce(async () => {
      const query = searchInput.value.trim();
      if (query) {
        const results = await window.electronAPI.passwordsSearch(query);
        this.renderList(results, sidebarContent);
      } else {
        const all = await window.electronAPI.passwordsGetAll();
        this.renderList(all, sidebarContent);
      }
    }, 200);
  }

  renderList(passwords, container) {
    if (passwords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px; margin-bottom:12px;">🔐</div>
          <div style="font-weight:600; margin-bottom:4px;">Нет сохранённых паролей</div>
          <div style="font-size:12px;">Пароли будут сохраняться автоматически</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <button class="sidebar-add-btn" id="btn-add-password">
        ➕ Добавить пароль
      </button>
      ${passwords.map(p => `
        <div class="sidebar-item password-item" data-id="${p.id}" data-domain="${this.escapeAttr(p.domain)}">
          <img class="sidebar-item-favicon" 
               src="https://www.google.com/s2/favicons?domain=${p.domain}&sz=32"
               onerror="this.style.display='none'" alt="">
          <div class="sidebar-item-info">
            <div class="sidebar-item-title">${this.escapeHtml(p.domain)}</div>
            <div class="sidebar-item-url">${this.escapeHtml(p.username)}</div>
          </div>
          <button class="password-copy-btn" data-id="${p.id}" title="Копировать пароль">
            📋
          </button>
          <button class="sidebar-item-delete" data-id="${p.id}" title="Удалить">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `).join('')}
    `;

    // Добавить пароль
    container.querySelector('#btn-add-password')?.addEventListener('click', () => {
      this.showAddDialog(container);
    });

    // Копировать пароль
    container.querySelectorAll('.password-copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const password = await window.electronAPI.passwordsGetPassword(btn.dataset.id);
        if (password) {
          navigator.clipboard.writeText(password);
          Utils.showNotification('📋 Пароль скопирован', 2000, 'success');
        }
      });
    });

    // Удалить
    container.querySelectorAll('.sidebar-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('Удалить этот пароль?')) {
          await window.electronAPI.passwordsRemove(btn.dataset.id);
          this.showInSidebar();
          Utils.showNotification('🗑️ Пароль удалён', 2000, 'info');
        }
      });
    });

    // Клик по элементу — перейти на сайт
    container.querySelectorAll('.password-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.password-copy-btn') || e.target.closest('.sidebar-item-delete')) return;
        const domain = el.dataset.domain;
        this.tabManager.navigate('https://' + domain);
      });
    });
  }

  showAddDialog(container) {
    const dialog = document.createElement('div');
    dialog.className = 'password-dialog';
    dialog.innerHTML = `
      <div style="padding:16px; background:var(--bg-tertiary); border-radius:8px; margin-bottom:12px;">
        <h4 style="margin-bottom:12px; font-size:14px;">Добавить пароль</h4>
        <input type="text" class="password-dialog-input" id="pwd-url" placeholder="Сайт (example.com)">
        <input type="text" class="password-dialog-input" id="pwd-username" placeholder="Логин / Email">
        <div style="display:flex; gap:8px;">
          <input type="password" class="password-dialog-input" id="pwd-password" placeholder="Пароль" style="flex:1;">
          <button class="pwd-generate-btn" id="pwd-generate" title="Сгенерировать">🎲</button>
        </div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="pwd-save-btn" id="pwd-save">💾 Сохранить</button>
          <button class="pwd-cancel-btn" id="pwd-cancel">Отмена</button>
        </div>
      </div>
    `;

    container.insertBefore(dialog, container.firstChild.nextSibling);

    // Генерация пароля
    dialog.querySelector('#pwd-generate').addEventListener('click', async () => {
      const password = await window.electronAPI.passwordsGenerate(20);
      const pwdInput = dialog.querySelector('#pwd-password');
      pwdInput.type = 'text';
      pwdInput.value = password;
    });

    // Сохранить
    dialog.querySelector('#pwd-save').addEventListener('click', async () => {
      const url = dialog.querySelector('#pwd-url').value.trim();
      const username = dialog.querySelector('#pwd-username').value.trim();
      const password = dialog.querySelector('#pwd-password').value;

      if (!url || !username || !password) {
        Utils.showNotification('Заполните все поля', 2000, 'warning');
        return;
      }

      await window.electronAPI.passwordsAdd({
        url: url.startsWith('http') ? url : 'https://' + url,
        username,
        password
      });

      dialog.remove();
      this.showInSidebar();
      Utils.showNotification('🔐 Пароль сохранён', 2000, 'success');
    });

    // Отмена
    dialog.querySelector('#pwd-cancel').addEventListener('click', () => {
      dialog.remove();
    });
  }

  // Автозаполнение — проверяем есть ли пароль для текущего сайта
  async checkAutoFill(url) {
    const passwords = await window.electronAPI.passwordsFind(url);
    if (passwords.length > 0) {
      Utils.showNotification(`🔐 Найден пароль для ${passwords[0].domain}`, 3000, 'info');
    }
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