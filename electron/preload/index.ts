import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { FileEncoding, LineEnding } from '@shared/types/file';
import type {
  ExternalFileChangeEvent,
  FolderSearchParams,
  NovaAPI,
  TerminalDataEvent,
  TerminalExitEvent,
} from '@shared/types/ipc';
import type { PersistedAppState } from '@shared/types/settings';

const novaAPI: NovaAPI = {
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string, encoding: FileEncoding, lineEnding: LineEnding) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content, encoding, lineEnding),
    exists: (paths: string[]) => ipcRenderer.invoke('fs:exists', paths),
    isDirectory: (filePath: string) => ipcRenderer.invoke('fs:isDirectory', filePath),
    watchFile: (filePath: string) => ipcRenderer.invoke('fs:watchFile', filePath),
    unwatchFile: (filePath: string) => ipcRenderer.invoke('fs:unwatchFile', filePath),
    onFileChanged: (callback: (event: ExternalFileChangeEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ExternalFileChangeEvent) =>
        callback(payload);
      ipcRenderer.on('fs:fileChanged', listener);
      return () => {
        ipcRenderer.removeListener('fs:fileChanged', listener);
      };
    },
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
    confirmUnsaved: (fileName: string) => ipcRenderer.invoke('dialog:confirmUnsaved', fileName),
  },
  search: {
    inFolder: (params: FolderSearchParams) => ipcRenderer.invoke('search:inFolder', params),
  },
  terminal: {
    create: (profile?: string, cwd?: string) => ipcRenderer.invoke('terminal:create', profile, cwd),
    write: (sessionId: string, data: string) => ipcRenderer.send('terminal:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', sessionId, cols, rows),
    kill: (sessionId: string) => ipcRenderer.send('terminal:kill', sessionId),
    onData: (callback: (event: TerminalDataEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: TerminalDataEvent) =>
        callback(payload);
      ipcRenderer.on('terminal:data', listener);
      return () => ipcRenderer.removeListener('terminal:data', listener);
    },
    onExit: (callback: (event: TerminalExitEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: TerminalExitEvent) =>
        callback(payload);
      ipcRenderer.on('terminal:exit', listener);
      return () => ipcRenderer.removeListener('terminal:exit', listener);
    },
  },
  store: {
    loadState: () => ipcRenderer.invoke('store:loadState'),
    saveState: (partial: Partial<PersistedAppState>) => ipcRenderer.invoke('store:saveState', partial),
  },
  window: {
    onBeforeClose: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('window:beforeClose', listener);
      return () => {
        ipcRenderer.removeListener('window:beforeClose', listener);
      };
    },
    confirmClose: () => {
      ipcRenderer.send('window:confirmClose');
    },
  },
  app: {
    getPlatform: () => process.platform,
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
    getPendingFiles: () => ipcRenderer.invoke('app:getPendingFiles'),
    onOpenFiles: (callback: (filePaths: string[]) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, filePaths: string[]) =>
        callback(filePaths);
      ipcRenderer.on('app:openFiles', listener);
      return () => {
        ipcRenderer.removeListener('app:openFiles', listener);
      };
    },
  },
};

contextBridge.exposeInMainWorld('novaAPI', novaAPI);
