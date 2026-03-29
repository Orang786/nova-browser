// ============================================
// СИСТЕМА ОБНОВЛЕНИЙ (UI)
// ============================================

class UpdaterUI {
  constructor() {
    this.setupListeners();
  }

  setupListeners() {
    window.electronAPI.onUpdateAvailable((info) => {
      this.showUpdateBanner(info);
    });

    window.electronAPI.onUpdateProgress((progress) => {
      this.updateProgress(progress);
    });

    window.electronAPI.onUpdateDownloaded((info) => {
      this.showInstallBanner(info);
    });

    window.electronAPI.onUpdateError((error) => {
      Utils.showNotification('❌ Ошибка обновления: ' + error, 4000, 'error');
    });
  }

  showUpdateBanner(info) {
    const old = document.getElementById('update-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <div class="update-banner-content">
        <div class="update-banner-icon">🚀</div>
        <div class="update-banner-info">
          <div class="update-banner-title">Доступно обновление v${info.version}</div>
          <div class="update-banner-desc">${info.releaseNotes || 'Новая версия готова к загрузке'}</div>
        </div>
        <div class="update-banner-actions">
          <button class="update-btn-later" id="update-dismiss">Позже</button>
          <button class="update-btn-restart" id="update-download-btn">📥 Скачать</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('update-download-btn').addEventListener('click', () => {
      window.electronAPI.updateDownload(info.downloadUrl);

      // Показать прогресс
      banner.innerHTML = `
        <div class="update-banner-content">
          <div class="update-banner-icon">📥</div>
          <div class="update-banner-info">
            <div class="update-banner-title">Скачивание v${info.version}...</div>
            <div class="update-progress-container">
              <div class="update-progress-bar">
                <div class="update-progress-fill" id="update-progress-fill" style="width: 0%"></div>
              </div>
              <span class="update-progress-text" id="update-progress-text">0%</span>
            </div>
          </div>
          <button class="update-banner-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
      `;
    });

    document.getElementById('update-dismiss').addEventListener('click', () => {
      banner.classList.add('hiding');
      setTimeout(() => banner.remove(), 300);
    });
  }

  updateProgress(progress) {
    const fill = document.getElementById('update-progress-fill');
    const text = document.getElementById('update-progress-text');

    if (fill) fill.style.width = `${Math.round(progress.percent)}%`;
    if (text) text.textContent = `${Math.round(progress.percent)}%`;
  }

  showInstallBanner(info) {
    const old = document.getElementById('update-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'update-ready';
    banner.innerHTML = `
      <div class="update-banner-content">
        <div class="update-banner-icon">✅</div>
        <div class="update-banner-info">
          <div class="update-banner-title">Обновление скачано!</div>
          <div class="update-banner-desc">Установить сейчас? Браузер будет перезапущен.</div>
        </div>
        <div class="update-banner-actions">
          <button class="update-btn-later" id="update-later">Позже</button>
          <button class="update-btn-restart" id="update-install-btn">🔄 Установить</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('update-install-btn').addEventListener('click', () => {
      window.electronAPI.updateInstall(info.path);
    });

    document.getElementById('update-later').addEventListener('click', () => {
      banner.classList.add('hiding');
      setTimeout(() => banner.remove(), 300);
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}