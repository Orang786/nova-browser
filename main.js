// ============================================
// NOVA BROWSER — MAIN PROCESS
// ============================================

const { app, BrowserWindow, ipcMain, session, Menu, dialog, globalShortcut, nativeTheme, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ============================================
// ХРАНИЛИЩЕ ДАННЫХ
// ============================================

class DataStore {
  constructor(filename) {
    this.path = path.join(app.getPath('userData'), filename);
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.path)) {
        return JSON.parse(fs.readFileSync(this.path, 'utf-8'));
      }
    } catch (e) {
      console.error(`Ошибка загрузки ${this.path}:`, e);
    }
    return {};
  }

  save() {
    try {
      const dir = path.dirname(this.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error(`Ошибка сохранения ${this.path}:`, e);
    }
  }

  get(key, defaultValue = null) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }
}

// ============================================
// МЕНЕДЖЕР ПАРОЛЕЙ
// ============================================

class PasswordManager {
  constructor() {
    this.store = new DataStore('passwords.json');
    this.secretKey = this.getOrCreateKey();
  }

  getOrCreateKey() {
    let key = this.store.get('_encryptionKey');
    if (!key) {
      key = crypto.randomBytes(32).toString('hex');
      this.store.set('_encryptionKey', key);
    }
    return key;
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.secretKey, 'hex'), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (e) {
      return null;
    }
  }

  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.secretKey, 'hex'), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return null;
    }
  }

  getAll() {
    const passwords = this.store.get('items', []);
    return passwords.map(p => ({ ...p, password: '••••••••' }));
  }

  getPassword(id) {
    const passwords = this.store.get('items', []);
    const entry = passwords.find(p => p.id === id);
    if (entry) return this.decrypt(entry.encryptedPassword);
    return null;
  }

  add(url, username, password) {
    const passwords = this.store.get('items', []);
    const entry = {
      id: Date.now().toString(),
      url: url,
      domain: this.extractDomain(url),
      username: username,
      encryptedPassword: this.encrypt(password),
      createdAt: new Date().toISOString()
    };
    passwords.unshift(entry);
    this.store.set('items', passwords);
    return { ...entry, encryptedPassword: undefined };
  }

  remove(id) {
    let passwords = this.store.get('items', []);
    passwords = passwords.filter(p => p.id !== id);
    this.store.set('items', passwords);
    return true;
  }

  findByDomain(url) {
    const domain = this.extractDomain(url);
    const passwords = this.store.get('items', []);
    return passwords
      .filter(p => p.domain === domain)
      .map(p => ({ ...p, password: this.decrypt(p.encryptedPassword), encryptedPassword: undefined }));
  }

  search(query) {
    const passwords = this.store.get('items', []);
    const q = query.toLowerCase();
    return passwords
      .filter(p => p.domain?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q))
      .map(p => ({ ...p, password: '••••••••', encryptedPassword: undefined }));
  }

  extractDomain(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }

  generatePassword(length = 20) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    return password;
  }
}

// ============================================
// СИСТЕМА ОБНОВЛЕНИЙ (без GitHub)
// ============================================

class SimpleUpdater {
  constructor(updateUrl) {
    this.updateUrl = updateUrl;
    this.currentVersion = app.getVersion();
    this.updateInfo = null;
  }

  checkForUpdates() {
    return new Promise((resolve, reject) => {
      const url = this.updateUrl + '/update.json?t=' + Date.now();

      const client = url.startsWith('https') ? https : http;

      client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            this.updateInfo = info;

            if (this.isNewerVersion(info.version, this.currentVersion)) {
              resolve({ available: true, info });
            } else {
              resolve({ available: false, info });
            }
          } catch (e) {
            reject(new Error('Ошибка парсинга update.json'));
          }
        });
      }).on('error', (e) => {
        reject(e);
      });
    });
  }

  isNewerVersion(remote, local) {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  }

  downloadUpdate(downloadUrl, savePath) {
    return new Promise((resolve, reject) => {
      const client = downloadUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(savePath);

      const request = (url) => {
        client.get(url, (res) => {
          // Обработка редиректов
          if (res.statusCode === 301 || res.statusCode === 302) {
            request(res.headers.location);
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
          let receivedBytes = 0;

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            file.write(chunk);

            if (totalBytes > 0 && mainWindow) {
              const progress = (receivedBytes / totalBytes) * 100;
              mainWindow.webContents.send('update-progress', {
                percent: progress,
                transferred: receivedBytes,
                total: totalBytes,
                bytesPerSecond: 0
              });
              mainWindow.setProgressBar(receivedBytes / totalBytes);
            }
          });

          res.on('end', () => {
            file.end();
            if (mainWindow) mainWindow.setProgressBar(-1);
            resolve(savePath);
          });

        }).on('error', (e) => {
          file.close();
          fs.unlinkSync(savePath);
          reject(e);
        });
      };

      request(downloadUrl);
    });
  }
}

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================

let mainWindow;
let settingsStore, bookmarksStore, historyStore, downloadsStore;
let passwordManager;
let updater;

// URL где лежит update.json (ЗАМЕНИ НА СВОЙ)
const UPDATE_URL = 'https://raw.githubusercontent.com/Orang786/nova-browser/main';

// ============================================
// ГЛАВНОЕ ОКНО
// ============================================

function createWindow() {
  settingsStore = new DataStore('settings.json');
  bookmarksStore = new DataStore('bookmarks.json');
  historyStore = new DataStore('history.json');
  downloadsStore = new DataStore('downloads.json');
  passwordManager = new PasswordManager();
  extensionManager = new ExtensionManager();
  updater = new SimpleUpdater(UPDATE_URL);

  const bounds = settingsStore.get('windowBounds', { width: 1400, height: 900 });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('resize', () => {
    const b = mainWindow.getBounds();
    settingsStore.set('windowBounds', { width: b.width, height: b.height });
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  Menu.setApplicationMenu(null);
  registerShortcuts();
  setupDownloads();
}

// ============================================
// ГОРЯЧИЕ КЛАВИШИ
// ============================================

function registerShortcuts() {
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key === 't') mainWindow.webContents.send('shortcut', 'new-tab');
    if (input.control && input.key === 'w') mainWindow.webContents.send('shortcut', 'close-tab');
    if (input.control && input.key === 'Tab') mainWindow.webContents.send('shortcut', 'next-tab');
    if (input.control && input.key === 'l') mainWindow.webContents.send('shortcut', 'focus-url');
    if ((input.control && input.key === 'r') || input.key === 'F5') mainWindow.webContents.send('shortcut', 'reload');
    if (input.control && input.shift && input.key === 'I') mainWindow.webContents.send('shortcut', 'devtools');
    if (input.control && input.key === 'h') mainWindow.webContents.send('shortcut', 'history');
    if (input.control && input.key === 'd') mainWindow.webContents.send('shortcut', 'bookmark');
    if (input.key === 'F11') mainWindow.setFullScreen(!mainWindow.isFullScreen());
    if (input.control && input.shift && input.key === 'Delete') mainWindow.webContents.send('shortcut', 'clear-data');
  });
}

// ============================================
// ЗАГРУЗКИ
// ============================================

function setupDownloads() {
  session.defaultSession.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const fileSize = item.getTotalBytes();
    const downloadId = Date.now().toString();

    mainWindow.webContents.send('download-started', {
      id: downloadId, filename: fileName, totalBytes: fileSize, url: item.getURL()
    });

    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const progress = total > 0 ? (received / total) * 100 : 0;
        mainWindow.webContents.send('download-progress', {
          id: downloadId, receivedBytes: received, totalBytes: total, progress: Math.round(progress)
        });
        if (total > 0) mainWindow.setProgressBar(received / total);
      }
    });

    item.once('done', (event, state) => {
      mainWindow.setProgressBar(-1);
      mainWindow.webContents.send('download-complete', {
        id: downloadId, state: state, path: item.getSavePath()
      });
      const downloads = downloadsStore.get('items', []);
      downloads.unshift({
        id: downloadId, filename: fileName, path: item.getSavePath(),
        url: item.getURL(), size: fileSize, state: state, date: new Date().toISOString()
      });
      downloadsStore.set('items', downloads.slice(0, 200));
    });
  });
}

// ============================================
// AD BLOCKER
// ============================================

function setupAdBlocker() {
  const blockedDomains = [
    '*://*.doubleclick.net/*',
    '*://*.googlesyndication.com/*',
    '*://*.googleadservices.com/*',
    '*://*.google-analytics.com/*',
    '*://adservice.google.com/*',
    '*://*.facebook.com/tr/*',
    '*://mc.yandex.ru/*',
    '*://*.adnxs.com/*',
    '*://*.adsrvr.org/*',
    '*://*.advertising.com/*',
    '*://*.outbrain.com/*',
    '*://*.taboola.com/*',
    '*://*.criteo.com/*',
    '*://*.hotjar.com/*'
  ];

  try {
    session.defaultSession.webRequest.onBeforeRequest({ urls: blockedDomains }, (details, callback) => {
      const adblockEnabled = settingsStore?.get('adblockEnabled', true);
      callback({ cancel: adblockEnabled });
    });
    console.log('✅ AdBlocker:', blockedDomains.length, 'rules');
  } catch (e) {
    console.error('❌ AdBlocker error:', e.message);
  }
}

// ============================================
// СИСТЕМА ОБНОВЛЕНИЙ — ПРОВЕРКА
// ============================================

function setupUpdateChecker() {
  // Проверяем через 10 секунд после запуска
  setTimeout(() => checkForUpdates(), 10000);

  // Потом каждые 4 часа
  setInterval(() => checkForUpdates(), 4 * 60 * 60 * 1000);
}

async function checkForUpdates() {
  try {
    const result = await updater.checkForUpdates();
    if (result.available && mainWindow) {
      console.log('🚀 Обновление доступно:', result.info.version);
      mainWindow.webContents.send('update-available', result.info);
    } else {
      console.log('✅ Последняя версия:', updater.currentVersion);
    }
  } catch (e) {
    console.log('⚠️ Проверка обновлений:', e.message);
  }
}

// ============================================
// IPC — УПРАВЛЕНИЕ ОКНОМ
// ============================================

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized());

// ============================================
// IPC — ЗАКЛАДКИ
// ============================================

ipcMain.handle('bookmarks-get', () => bookmarksStore.get('items', []));

ipcMain.handle('bookmarks-add', (event, bookmark) => {
  const bookmarks = bookmarksStore.get('items', []);
  bookmark.id = Date.now().toString();
  bookmark.date = new Date().toISOString();
  bookmarks.unshift(bookmark);
  bookmarksStore.set('items', bookmarks);
  return bookmark;
});

ipcMain.handle('bookmarks-remove', (event, id) => {
  let bookmarks = bookmarksStore.get('items', []);
  bookmarks = bookmarks.filter(b => b.id !== id);
  bookmarksStore.set('items', bookmarks);
  return true;
});

ipcMain.handle('bookmarks-is-bookmarked', (event, url) => {
  return bookmarksStore.get('items', []).some(b => b.url === url);
});

// ============================================
// IPC — ИСТОРИЯ
// ============================================

ipcMain.handle('history-get', () => historyStore.get('items', []));

ipcMain.handle('history-add', (event, entry) => {
  const history = historyStore.get('items', []);
  entry.id = Date.now().toString();
  entry.date = new Date().toISOString();
  history.unshift(entry);
  historyStore.set('items', history.slice(0, 5000));
  return entry;
});

ipcMain.handle('history-clear', () => {
  historyStore.set('items', []);
  return true;
});

ipcMain.handle('history-search', (event, query) => {
  const history = historyStore.get('items', []);
  const q = query.toLowerCase();
  return history.filter(h => h.title?.toLowerCase().includes(q) || h.url?.toLowerCase().includes(q));
});

// ============================================
// IPC — НАСТРОЙКИ
// ============================================

ipcMain.handle('settings-get', (event, key, defaultValue) => settingsStore.get(key, defaultValue));
ipcMain.handle('settings-set', (event, key, value) => { settingsStore.set(key, value); return true; });
ipcMain.handle('settings-get-all', () => settingsStore.data);

// ============================================
// IPC — ЗАГРУЗКИ
// ============================================

ipcMain.handle('downloads-get', () => downloadsStore.get('items', []));

// ============================================
// IPC — ПУТИ
// ============================================

ipcMain.handle('get-newtab-path', () => `file://${path.join(__dirname, 'src', 'pages', 'newtab.html')}`);
ipcMain.handle('get-settings-path', () => `file://${path.join(__dirname, 'src', 'pages', 'settings.html')}`);
ipcMain.handle('get-history-path', () => `file://${path.join(__dirname, 'src', 'pages', 'history.html')}`);

// ============================================
// IPC — ПАРОЛИ
// ============================================

ipcMain.handle('passwords-get-all', () => passwordManager.getAll());
ipcMain.handle('passwords-get-password', (event, id) => passwordManager.getPassword(id));
ipcMain.handle('passwords-add', (event, { url, username, password }) => passwordManager.add(url, username, password));
ipcMain.handle('passwords-remove', (event, id) => passwordManager.remove(id));
ipcMain.handle('passwords-find', (event, url) => passwordManager.findByDomain(url));
ipcMain.handle('passwords-search', (event, query) => passwordManager.search(query));
ipcMain.handle('passwords-generate', (event, length) => passwordManager.generatePassword(length));

// ============================================
// IPC — СКРИНШОТЫ
// ============================================

ipcMain.handle('capture-screenshot', async (event, options) => {
  if (!mainWindow) return null;
  try {
    const image = await mainWindow.webContents.capturePage();
    const buffer = image.toPNG();

    if (options?.saveToFile) {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Сохранить скриншот',
        defaultPath: `screenshot-${Date.now()}.png`,
        filters: [{ name: 'PNG', extensions: ['png'] }]
      });
      if (!canceled && filePath) {
        fs.writeFileSync(filePath, buffer);
        return { saved: true, path: filePath };
      }
    }

    clipboard.writeImage(nativeImage.createFromBuffer(buffer));
    return { copied: true };
  } catch (e) {
    return null;
  }
});

// ============================================
// IPC — PROXY
// ============================================

ipcMain.handle('proxy-set', async (event, proxyConfig) => {
  try {
    if (proxyConfig?.enabled && proxyConfig?.address) {
      await session.defaultSession.setProxy({
        proxyRules: proxyConfig.address,
        proxyBypassRules: proxyConfig.bypass || '<local>'
      });
      return { success: true, message: 'Proxy: ' + proxyConfig.address };
    } else {
      await session.defaultSession.setProxy({ proxyRules: '' });
      return { success: true, message: 'Proxy выключен' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
});

// ============================================
// IPC — ИНКОГНИТО
// ============================================

let incognitoWindow = null;

ipcMain.on('open-incognito', () => {
  const incognitoSession = session.fromPartition('incognito-' + Date.now(), { cache: false });

  incognitoWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    frame: false, backgroundColor: '#0a0a12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true,
      webviewTag: true, session: incognitoSession, sandbox: false
    }
  });

  incognitoWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  incognitoWindow.webContents.once('did-finish-load', () => {
    incognitoWindow.webContents.send('set-incognito', true);
  });
  incognitoWindow.on('closed', () => { incognitoWindow = null; });
});

// ============================================
// IPC — PIP
// ============================================

let pipWindow = null;

ipcMain.on('open-pip', (event, url) => {
  if (pipWindow) pipWindow.close();

  pipWindow = new BrowserWindow({
    width: 400, height: 250, minWidth: 200, minHeight: 150,
    frame: false, alwaysOnTop: true, resizable: true,
    skipTaskbar: true, backgroundColor: '#000000',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  pipWindow.loadURL(url);

  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  pipWindow.setPosition(width - 420, height - 270);

  pipWindow.on('closed', () => { pipWindow = null; });
});

ipcMain.on('close-pip', () => {
  if (pipWindow) { pipWindow.close(); pipWindow = null; }
});

// ============================================
// IPC — ОБНОВЛЕНИЯ
// ============================================

ipcMain.on('update-check', async () => {
  await checkForUpdates();
});

ipcMain.on('update-download', async (event, downloadUrl) => {
  try {
    const savePath = path.join(app.getPath('downloads'), 'Nova-Browser-Update.exe');
    mainWindow.webContents.send('update-download-started');
    await updater.downloadUpdate(downloadUrl, savePath);
    mainWindow.webContents.send('update-downloaded', { path: savePath });
  } catch (e) {
    mainWindow.webContents.send('update-error', e.message);
  }
});

ipcMain.on('update-install', (event, installerPath) => {
  const { shell } = require('electron');
  shell.openPath(installerPath);
  setTimeout(() => app.quit(), 1000);
});

ipcMain.handle('get-app-version', () => app.getVersion());

// ============================================
// СИСТЕМА РАСШИРЕНИЙ
// ============================================

class ExtensionManager {
  constructor() {
    this.store = new DataStore('extensions.json');
    this.loadedExtensions = [];
  }

  getAll() {
    return this.store.get('items', []);
  }

  // Загрузить расширение из папки
  async loadFromFolder(extensionPath) {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: 'manifest.json не найден в папке' };
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      // Загружаем расширение в Electron
      const ext = await session.defaultSession.loadExtension(extensionPath, {
        allowFileAccess: true
      });

      // Сохраняем информацию
      const extInfo = {
        id: ext.id,
        name: manifest.name || 'Unknown',
        version: manifest.version || '1.0',
        description: manifest.description || '',
        path: extensionPath,
        enabled: true,
        installedAt: new Date().toISOString(),
        manifest_version: manifest.manifest_version || 2,
        icons: manifest.icons || {},
        type: 'unpacked'
      };

      const extensions = this.store.get('items', []);
      // Удалить старую версию если есть
      const filtered = extensions.filter(e => e.id !== ext.id);
      filtered.push(extInfo);
      this.store.set('items', filtered);
      this.loadedExtensions.push(ext);

      console.log('✅ Расширение загружено:', manifest.name);
      return { success: true, extension: extInfo };

    } catch (e) {
      console.error('❌ Ошибка загрузки расширения:', e.message);
      return { success: false, error: e.message };
    }
  }

  // Загрузить .crx файл
  async loadFromCRX(crxPath) {
    try {
      const AdmZip = require('adm-zip') || null;

      // CRX по сути ZIP с заголовком
      // Распаковываем во временную папку
      const extDir = path.join(app.getPath('userData'), 'extensions', 
        'crx_' + Date.now());

      if (!fs.existsSync(extDir)) {
        fs.mkdirSync(extDir, { recursive: true });
      }

      // Читаем CRX
      const crxBuffer = fs.readFileSync(crxPath);

      // CRX формат: magic(4) + version(4) + header_length + header + ZIP
      // Находим начало ZIP (PK signature)
      let zipStart = 0;
      for (let i = 0; i < Math.min(crxBuffer.length, 1000); i++) {
        if (crxBuffer[i] === 0x50 && crxBuffer[i + 1] === 0x4B &&
            crxBuffer[i + 2] === 0x03 && crxBuffer[i + 3] === 0x04) {
          zipStart = i;
          break;
        }
      }

      const zipBuffer = crxBuffer.slice(zipStart);

      // Распаковываем
      const zipPath = path.join(extDir, 'extension.zip');
      fs.writeFileSync(zipPath, zipBuffer);

      // Используем встроенную распаковку
      await this.unzip(zipPath, extDir);

      // Удаляем zip
      fs.unlinkSync(zipPath);

      // Загружаем как папку
      return await this.loadFromFolder(extDir);

    } catch (e) {
      return { success: false, error: 'Ошибка CRX: ' + e.message };
    }
  }

  // Простая распаковка ZIP
  unzip(zipPath, destDir) {
    return new Promise((resolve, reject) => {
      const { execFile } = require('child_process');

      // Используем PowerShell для распаковки
      const ps = `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`;

      execFile('powershell', ['-Command', ps], (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  // Скачать расширение из Chrome Web Store
  async downloadFromStore(extensionId) {
    return new Promise((resolve, reject) => {
      const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;

      const savePath = path.join(app.getPath('userData'), 'extensions', 
        `${extensionId}.crx`);
      const saveDir = path.dirname(savePath);

      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      const file = fs.createWriteStream(savePath);

      const download = (url) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
          // Редирект
          if (res.statusCode === 301 || res.statusCode === 302) {
            download(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
          let receivedBytes = 0;

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            file.write(chunk);

            if (totalBytes > 0 && mainWindow) {
              mainWindow.webContents.send('extension-download-progress', {
                percent: (receivedBytes / totalBytes) * 100,
                received: receivedBytes,
                total: totalBytes
              });
            }
          });

          res.on('end', () => {
            file.end();
            resolve(savePath);
          });

        }).on('error', (e) => {
          file.close();
          reject(e);
        });
      };

      download(downloadUrl);
    });
  }

  // Установить из Chrome Web Store по ID
  async installFromStore(extensionId) {
    try {
      // Скачиваем CRX
      const crxPath = await this.downloadFromStore(extensionId);

      // Устанавливаем
      const result = await this.loadFromCRX(crxPath);

      // Удаляем CRX
      try { fs.unlinkSync(crxPath); } catch(e) {}

      return result;
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Удалить расширение
  async remove(extensionId) {
    try {
      await session.defaultSession.removeExtension(extensionId);

      let extensions = this.store.get('items', []);
      const ext = extensions.find(e => e.id === extensionId);

      // Удалить папку если это CRX
      if (ext?.type === 'crx' && ext?.path) {
        try { fs.rmSync(ext.path, { recursive: true, force: true }); } catch(e) {}
      }

      extensions = extensions.filter(e => e.id !== extensionId);
      this.store.set('items', extensions);

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Включить/выключить
  async toggle(extensionId, enabled) {
    const extensions = this.store.get('items', []);
    const ext = extensions.find(e => e.id === extensionId);
    if (!ext) return { success: false };

    if (enabled) {
      await session.defaultSession.loadExtension(ext.path, { allowFileAccess: true });
    } else {
      await session.defaultSession.removeExtension(extensionId);
    }

    ext.enabled = enabled;
    this.store.set('items', extensions);
    return { success: true };
  }

  // Загрузить все сохранённые расширения при старте
  async loadSaved() {
    const extensions = this.store.get('items', []);
    let loaded = 0;

    for (const ext of extensions) {
      if (ext.enabled && ext.path && fs.existsSync(ext.path)) {
        try {
          await session.defaultSession.loadExtension(ext.path, {
            allowFileAccess: true
          });
          loaded++;
        } catch (e) {
          console.warn(`⚠️ Не удалось загрузить ${ext.name}:`, e.message);
        }
      }
    }

    console.log(`🧩 Загружено расширений: ${loaded}/${extensions.length}`);
  }
}

let extensionManager;

// ============================================
// IPC — РАСШИРЕНИЯ
// ============================================

ipcMain.handle('extensions-get-all', () => {
  return extensionManager.getAll();
});

ipcMain.handle('extensions-load-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку расширения',
    properties: ['openDirectory'],
    buttonLabel: 'Загрузить расширение'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'Отменено' };
  }

  return await extensionManager.loadFromFolder(result.filePaths[0]);
});

ipcMain.handle('extensions-load-crx', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите .crx файл',
    filters: [
      { name: 'Chrome Extension', extensions: ['crx'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile'],
    buttonLabel: 'Установить'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'Отменено' };
  }

  return await extensionManager.loadFromCRX(result.filePaths[0]);
});

ipcMain.handle('extensions-install-from-store', async (event, extensionId) => {
  return await extensionManager.installFromStore(extensionId);
});

ipcMain.handle('extensions-remove', async (event, extensionId) => {
  return await extensionManager.remove(extensionId);
});

ipcMain.handle('extensions-toggle', async (event, extensionId, enabled) => {
  return await extensionManager.toggle(extensionId, enabled);
});

// ============================================
// ЗАПУСК
// ============================================

app.whenReady().then(async () => {
  createWindow();
  setupAdBlocker();
  setupUpdateChecker();

  // Загрузить сохранённые расширения
  await extensionManager.loadSaved();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      mainWindow.webContents.send('open-url-in-new-tab', url);
      return { action: 'deny' };
    });
  }
});