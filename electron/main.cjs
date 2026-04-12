const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'assets', 'icons', 'app-icon-dark.ico')
  : path.join(__dirname, '..', 'assets', 'pwa', 'icon-512.png');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 420,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#1f2025',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'app.html'), {
    query: { page: 'standard' },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});