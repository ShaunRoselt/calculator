const path = require('node:path');
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');

const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'assets', 'icons', 'app-icon-dark.ico')
  : path.join(__dirname, '..', 'assets', 'icons', 'app-icon-4096.png');

const isFlatpak = Boolean(process.env.FLATPAK_ID);
const minimumWindowWidth = 320;
const minimumWindowHeight = 520;

if (process.platform === 'linux') {
  app.setDesktopName('io.github.ShaunRoselt.Calculator.desktop');
}

app.setName('Roselt Calculator');

function createMainWindow() {
  const windowWidth = isFlatpak ? 320 : 420;
  const windowHeight = isFlatpak ? 620 : 900;
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  const x = primaryWorkArea.x + Math.max(0, Math.round((primaryWorkArea.width - windowWidth) / 2));
  const y = primaryWorkArea.y + Math.max(0, Math.round((primaryWorkArea.height - windowHeight) / 2));

  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: minimumWindowWidth,
    minHeight: minimumWindowHeight,
    x,
    y,
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

  const sendFullscreenState = () => {
    mainWindow.webContents.send('app:fullscreen-changed', mainWindow.isFullScreen());
  };

  mainWindow.on('enter-full-screen', sendFullscreenState);
  mainWindow.on('leave-full-screen', sendFullscreenState);
  mainWindow.webContents.once('did-finish-load', sendFullscreenState);
}

ipcMain.handle('app:get-fullscreen', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window?.isFullScreen() ?? false;
});

ipcMain.handle('app:set-fullscreen', (event, enabled) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) {
    return false;
  }

  window.setFullScreen(Boolean(enabled));
  return window.isFullScreen();
});

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