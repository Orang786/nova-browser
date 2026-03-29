// ============================================
// ЗАГРУЗКИ
// ============================================

class DownloadsManager {
  constructor() {
    this.activeDownloads = new Map();
    this.setupEventListeners();
    this.setupIPCListeners();
  }

  setupEventListeners() {
    const btnDownloads = document.getElementById('btn-downloads');
    const btnClearDownloads = document.getElementById('btn-clear-downloads');

    btnDownloads.addEventListener('click', () => this.togglePanel());
    btnClearDownloads.addEventListener('click', () => this.clearList());
  }

  setupIPCListeners() {
    window.electronAPI.onDownloadStarted((data) => {
      this.activeDownloads.set(data.id, data);
      this.addDownloadItem(data);
      this.updateBadge();
    });

    window.electronAPI.onDownloadProgress((data) => {
      this.updateProgress(data);
    });

    window.electronAPI.onDownloadComplete((data) => {
      this.completeDownload(data);
      this.updateBadge();
    });
  }

  togglePanel() {
    const panel = document.getElementById('downloads-panel');
    panel.classList.toggle('hidden');

    // Закрыть другие панели
    document.getElementById('dropdown-menu').classList.add('hidden');
  }

  addDownloadItem(data) {
    const list = document.getElementById('downloads-list');
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const item = document.createElement('div');
    item.className = 'download-item';
    item.dataset.downloadId = data.id;

    item.innerHTML = `
      <div class="download-filename">${data.filename}</div>
      <div class="download-progress-bar">
        <div class="download-progress-fill" style="width: 0%"></div>
      </div>
      <div class="download-info">
        <span class="download-status">Загрузка...</span>
        <span class="download-size">${Utils.formatBytes(data.totalBytes)}</span>
      </div>
    `;

    list.insertBefore(item, list.firstChild);
  }

  updateProgress(data) {
    const item = document.querySelector(`.download-item[data-download-id="${data.id}"]`);
    if (!item) return;

    const fill = item.querySelector('.download-progress-fill');
    const status = item.querySelector('.download-status');

    fill.style.width = `${data.progress}%`;
    status.textContent = `${data.progress}% — ${Utils.formatBytes(data.receivedBytes)} / ${Utils.formatBytes(data.totalBytes)}`;
  }

  completeDownload(data) {
    const item = document.querySelector(`.download-item[data-download-id="${data.id}"]`);
    if (!item) return;

    const fill = item.querySelector('.download-progress-fill');
    const status = item.querySelector('.download-status');

    if (data.state === 'completed') {
      fill.style.width = '100%';
      fill.style.background = 'var(--success)';
      status.textContent = 'Завершено ✓';
      status.style.color = 'var(--success)';
    } else {
      fill.style.background = 'var(--danger)';
      status.textContent = 'Ошибка ✕';
      status.style.color = 'var(--danger)';
    }

    this.activeDownloads.delete(data.id);
    Utils.showNotification(`Загрузка завершена: ${item.querySelector('.download-filename').textContent}`);
  }

  updateBadge() {
    const badge = document.getElementById('download-badge');
    const count = this.activeDownloads.size;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  clearList() {
    const list = document.getElementById('downloads-list');
    list.innerHTML = '<div class="empty-state">Нет загрузок</div>';
    this.updateBadge();
  }
}