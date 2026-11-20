import type { EditorTheme, UITheme } from '@shared/types/theme';

export const UI_THEMES: UITheme[] = [
  {
    id: 'nova-dark',
    name: 'Nova Dark',
    mode: 'dark',
    colors: {
      bgPrimary: '#13151a',
      bgSecondary: '#181b22',
      bgElevated: '#20242d',
      bgSidebar: '#161920',
      bgTabActive: '#1e222b',
      bgTabInactive: '#161920',
      bgHover: '#262b36',
      border: '#2a2f3b',
      textPrimary: '#ffffff',
      textSecondary: '#e2e8f0',
      textMuted: '#94a3b8',
      accent: '#4f8ff7',
      accentHover: '#3b7de8',
      danger: '#ef5350',
      warning: '#f59e0b',
      success: '#22c55e',
    },
  },
  {
    id: 'nova-light',
    name: 'Nova Light',
    mode: 'light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f6f8',
      bgElevated: '#ffffff',
      bgSidebar: '#f0f2f5',
      bgTabActive: '#ffffff',
      bgTabInactive: '#e8eaef',
      bgHover: '#e2e5ec',
      border: '#cbd5e1',
      textPrimary: '#0f172a',
      textSecondary: '#1e293b',
      textMuted: '#475569',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      danger: '#dc2626',
      warning: '#d97706',
      success: '#16a34a',
    },
  },
];

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'nova-editor-dark',
    name: 'Nova Editor Dark',
    mode: 'dark',
    colors: {
      background: '#13151a',
      foreground: '#f8fafc',
      cursor: '#60a5fa',
      selection: '#2b4368',
      activeLine: '#1b1f28',
      gutterBg: '#13151a',
      gutterText: '#94a3b8',
      gutterActiveText: '#ffffff',
      matchingBracket: '#344c72',
    },
    syntax: {
      keyword: '#c678dd',
      string: '#98c379',
      comment: '#8590a6',
      number: '#d19a66',
      function: '#61afef',
      type: '#e5c07b',
      variable: '#e06c75',
      operator: '#56b6c2',
      property: '#d19a66',
      tag: '#e06c75',
      meta: '#abb2bf',
    },
  },
  {
    id: 'nova-editor-light',
    name: 'Nova Editor Light',
    mode: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#0f172a',
      cursor: '#2563eb',
      selection: '#dbeafe',
      activeLine: '#f3f6fc',
      gutterBg: '#ffffff',
      gutterText: '#475569',
      gutterActiveText: '#0f172a',
      matchingBracket: '#bfdbfe',
    },
    syntax: {
      keyword: '#9333ea',
      string: '#15803d',
      comment: '#4b5563',
      number: '#c2410c',
      function: '#2563eb',
      type: '#b45309',
      variable: '#be123c',
      operator: '#0891b2',
      property: '#9a3412',
      tag: '#be123c',
      meta: '#374151',
    },
  },
];

export function getUIThemeById(id: string): UITheme {
  return UI_THEMES.find((t) => t.id === id) ?? UI_THEMES[0];
}

export function getEditorThemeById(id: string): EditorTheme {
  return EDITOR_THEMES.find((t) => t.id === id) ?? EDITOR_THEMES[0];
}

export function resolveUITheme(id: string, customTheme?: UITheme): UITheme {
  if (id === 'custom' && customTheme) return customTheme;
  return getUIThemeById(id);
}

export function resolveEditorTheme(id: string, customTheme?: EditorTheme): EditorTheme {
  if (id === 'custom' && customTheme) return customTheme;
  return getEditorThemeById(id);
}
