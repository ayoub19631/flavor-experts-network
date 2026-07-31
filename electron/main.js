const { app, BrowserWindow, Menu, Tray, shell, ipcMain, nativeTheme, dialog } = require('electron');
const path = require('path');
const { existsSync } = require('fs');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const Store = require('electron-store');

// ─── Logging ────────────────────────────────────────────────────────────────
log.transports.file.level = 'info';
autoUpdater.logger = log;

// ─── Store for persistent settings ──────────────────────────────────────────
const store = new Store({
  defaults: {
    windowBounds: { width: 1280, height: 800 },
    isMaximized: false,
    theme: 'system',
    language: 'ar',
  },
});

// ─── Globals ─────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
const isDev = process.argv.includes('--dev');
const SITE_URL = 'https://flavorexpertsnetwork.com';
const WEB_URL = isDev ? 'http://localhost:3001' : SITE_URL;
const WEB_DIR = path.join(__dirname, 'web', 'index.html');
const ALLOWED_HOSTS = [
  'localhost',
  '127.0.0.1',
  'flavorexpertsnetwork.com',
  'www.flavorexpertsnetwork.com',
];

// ─── Security: Prevent new window creation ────────────────────────────────────
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Open external links in browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Block navigation to untrusted origins
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (!ALLOWED_HOSTS.includes(parsedUrl.hostname) && !navigationUrl.startsWith('file://')) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch { /* ignore malformed URLs */ }
  });
});

// ─── Create main window ───────────────────────────────────────────────────────
function getIconPath() {
  const ext = process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
  const p = path.join(__dirname, 'assets', ext);
  return existsSync(p) ? p : undefined;
}

function createWindow() {
  const { width, height } = store.get('windowBounds');
  const isMaximized = store.get('isMaximized');

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f172a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    icon: getIconPath(),
    show: false, // Don't show until ready
  });

  // Restore maximized state
  if (isMaximized) mainWindow.maximize();

  // Load the live platform (always up-to-date); fall back to the bundled
  // snapshot when offline.
  if (WEB_URL) {
    mainWindow.loadURL(WEB_URL).catch(() => {
      log.warn('Site unreachable, loading bundled snapshot...');
      if (existsSync(WEB_DIR)) mainWindow.loadFile(WEB_DIR);
    });
    // DevTools: open manually with Ctrl+Shift+I to avoid remote fetch errors
  } else {
    mainWindow.loadFile(WEB_DIR);
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle loading errors — fall back to local build
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription);
    // Only fall back if not already loading local file
    if (existsSync(WEB_DIR)) {
      mainWindow.loadFile(WEB_DIR);
    }
  });

  // Save window state on close
  mainWindow.on('close', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
    store.set('isMaximized', mainWindow.isMaximized());
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Set up menu
  setupMenu();
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'tray-icon.ico' : 'icon.png');
  
  try {
    tray = new Tray(iconPath);
  } catch {
    // Fallback if tray icon missing
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'فتح خبراء النكهات', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: 'لوحة التحكم', click: () => { showPage('/dashboard'); } },
    { label: 'الإعدادات', click: () => { showPage('/settings'); } },
    { type: 'separator' },
    { label: 'تحقق من التحديثات', click: () => checkForUpdates() },
    { type: 'separator' },
    { label: 'خروج', click: () => { app.isQuiting = true; app.quit(); } },
  ]);

  tray.setToolTip('خبراء النكهات');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
    } else {
      createWindow();
    }
  });
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about', label: 'عن خبراء النكهات' },
      { type: 'separator' },
      { role: 'services', label: 'الخدمات' },
      { type: 'separator' },
      { role: 'hide', label: 'إخفاء' },
      { role: 'hideOthers', label: 'إخفاء الآخرين' },
      { role: 'unhide', label: 'إظهار الكل' },
      { type: 'separator' },
      { role: 'quit', label: 'إنهاء' }
    ]}] : []),
    {
      label: 'الملف',
      submenu: [
        { label: 'الرئيسية', accelerator: 'CmdOrCtrl+H', click: () => showPage('/') },
        { label: 'لوحة التحكم', accelerator: 'CmdOrCtrl+D', click: () => showPage('/dashboard') },
        { label: 'الأسعار', click: () => showPage('/pricing') },
        { type: 'separator' },
        isMac ? { role: 'close', label: 'إغلاق' } : { role: 'quit', label: 'خروج' }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { role: 'reload', label: 'إعادة تحميل' },
        { role: 'forceReload', label: 'إعادة تحميل قسري' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'الحجم الافتراضي' },
        { role: 'zoomIn', label: 'تكبير', accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', label: 'تصغير' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'ملء الشاشة' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools', label: 'أدوات المطور' }] : [])
      ]
    },
    {
      label: 'تحرير',
      submenu: [
        { role: 'undo', label: 'تراجع' },
        { role: 'redo', label: 'إعادة' },
        { type: 'separator' },
        { role: 'cut', label: 'قص' },
        { role: 'copy', label: 'نسخ' },
        { role: 'paste', label: 'لصق' },
        { role: 'selectAll', label: 'تحديد الكل' }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        { label: 'الموقع الرسمي', click: () => shell.openExternal(SITE_URL) },
        { label: 'تواصل معنا', click: () => showPage('/contact') },
        { type: 'separator' },
        { label: 'تحقق من التحديثات', click: () => checkForUpdates() },
        { type: 'separator' },
        { label: 'عن البرنامج', click: () => showAboutDialog() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showPage(route) {
  if (!mainWindow) { createWindow(); return; }
  mainWindow.show();
  mainWindow.focus();
  if (WEB_URL) {
    mainWindow.loadURL(`${WEB_URL}${route}`).catch(() => {
      if (existsSync(WEB_DIR)) mainWindow.loadFile(WEB_DIR, { hash: route });
    });
  } else {
    mainWindow.loadFile(WEB_DIR, { hash: route });
  }
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'عن خبراء النكهات',
    message: 'خبراء النكهات',
    detail: `الإصدار: ${app.getVersion()}\n\nمنصة متخصصة في صناعة النكهات الاحترافية\n\n© 2024 Flavor Experts. جميع الحقوق محفوظة.`,
    buttons: ['موافق'],
    icon: path.join(__dirname, 'assets', 'icon.png')
  });
}

function checkForUpdates() {
  if (isDev) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'التحديثات',
      message: 'أنت في وضع التطوير',
      detail: 'لا تتوفر التحديثات التلقائية في وضع التطوير.',
      buttons: ['موافق']
    });
    return;
  }
  autoUpdater.checkForUpdatesAndNotify();
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'تحديث متاح',
    message: `يتوفر إصدار جديد ${info.version}`,
    detail: 'سيتم تحميل التحديث في الخلفية. ستُعلَم عند اكتمال التحميل.',
    buttons: ['موافق']
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'التحديث جاهز',
    message: 'تم تحميل التحديث. سيتم التثبيت عند إغلاق التطبيق.',
    buttons: ['إعادة التشغيل الآن', 'لاحقاً']
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);
ipcMain.handle('app:openExternal', (_event, url) => {
  // Validate URL before opening
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      shell.openExternal(url);
    }
  } catch { /* invalid URL, ignore */ }
});
ipcMain.handle('store:get', (_event, key) => store.get(key));
ipcMain.handle('store:set', (_event, key, value) => store.set(key, value));
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Security: Reject invalid certificate errors
  app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
    if (isDev) {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  createWindow();
  createTray();

  // Check for updates 3 seconds after launch
  if (!isDev) {
    setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { app.isQuiting = true; });

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
