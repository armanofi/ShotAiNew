const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true, // Crucial for enabling <webview> tags to bypass iframe limitations
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    // Load the vite dev server URL in development
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html of the app in production.
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
