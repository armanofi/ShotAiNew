const { app, BrowserWindow, session, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create splash screen
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
  splash.center();

  // Create main window (hidden initially)
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: false, // Allow fetch to external URLs (Vercel API)
    },
    autoHideMenuBar: true,
  });

  // Allow all permission requests (microphone, camera, notifications etc)
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  // ──────────────────────────────────────────────────────────────
  // RIGHT-CLICK CONTEXT MENU
  // ──────────────────────────────────────────────────────────────
  app.on('web-contents-created', (e, contents) => {
    contents.on('context-menu', (event, params) => {
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Potong (Cut)', role: 'cut', enabled: params.editFlags.canCut },
        { label: 'Salin (Copy)', role: 'copy', enabled: params.editFlags.canCopy },
        { label: 'Tempel (Paste)', role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { label: 'Pilih Semua', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Muat Ulang', role: 'reload' },
        { label: 'Inspect Element', click: () => { contents.inspectElement(params.x, params.y); } },
      ]);
      contextMenu.popup();
    });
  });

  // When main window is ready to show, close splash and show main
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splash.destroy();
      mainWindow.show();

      // ──────────────────────────────────────────────────────────────
      // AUTO-UPDATE: Check for updates after window is shown
      // ──────────────────────────────────────────────────────────────
      if (!isDev) {
        setupAutoUpdater(mainWindow);
      }
    }, 1500);
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Open AI Studio in a real popup window (fixes black screen)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('open-ai-studio-window', (event, url) => {
    const studioWin = new BrowserWindow({
      width: 1100,
      height: 750,
      title: 'Google AI Studio',
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // Use a named partition so Google login session is remembered
        partition: 'persist:aistudio',
      }
    });

    studioWin.loadURL(url || 'https://aistudio.google.com/app/apikey');
    studioWin.setMenuBarVisibility(false);

    return true;
  });

  // ──────────────────────────────────────────────────────────────
  // IPC: Check for updates manually (from renderer)
  // ──────────────────────────────────────────────────────────────
  ipcMain.handle('check-for-updates', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
    return true;
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ──────────────────────────────────────────────────────────────
// AUTO-UPDATE SETUP
// ──────────────────────────────────────────────────────────────
function setupAutoUpdater(mainWindow) {
  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdate] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdate] Update available:', info.version);
    // Notify renderer that update is downloading
    mainWindow.webContents.send('update-status', {
      status: 'downloading',
      version: info.version,
      message: `Versi baru ${info.version} ditemukan! Sedang mengunduh...`
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdate] App is up to date.');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdate] Download progress: ${Math.round(progress.percent)}%`);
    mainWindow.webContents.send('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      message: `Mengunduh update: ${Math.round(progress.percent)}%`
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdate] Update downloaded:', info.version);
    mainWindow.webContents.send('update-status', {
      status: 'ready',
      version: info.version,
      message: `Update ${info.version} siap diinstal!`
    });

    // Show dialog to user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Tersedia',
      message: `ShotAi versi ${info.version} sudah diunduh.`,
      detail: 'Aplikasi akan restart untuk menginstal update. Klik OK untuk restart sekarang.',
      buttons: ['Restart Sekarang', 'Nanti'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[AutoUpdate] Error:', error.message);
  });

  // Check for updates immediately, then every 30 minutes
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 30 * 60 * 1000);
}

app.whenReady().then(() => {
  // Allow fetch to all external URLs (needed for Vercel API license check)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:"]
      }
    });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
