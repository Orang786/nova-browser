const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Окно
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Закладки
  bookmarksGet: () => ipcRenderer.invoke('bookmarks-get'),
  bookmarksAdd: (bookmark) => ipcRenderer.invoke('bookmarks-add', bookmark),
  bookmarksRemove: (id) => ipcRenderer.invoke('bookmarks-remove', id),
  bookmarksIsBookmarked: (url) => ipcRenderer.invoke('bookmarks-is-bookmarked', url),

  // История
  historyGet: () => ipcRenderer.invoke('history-get'),
  historyAdd: (entry) => ipcRenderer.invoke('history-add', entry),
  historyClear: () => ipcRenderer.invoke('history-clear'),
  historySearch: (query) => ipcRenderer.invoke('history-search', query),

  // Настройки
  settingsGet: (key, defaultValue) => ipcRenderer.invoke('settings-get', key, defaultValue),
  settingsSet: (key, value) => ipcRenderer.invoke('settings-set', key, value),
  settingsGetAll: () => ipcRenderer.invoke('settings-get-all'),

  // Загрузки
  downloadsGet: () => ipcRenderer.invoke('downloads-get'),

  // Пути
  getNewtabPath: () => ipcRenderer.invoke('get-newtab-path'),
  getSettingsPath: () => ipcRenderer.invoke('get-settings-path'),
  getHistoryPath: () => ipcRenderer.invoke('get-history-path'),

  // Пароли
  passwordsGetAll: () => ipcRenderer.invoke('passwords-get-all'),
  passwordsGetPassword: (id) => ipcRenderer.invoke('passwords-get-password', id),
  passwordsAdd: (data) => ipcRenderer.invoke('passwords-add', data),
  passwordsRemove: (id) => ipcRenderer.invoke('passwords-remove', id),
  passwordsFind: (url) => ipcRenderer.invoke('passwords-find', url),
  passwordsSearch: (query) => ipcRenderer.invoke('passwords-search', query),
  passwordsGenerate: (length) => ipcRenderer.invoke('passwords-generate', length),

  // Скриншоты
  captureScreenshot: (options) => ipcRenderer.invoke('capture-screenshot', options),

  // Proxy
  proxySet: (config) => ipcRenderer.invoke('proxy-set', config),

  // Инкогнито
  openIncognito: () => ipcRenderer.send('open-incognito'),
  onSetIncognito: (callback) => ipcRenderer.on('set-incognito', (e, v) => callback(v)),

  // PiP
  openPiP: (url) => ipcRenderer.send('open-pip', url),
  closePiP: () => ipcRenderer.send('close-pip'),

  // Обновления
  updateCheck: () => ipcRenderer.send('update-check'),
  updateDownload: (url) => ipcRenderer.send('update-download', url),
  updateInstall: (path) => ipcRenderer.send('update-install', path),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (e, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (e, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (e, info) => cb(info)),
  onUpdateDownloadStarted: (cb) => ipcRenderer.on('update-download-started', () => cb()),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (e, err) => cb(err)),

  // События
  onShortcut: (cb) => ipcRenderer.on('shortcut', (e, action) => cb(action)),
  onDownloadStarted: (cb) => ipcRenderer.on('download-started', (e, d) => cb(d)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (e, d) => cb(d)),
  onDownloadComplete: (cb) => ipcRenderer.on('download-complete', (e, d) => cb(d)),
  onOpenUrlInNewTab: (cb) => ipcRenderer.on('open-url-in-new-tab', (e, url) => cb(url)),
});