// ============================================
// УТИЛИТЫ
// ============================================

const Utils = {
  // Форматирование URL
  formatUrl(input) {
    let url = input.trim();

    // Внутренние страницы
    if (url.startsWith('nova://')) {
      return url;
    }

    // Уже полный URL
    if (url.match(/^https?:\/\//)) {
      return url;
    }

    // Файловый протокол
    if (url.startsWith('file://')) {
      return url;
    }

    // Похоже на домен
    if (url.match(/^[\w-]+(\.[\w-]+)+/) || url.includes('localhost')) {
      return 'https://' + url;
    }

    // Поисковый запрос
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  },

  // Получить домен из URL
  getDomain(url) {
    try {
      if (url.startsWith('nova://')) return 'Nova';
      if (url.startsWith('file://')) return 'Local File';
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  },

  // Получить favicon URL
  getFaviconUrl(url) {
    try {
      if (url.startsWith('nova://') || url.startsWith('file://')) return null;
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  },

  // Форматирование размера файла
  formatBytes(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // Форматирование даты
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Короткий URL для отображения
  shortenUrl(url, maxLen = 60) {
    if (url.length <= maxLen) return url;
    return url.substring(0, maxLen - 3) + '...';
  },

  // Debounce
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Генерация ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

    // Улучшенные уведомления (Toast)
  showNotification(text, duration = 3000, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${text}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
      <div class="toast-progress"></div>
    `;
    toast.style.position = 'relative';
    toast.style.overflow = 'hidden';

    container.appendChild(toast);

    // Автоудаление
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Максимум 5 уведомлений
    while (container.children.length > 5) {
      container.firstChild.remove();
    }
  },

  // Шорткаты для типов
  showSuccess(text, duration) { this.showNotification(text, duration, 'success'); },
  showError(text, duration) { this.showNotification(text, duration, 'error'); },
  showWarning(text, duration) { this.showNotification(text, duration, 'warning'); },

  // Безопасность: определить тип протокола
  getSecurityLevel(url) {
    if (!url) return 'unknown';
    if (url.startsWith('https://')) return 'secure';
    if (url.startsWith('http://')) return 'insecure';
    return 'unknown';
  }
};