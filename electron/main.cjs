const path = require('node:path');
const { app, BrowserWindow, screen, shell } = require('electron');

const appIconPath = process.platform === 'win32'
  ? path.join(__dirname, '..', 'assets', 'icons', 'app-icon-dark.ico')
  : path.join(__dirname, '..', 'assets', 'icons', 'app-icon-4096.png');

const isFlatpak = Boolean(process.env.FLATPAK_ID);

if (process.platform === 'linux') {
  app.setDesktopName('io.github.ShaunRoselt.Calculator.desktop');
}

function createMainWindow() {
  const windowWidth = 420;
  const windowHeight = isFlatpak ? 780 : 900;
  const primaryWorkArea = screen.getPrimaryDisplay().workArea;
  const x = primaryWorkArea.x + Math.max(0, Math.round((primaryWorkArea.width - windowWidth) / 2));
  const y = primaryWorkArea.y + Math.max(0, Math.round((primaryWorkArea.height - windowHeight) / 2));

  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 420,
    minHeight: 700,
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