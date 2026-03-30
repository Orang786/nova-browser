// ============================================
// FOCUS MODE (блокировка сайтов)
// ============================================

class FocusMode {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.isActive = false;
    this.blockedSites = [];
    this.timer = null;
    this.startTime = null;
    this.duration = 0;
  }

  async toggle() {
    if (this.isActive) {
      this.deactivate();
      return;
    }
    this.showDialog();
  }

  showDialog() {
    const overlay = document.createElement('div');
    overlay.id = 'focus-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
      z-index:100000;display:flex;align-items:center;justify-content:center;
    `;

    overlay.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-color);
                  border-radius:16px;padding:32px;width:400px;box-shadow:0 16px 64px rgba(0,0,0,0.5);">
        <h3 style="margin-bottom:8px;">🎯 Режим фокусировки</h3>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px;">
          Заблокируйте отвлекающие сайты на время работы
        </p>
        
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Заблокировать:</label>
        <textarea id="focus-sites" placeholder="youtube.com&#10;twitter.com&#10;reddit.com&#10;tiktok.com"
                  style="width:100%;height:100px;background:var(--bg-input);border:1px solid var(--border-color);
                         border-radius:8px;padding:10px;color:var(--text-primary);font-size:13px;
                         font-family:inherit;resize:none;outline:none;">youtube.com
twitter.com
reddit.com
tiktok.com
instagram.com</textarea>
        
        <label style="font-size:13px;font-weight:600;display:block;margin:16px 0 6px;">Длительность:</label>
        <select id="focus-duration" style="width:100%;padding:10px;background:var(--bg-input);
                border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);
                font-size:14px;font-family:inherit;outline:none;">
          <option value="25">25 минут (Pomodoro)</option>
          <option value="30">30 минут</option>
          <option value="60" selected>1 час</option>
          <option value="120">2 часа</option>
          <option value="180">3 часа</option>
          <option value="0">До отмены</option>
        </select>
        
        <div style="display:flex;gap:10px;margin-top:20px;">
          <button id="focus-start" style="flex:1;padding:10px;background:var(--accent);color:white;
                  border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;">
            🎯 Начать
          </button>
          <button id="focus-cancel" style="padding:10px 20px;background:var(--bg-hover);color:var(--text-secondary);
                  border:1px solid var(--border-color);border-radius:8px;cursor:pointer;font-size:14px;">
            Отмена
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('focus-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('focus-start').onclick = () => {
      const sites = document.getElementById('focus-sites').value
        .split('\n').map(s => s.trim().toLowerCase()).filter(s => s);
      const duration = parseInt(document.getElementById('focus-duration').value);

      this.activate(sites, duration);
      overlay.remove();
    };
  }

  activate(sites, minutes) {
    this.isActive = true;
    this.blockedSites = sites;
    this.startTime = Date.now();
    this.duration = minutes * 60 * 1000;

    // Показать индикатор
    this.showIndicator();

    if (minutes > 0) {
      this.timer = setTimeout(() => this.deactivate(), this.duration);
    }

    Utils.showNotification(`🎯 Focus Mode ON • ${sites.length} сайтов заблокировано${minutes > 0 ? ` на ${minutes} мин` : ''}`, 4000, 'success');
  }

  deactivate() {
    this.isActive = false;
    this.blockedSites = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    const indicator = document.getElementById('focus-indicator');
    if (indicator) indicator.remove();

    Utils.showNotification('🎯 Focus Mode OFF', 2000, 'info');
  }

  showIndicator() {
    const existing = document.getElementById('focus-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'focus-indicator';
    indicator.style.cssText = `
      position:fixed;top:8px;left:50%;transform:translateX(-50%);
      background:var(--accent);color:white;padding:4px 16px;border-radius:999px;
      font-size:12px;font-weight:700;z-index:100001;display:flex;align-items:center;gap:8px;
      cursor:pointer;box-shadow:0 4px 15px rgba(124,58,237,0.4);
    `;
    indicator.innerHTML = `🎯 Focus Mode <span id="focus-timer"></span>`;
    indicator.onclick = () => this.deactivate();

    document.body.appendChild(indicator);

    // Обновлять таймер
    if (this.duration > 0) {
      const updateTimer = () => {
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.duration - elapsed);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const timerEl = document.getElementById('focus-timer');
        if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (remaining > 0 && this.isActive) requestAnimationFrame(updateTimer);
      };
      updateTimer();
    }
  }

  // Проверка — заблокирован ли сайт
  isBlocked(url) {
    if (!this.isActive) return false;
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return this.blockedSites.some(s => domain.includes(s));
    } catch { return false; }
  }
}