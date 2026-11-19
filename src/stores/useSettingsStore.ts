import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS, type AppLocale, type AppSettings, type EditorSettings, type QuickCommand, type UISettings } from '@shared/types/settings';
import type { EditorTheme, UITheme } from '@shared/types/theme';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { resolveUITheme } from '@/themes/presets';

interface SettingsState {
  settings: AppSettings;
  initialized: boolean;
  hydrate: (settings: AppSettings) => void;
  setLocale: (locale: AppLocale) => void;
  updateEditor: (patch: Partial<EditorSettings>) => void;
  updateUI: (patch: Partial<UISettings>) => void;
  setUITheme: (themeId: string) => void;
  setEditorTheme: (themeId: string) => void;
  setCustomUITheme: (theme: UITheme) => void;
  setCustomEditorTheme: (theme: EditorTheme) => void;
  setKeybinding: (commandId: string, shortcut: string) => void;
  resetKeybindings: () => void;
  addQuickCommand: (label: string, command: string) => void;
  removeQuickCommand: (id: string) => void;
  toggleDarkLight: () => void;
  zoomEditorFont: (delta: number) => void;
  resetEditorFont: () => void;
  zoomUIScale: (delta: number) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistSettings(settings: AppSettings): void {
  if (!hasNovaAPI()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void getNovaAPI().store.saveState({ settings });
  }, 200);
}

export function applyUIThemeAndScale(settings: AppSettings): void {
  const root = document.documentElement;
  const theme = resolveUITheme(settings.uiThemeId, settings.customUITheme);
  const c = theme.colors;

  root.style.setProperty('--ui-scale', String(settings.ui.scale));
  root.style.setProperty('--ui-font-size', `${settings.ui.fontSize}px`);
  root.style.setProperty('--tab-height', `${settings.ui.tabHeight}px`);

  root.style.setProperty('--bg-primary', c.bgPrimary);
  root.style.setProperty('--bg-secondary', c.bgSecondary);
  root.style.setProperty('--bg-elevated', c.bgElevated);
  root.style.setProperty('--bg-sidebar', c.bgSidebar);
  root.style.setProperty('--bg-tab-active', c.bgTabActive);
  root.style.setProperty('--bg-tab-inactive', c.bgTabInactive);
  root.style.setProperty('--bg-hover', c.bgHover);
  root.style.setProperty('--border-color', c.border);
  root.style.setProperty('--text-primary', c.textPrimary);
  root.style.setProperty('--text-secondary', c.textSecondary);
  root.style.setProperty('--text-muted', c.textMuted);
  root.style.setProperty('--accent-color', c.accent);
  root.style.setProperty('--accent-hover', c.accentHover);
  root.style.setProperty('--danger-color', c.danger);
  root.style.setProperty('--warning-color', c.warning);
  root.style.setProperty('--success-color', c.success);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  initialized: false,

  hydrate: (settings) => {
    applyUIThemeAndScale(settings);
    set({ settings, initialized: true });
  },

  setLocale: (locale) => {
    const next: AppSettings = { ...get().settings, locale };
    set({ settings: next });
    persistSettings(next);
  },

  updateEditor: (patch) => {
    const next: AppSettings = {
      ...get().settings,
      editor: { ...get().settings.editor, ...patch },
    };
    set({ settings: next });
    persistSettings(next);
  },

  updateUI: (patch) => {
    const next: AppSettings = {
      ...get().settings,
      ui: { ...get().settings.ui, ...patch },
    };
    applyUIThemeAndScale(next);
    set({ settings: next });
    persistSettings(next);
  },

  setUITheme: (uiThemeId) => {
    const next: AppSettings = { ...get().settings, uiThemeId };
    applyUIThemeAndScale(next);
    set({ settings: next });
    persistSettings(next);
  },

  setEditorTheme: (editorThemeId) => {
    const next: AppSettings = { ...get().settings, editorThemeId };
    set({ settings: next });
    persistSettings(next);
  },

  setCustomUITheme: (customUITheme) => {
    const next: AppSettings = { ...get().settings, uiThemeId: 'custom', customUITheme };
    applyUIThemeAndScale(next);
    set({ settings: next });
    persistSettings(next);
  },

  setCustomEditorTheme: (customEditorTheme) => {
    const next: AppSettings = {
      ...get().settings,
      editorThemeId: 'custom',
      customEditorTheme,
    };
    set({ settings: next });
    persistSettings(next);
  },

  setKeybinding: (commandId, shortcut) => {
    const current = get().settings;
    const next: AppSettings = {
      ...current,
      keybindings: {
        ...current.keybindings,
        [commandId]: shortcut,
      },
    };
    set({ settings: next });
    persistSettings(next);
  },

  resetKeybindings: () => {
    const current = get().settings;
    const next: AppSettings = {
      ...current,
      keybindings: { ...DEFAULT_APP_SETTINGS.keybindings },
    };
    set({ settings: next });
    persistSettings(next);
  },

  addQuickCommand: (label, command) => {
    const current = get().settings;
    const nextCmd: QuickCommand = {
      id: crypto.randomUUID(),
      label: label.trim() || command.trim(),
      command: command.trim(),
    };
    const next: AppSettings = {
      ...current,
      quickCommands: [...(current.quickCommands ?? []), nextCmd],
    };
    set({ settings: next });
    persistSettings(next);
  },

  removeQuickCommand: (id) => {
    const current = get().settings;
    const next: AppSettings = {
      ...current,
      quickCommands: (current.quickCommands ?? []).filter((c) => c.id !== id),
    };
    set({ settings: next });
    persistSettings(next);
  },

  toggleDarkLight: () => {
    const current = get().settings;
    const isCurrentlyDark = resolveUITheme(current.uiThemeId, current.customUITheme).mode === 'dark';
    const next: AppSettings = {
      ...current,
      uiThemeId: isCurrentlyDark ? 'nova-light' : 'nova-dark',
      editorThemeId: isCurrentlyDark ? 'nova-editor-light' : 'nova-editor-dark',
    };
    applyUIThemeAndScale(next);
    set({ settings: next });
    persistSettings(next);
  },

  zoomEditorFont: (delta) => {
    const currentSize = get().settings.editor.fontSize;
    const nextSize = Math.min(36, Math.max(8, currentSize + delta));
    get().updateEditor({ fontSize: nextSize });
  },

  resetEditorFont: () => {
    get().updateEditor({ fontSize: DEFAULT_APP_SETTINGS.editor.fontSize });
  },

  zoomUIScale: (delta) => {
    const currentScale = get().settings.ui.scale;
    const raw = Math.min(2.0, Math.max(0.85, currentScale + delta));
    const nextScale = Math.round(raw * 100) / 100;
    get().updateUI({ scale: nextScale });
  },
}));
