import type { FileEncoding, FileReadResult, FileWriteResult, LineEnding } from './file';
import type { PersistedAppState } from './settings';

export type UnsavedDialogChoice = 'save' | 'discard' | 'cancel';

export interface ExternalFileChangeEvent {
  filePath: string;
  type: 'change' | 'unlink';
}

export interface FolderSearchParams {
  rootDir: string;
  query: string;
  caseSensitive: boolean;
  useRegex: boolean;
  includeExtensions: string[];
  excludePatterns: string[];
  maxResults?: number;
}

export interface FolderSearchMatch {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  preview: string;
  fromOffset: number;
  toOffset: number;
}

export interface TerminalCreateResult {
  sessionId: string;
  title: string;
  shell: string;
  cwd: string;
}

export interface TerminalDataEvent {
  sessionId: string;
  data: string;
}

export interface TerminalExitEvent {
  sessionId: string;
  exitCode: number | null;
}

export interface NovaAPI {
  fs: {
    readFile: (filePath: string) => Promise<FileReadResult>;
    writeFile: (
      filePath: string,
      content: string,
      encoding: FileEncoding,
      lineEnding: LineEnding,
    ) => Promise<FileWriteResult>;
    exists: (paths: string[]) => Promise<Record<string, boolean>>;
    isDirectory: (filePath: string) => Promise<boolean>;
    watchFile: (filePath: string) => Promise<void>;
    unwatchFile: (filePath: string) => Promise<void>;
    onFileChanged: (callback: (event: ExternalFileChangeEvent) => void) => () => void;
  };
  dialog: {
    openFile: () => Promise<string[]>;
    openDirectory: () => Promise<string | null>;
    saveFile: (defaultPath?: string) => Promise<string | null>;
    confirmUnsaved: (fileName: string) => Promise<UnsavedDialogChoice>;
  };
  search: {
    inFolder: (params: FolderSearchParams) => Promise<FolderSearchMatch[]>;
  };
  terminal: {
    create: (profile?: string, cwd?: string) => Promise<TerminalCreateResult>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    kill: (sessionId: string) => void;
    onData: (callback: (event: TerminalDataEvent) => void) => () => void;
    onExit: (callback: (event: TerminalExitEvent) => void) => () => void;
  };
  store: {
    loadState: () => Promise<PersistedAppState>;
    saveState: (partial: Partial<PersistedAppState>) => Promise<void>;
  };
  window: {
    onBeforeClose: (callback: () => void) => () => void;
    confirmClose: () => void;
  };
  app: {
    getPlatform: () => NodeJS.Platform;
    getPathForFile: (file: File) => string;
  };
}
