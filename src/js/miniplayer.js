// ============================================
// МИНИ-ПЛЕЕР (как в Яндекс Браузере)
// ============================================

class MiniPlayer {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.isVisible = false;
    this.mediaTabId = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.checkInterval = null;
    this.dragState = null;

    this.player = document.getElementById('mini-player');
    this.content = document.getElementById('mini-player-content');
    this.titleEl = document.getElementById('mini-player-title');
    this.siteEl = document.getElementById('mini-player-site');
    this.progressFill = document.getElementById('mini-player-progress-fill');

    this.init();
  }

  init() {
    // Кнопки управления
    document.getElementById('mini-player-close').addEventListener('click', () => this.hide());
    document.getElementById('mini-player-back').addEventListener('click', () => this.goToTab());
    document.getElementById('mp-play').addEventListener('click', () => this.togglePlayPause());
    document.getElementById('mp-mute').addEventListener('click', () => this.toggleMute());
    document.getElementById('mp-prev').addEventListener('click', () => this.seekRelative(-10));
    document.getElementById('mp-next').addEventListener('click', () => this.seekRelative(10));

    // Прогресс бар — клик для перемотки
    document.getElementById('mini-player-progress').addEventListener('click', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.seekPercent(percent);
    });

    // Перетаскивание
    this.setupDrag();

    // Отслеживание переключения вкладок
    this.watchTabChanges();

    // Проверка медиа каждые 2 секунды
    this.checkInterval = setInterval(() => this.checkMedia(), 2000);
  }

  // Отслеживание переключения вкладок
  watchTabChanges() {
    const origActivate = this.tabManager.activateTab.bind(this.tabManager);
    this.tabManager.activateTab = (tabId) => {
      const previousTabId = this.tabManager.activeTabId;
      origActivate(tabId);

      // Если переключились с вкладки где было видео
      if (previousTabId && previousTabId !== tabId && this.mediaTabId === previousTabId) {
        this.show(previousTabId);
      }

      // Если вернулись на вкладку с видео — скрыть плеер
      if (tabId === this.mediaTabId && this.isVisible) {
        this.hide();
      }
    };
  }

  // Проверка наличия медиа на вкладках
  async checkMedia() {
    for (const tab of this.tabManager.tabs) {
      const wv = document.querySelector(`webview[data-tab-id="${tab.id}"]`);
      if (!wv) continue;

      try {
        const result = await wv.executeJavaScript(`
          (function() {
            const videos = document.querySelectorAll('video');
            const audios = document.querySelectorAll('audio');
            let playing = false;
            let currentTime = 0;
            let duration = 0;
            let paused = true;
            let muted = false;

            videos.forEach(v => {
              if (!v.paused && !v.ended && v.currentTime > 0) {
                playing = true;
                currentTime = v.currentTime;
                duration = v.duration;
                paused = v.paused;
                muted = v.muted;
              }
            });

            audios.forEach(a => {
              if (!a.paused && !a.ended && a.currentTime > 0) {
                playing = true;
                currentTime = a.currentTime;
                duration = a.duration;
                paused = a.paused;
                muted = a.muted;
              }
            });

            return { playing, currentTime, duration, paused, muted, hasMedia: videos.length > 0 || audios.length > 0 };
          })()
        `);

        if (result.playing) {
          this.mediaTabId = tab.id;
          this.isPlaying = !result.paused;
          this.isMuted = result.muted;

          // Обновить индикатор на вкладке
          const tabEl = document.querySelector(`.tab[data-tab-id="${tab.id}"]`);
          if (tabEl) {
            tabEl.classList.add('tab-has-media');
            const audioIcon = tabEl.querySelector('.tab-audio');
            if (audioIcon) audioIcon.classList.add('playing');
          }

          // Обновить прогресс мини-плеера
          if (this.isVisible && result.duration > 0) {
            const progress = (result.currentTime / result.duration) * 100;
            this.progressFill.style.width = progress + '%';
          }

          // Обновить иконку play/pause
          this.updatePlayIcon();
        } else {
          // Убрать индикатор
          const tabEl = document.querySelector(`.tab[data-tab-id="${tab.id}"]`);
          if (tabEl) {
            tabEl.classList.remove('tab-has-media');
            const audioIcon = tabEl.querySelector('.tab-audio');
            if (audioIcon) audioIcon.classList.remove('playing');
          }

          if (this.mediaTabId === tab.id && !result.hasMedia) {
            this.mediaTabId = null;
            if (this.isVisible) this.hide();
          }
        }
      } catch (e) {
        // Webview не готов
      }
    }
  }

  // Показать мини-плеер
  show(tabId) {
    this.mediaTabId = tabId;
    this.isVisible = true;

    const tab = this.tabManager.tabs.find(t => t.id === tabId);
    if (tab) {
      this.titleEl.textContent = tab.title || 'Воспроизведение';
      this.siteEl.textContent = this.getDomain(tab.url);
    }

    // Показать визуализацию
    this.content.innerHTML = `
      <div class="mini-player-placeholder">
        <div class="audio-bars">
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
        </div>
        <div class="mini-player-placeholder-text">${this.escapeHtml(tab?.title || 'Воспроизведение')}</div>
      </div>
    `;

    // Попробовать захватить кадр видео
    this.captureFrame(tabId);

    this.player.classList.remove('hidden');
    this.updatePlayIcon();
  }

  // Захват кадра с видео
  async captureFrame(tabId) {
    const wv = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (!wv) return;

    try {
      // Получаем постер или текущий кадр
      const posterUrl = await wv.executeJavaScript(`
        (function() {
          const video = document.querySelector('video');
          if (video) {
            return video.poster || '';
          }
          return '';
        })()
      `);

      if (posterUrl) {
        this.content.innerHTML = `
          <img src="${posterUrl}" alt="Video" style="width:100%;height:100%;object-fit:cover;">
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;">
            <div class="audio-bars">
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
              <div class="audio-bar"></div>
            </div>
          </div>
        `;
      }
    } catch(e) {}
  }

  // Скрыть
  hide() {
    this.isVisible = false;
    this.player.classList.add('hidden');
  }

  // Перейти на вкладку с медиа
  goToTab() {
    if (this.mediaTabId) {
      this.tabManager.activateTab(this.mediaTabId);
    }
    this.hide();
  }

  // Play / Pause
  async togglePlayPause() {
    if (!this.mediaTabId) return;
    const wv = document.querySelector(`webview[data-tab-id="${this.mediaTabId}"]`);
    if (!wv) return;

    try {
      await wv.executeJavaScript(`
        (function() {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (media) {
            if (media.paused) media.play();
            else media.pause();
          }
        })()
      `);
      this.isPlaying = !this.isPlaying;
      this.updatePlayIcon();
    } catch(e) {}
  }

  // Mute
  async toggleMute() {
    if (!this.mediaTabId) return;
    const wv = document.querySelector(`webview[data-tab-id="${this.mediaTabId}"]`);
    if (!wv) return;

    try {
      await wv.executeJavaScript(`
        (function() {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (media) media.muted = !media.muted;
        })()
      `);
      this.isMuted = !this.isMuted;
      this.updateMuteIcon();
    } catch(e) {}
  }

  // Перемотка
  async seekRelative(seconds) {
    if (!this.mediaTabId) return;
    const wv = document.querySelector(`webview[data-tab-id="${this.mediaTabId}"]`);
    if (!wv) return;

    try {
      await wv.executeJavaScript(`
        (function() {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (media) media.currentTime += ${seconds};
        })()
      `);
    } catch(e) {}
  }

  // Перемотка по проценту
  async seekPercent(percent) {
    if (!this.mediaTabId) return;
    const wv = document.querySelector(`webview[data-tab-id="${this.mediaTabId}"]`);
    if (!wv) return;

    try {
      await wv.executeJavaScript(`
        (function() {
          const media = document.querySelector('video') || document.querySelector('audio');
          if (media && media.duration) {
            media.currentTime = media.duration * ${percent};
          }
        })()
      `);
    } catch(e) {}
  }

  // Обновить иконку play/pause
  updatePlayIcon() {
    const icon = document.getElementById('mp-play-icon');
    if (this.isPlaying) {
      // Показать паузу
      icon.innerHTML = `
        <rect x="3" y="2" width="4" height="14" rx="1" fill="currentColor"/>
        <rect x="11" y="2" width="4" height="14" rx="1" fill="currentColor"/>
      `;
    } else {
      // Показать play
      icon.innerHTML = `
        <path d="M4 2l12 7-12 7V2z" fill="currentColor"/>
      `;
    }
  }

  // Обновить иконку mute
  updateMuteIcon() {
    const icon = document.getElementById('mp-mute-icon');
    if (this.isMuted) {
      icon.innerHTML = `
        <path d="M2 5h3l4-3v12l-4-3H2V5z" fill="currentColor"/>
        <path d="M11 5l4 4M15 5l-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      `;
    } else {
      icon.innerHTML = `
        <path d="M2 5h3l4-3v12l-4-3H2V5z" fill="currentColor"/>
        <path d="M11 5.5s1.5 1 1.5 2.5-1.5 2.5-1.5 2.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      `;
    }
  }

  // Перетаскивание мини-плеера
  setupDrag() {
    const header = document.getElementById('mini-player-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mini-player-btn')) return;

      isDragging = true;
      const rect = this.player.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      this.player.classList.add('dragging');
      this.player.style.transition = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      // Ограничения
      newLeft = Math.max(0, Math.min(window.innerWidth - this.player.offsetWidth, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - this.player.offsetHeight, newTop));

      this.player.style.position = 'fixed';
      this.player.style.left = newLeft + 'px';
      this.player.style.top = newTop + 'px';
      this.player.style.right = 'auto';
      this.player.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.player.classList.remove('dragging');
        this.player.style.transition = '';
      }
    });
  }

  getDomain(url) {
    try { return new URL(url).hostname; } catch { return ''; }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Уничтожить
  destroy() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}