const path = require('node:path');
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const window = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    autoHideMenuBar: true,
    backgroundColor: '#f3f3f3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false
    }
  });

  window.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});