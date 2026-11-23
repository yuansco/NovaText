import fs from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import type { FileEncoding, LineEnding } from '@shared/types/file';
import type { FolderSearchParams, UnsavedDialogChoice } from '@shared/types/ipc';
import type { PersistedAppState } from '@shared/types/settings';
import { checkFilesExist, readFileWithMetadata, writeFileAtomic } from '../file-system/fileService';
import { unwatchFile, watchFile } from '../file-system/fileWatcher';
import { loadPersistedState, savePersistedState } from '../persistence/stateStore';
import { searchInDirectory } from '../search/folderSearch';
import {
  createTerminalSession,
  killTerminalSession,
  resizeTerminalSession,
  writeToTerminalSession,
} from '../terminal/ptyManager';

export function registerIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  onConfirmClose: () => void,
  getPendingFiles: () => string[],
): void {
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Invalid file path');
    }
    return readFileWithMetadata(filePath);
  });

  ipcMain.handle(
    'fs:writeFile',
    async (
      _event,
      filePath: string,
      content: string,
      encoding: FileEncoding,
      lineEnding: LineEnding,
    ) => {
      if (typeof filePath !== 'string' || !filePath.trim()) {
        throw new Error('Invalid file path');
      }
      return writeFileAtomic(filePath, content, encoding, lineEnding);
    },
  );

  ipcMain.handle('fs:exists', async (_event, paths: string[]) => {
    if (!Array.isArray(paths)) {
      return {};
    }
    return checkFilesExist(paths.filter((p): p is string => typeof p === 'string'));
  });

  ipcMain.handle('fs:isDirectory', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath.trim()) return false;
    try {
      const stat = await fs.stat(filePath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:watchFile', async (_event, filePath: string) => {
    if (typeof filePath === 'string' && filePath.trim()) {
      watchFile(filePath, getMainWindow);
    }
  });

  ipcMain.handle('fs:unwatchFile', async (_event, filePath: string) => {
    if (typeof filePath === 'string' && filePath.trim()) {
      unwatchFile(filePath);
    }
  });

  ipcMain.handle('dialog:openFile', async () => {
    const win = getMainWindow();
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile', 'multiSelections'],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const win = getMainWindow();
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory'],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle('search:inFolder', async (_event, params: FolderSearchParams) => {
    return searchInDirectory(params);
  });

  ipcMain.handle('terminal:create', async (_event, profile?: string, cwd?: string) => {
    return createTerminalSession(getMainWindow, profile, cwd);
  });

  ipcMain.on('terminal:write', (_event, sessionId: string, data: string) => {
    writeToTerminalSession(sessionId, data);
  });

  ipcMain.on('terminal:resize', (_event, sessionId: string, cols: number, rows: number) => {
    resizeTerminalSession(sessionId, cols, rows);
  });

  ipcMain.on('terminal:kill', (_event, sessionId: string) => {
    killTerminalSession(sessionId);
  });

  ipcMain.handle('dialog:saveFile', async (_event, defaultPath?: string) => {
    const win = getMainWindow();
    const options: Electron.SaveDialogOptions = {
      defaultPath,
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    return result.canceled || !result.filePath ? null : result.filePath;
  });

  ipcMain.handle('dialog:confirmUnsaved', async (_event, fileName: string): Promise<UnsavedDialogChoice> => {
    const win = getMainWindow();
    const options: Electron.MessageBoxOptions = {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved Changes',
      message: `Do you want to save the changes you made to ${fileName}?`,
      detail: "Your changes will be lost if you don't save them.",
    };
    const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
    if (result.response === 0) return 'save';
    if (result.response === 1) return 'discard';
    return 'cancel';
  });

  ipcMain.handle('store:loadState', async () => {
    return loadPersistedState();
  });

  ipcMain.handle('store:saveState', async (_event, partial: Partial<PersistedAppState>) => {
    await savePersistedState(partial);
  });

  ipcMain.on('window:confirmClose', () => {
    onConfirmClose();
  });

  ipcMain.handle('app:getPendingFiles', () => {
    return getPendingFiles();
  });

  ipcMain.handle('app:showItemInFolder', (_event, filePath: string) => {
    if (typeof filePath === 'string' && filePath.trim()) {
      shell.showItemInFolder(filePath);
    }
  });
}
