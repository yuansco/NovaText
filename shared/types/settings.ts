import type { PinnedFile, RecentFile } from './sidebar';
import type { EditorTheme, UITheme } from './theme';

export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
  tabSize: number;
  wordWrap: boolean;
}

export interface UISettings {
  scale: number;
  fontSize: number;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  tabHeight: number;
  iconSize: number;
}

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

export type AppLocale = 'en' | 'zh-TW';

export interface QuickCommand {
  id: string;
  label: string;
  command: string;
}

export interface AppSettings {
  locale: AppLocale;
  editor: EditorSettings;
  ui: UISettings;
  uiThemeId: string;
  editorThemeId: string;
  customUITheme?: UITheme;
  customEditorTheme?: EditorTheme;
  keybindings: Record<string, string>;
  quickCommands: QuickCommand[];
}

export interface PersistedAppState {
  settings: AppSettings;
  pinnedFiles: PinnedFile[];
  recentFiles: RecentFile[];
  windowBounds?: WindowBounds;
  openFilePaths?: string[];
  activeFilePath?: string | null;
  workspacePath?: string | null;
}

export const DEFAULT_QUICK_COMMANDS: QuickCommand[] = [
  { id: 'cmd-git-status', label: 'git status', command: 'git status' },
  { id: 'cmd-ls', label: 'ls -la', command: 'ls -la' },
  { id: 'cmd-pwd', label: 'pwd', command: 'pwd' },
];

export const DEFAULT_KEYBINDINGS: Record<string, string> = {
  'file.new': 'Ctrl+N',
  'file.open': 'Ctrl+O',
  'file.save': 'Ctrl+S',
  'file.saveAs': 'Ctrl+Shift+S',
  'tab.close': 'Ctrl+W',
  'tab.next': 'Alt+ArrowRight',
  'tab.prev': 'Alt+ArrowLeft',
  'search.find': 'Ctrl+F',
  'search.replace': 'Ctrl+H',
  'search.findInFolder': 'Ctrl+Shift+F',
  'view.toggleSidebar': 'Ctrl+B',
  'view.toggleTerminal': 'Ctrl+`',
  'view.commandPalette': 'Ctrl+Shift+P',
  'editor.zoomIn': 'Ctrl+=',
  'editor.zoomOut': 'Ctrl+-',
  'editor.zoomReset': 'Ctrl+0',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'en',
  editor: {
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace",
    lineHeight: 1.55,
    letterSpacing: 0,
    tabSize: 2,
    wordWrap: false,
  },
  ui: {
    scale: 1,
    fontSize: 13,
    sidebarWidth: 260,
    sidebarCollapsed: false,
    tabHeight: 34,
    iconSize: 15,
  },
  uiThemeId: 'nova-dark',
  editorThemeId: 'nova-editor-dark',
  keybindings: { ...DEFAULT_KEYBINDINGS },
  quickCommands: [...DEFAULT_QUICK_COMMANDS],
};
