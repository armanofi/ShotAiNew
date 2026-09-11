const { app, BrowserWindow, session } = require('electron');
const path = require('path');

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

  // When main window is ready to show, close splash and show main
  mainWindow.once('ready-to-show', () => {
    // Add an artificial small delay so the user sees the splash screen
    setTimeout(() => {
      splash.destroy();
      mainWindow.show();
    }, 1500);
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
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
