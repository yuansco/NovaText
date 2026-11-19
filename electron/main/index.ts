import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { disposeAllWatchers } from './file-system/fileWatcher';
import { registerIpcHandlers } from './ipc/registerHandlers';
import { loadPersistedState, savePersistedState } from './persistence/stateStore';
import { disposeAllTerminals } from './terminal/ptyManager';

let mainWindow: BrowserWindow | null = null;
let forceClose = false;

async function createMainWindow(): Promise<void> {
  const persisted = await loadPersistedState();
  const bounds = persisted.windowBounds ?? { width: 1280, height: 820 };

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: 'NovaText',
    backgroundColor: '#13151a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (bounds.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Prevent navigation to external URLs inside the editor window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (forceClose || !mainWindow) {
      return;
    }

    const currentBounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    void savePersistedState({
      windowBounds: {
        width: currentBounds.width,
        height: currentBounds.height,
        x: currentBounds.x,
        y: currentBounds.y,
        isMaximized,
      },
    });

    event.preventDefault();
    mainWindow.webContents.send('window:beforeClose');
  });

  mainWindow.on('closed', () => {
    disposeAllWatchers();
    disposeAllTerminals();
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers(
    () => mainWindow,
    () => {
      forceClose = true;
      mainWindow?.close();
    },
  );

  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
