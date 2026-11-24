import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYBINDINGS } from '../shared/types/settings';
import {
  detectShortcutConflicts,
  getLocalizedShortcutMeta,
  normalizeShortcut,
  SHORTCUT_COMMANDS,
} from '../src/utils/shortcuts';

describe('shortcuts', () => {
  it('normalizes modifier ordering and casing', () => {
    expect(normalizeShortcut('shift+ctrl+s')).toBe('Ctrl+Shift+S');
    expect(normalizeShortcut('cmd+o')).toBe('Ctrl+O');
    expect(normalizeShortcut('alt+ArrowRight')).toBe('Alt+ArrowRight');
    expect(normalizeShortcut('alt+ArrowLeft')).toBe('Alt+ArrowLeft');
  });

  it('detects shortcut conflicts across commands', () => {
    const conflicts = detectShortcutConflicts({
      'file.open': 'Ctrl+O',
      'file.save': 'ctrl+s',
      'search.find': 'Ctrl+S',
    });

    expect(Object.keys(conflicts)).toEqual(['Ctrl+S']);
    expect(conflicts['Ctrl+S']).toEqual(['file.save', 'search.find']);
  });

  it('defaults Command Palette to Ctrl+P and defines zoom shortcuts', () => {
    expect(DEFAULT_KEYBINDINGS['view.commandPalette']).toBe('Ctrl+P');
    expect(DEFAULT_KEYBINDINGS['view.toggleTerminal']).toBe('Ctrl+T');
    expect(DEFAULT_KEYBINDINGS['editor.zoomIn']).toBe('Ctrl+=');
    expect(DEFAULT_KEYBINDINGS['editor.zoomOut']).toBe('Ctrl+-');
    expect(DEFAULT_KEYBINDINGS['editor.zoomReset']).toBe('Ctrl+0');
    expect(DEFAULT_KEYBINDINGS['ui.zoomIn']).toBe('Ctrl+Shift+=');
    expect(DEFAULT_KEYBINDINGS['ui.zoomOut']).toBe('Ctrl+Shift+-');
    expect(DEFAULT_KEYBINDINGS['ui.zoomReset']).toBe('Ctrl+Shift+0');

    const commandIds = SHORTCUT_COMMANDS.map((c) => c.id);
    expect(commandIds).toContain('view.commandPalette');
    expect(commandIds).toContain('editor.zoomIn');
    expect(commandIds).toContain('editor.zoomOut');
    expect(commandIds).toContain('editor.zoomReset');
    expect(commandIds).toContain('ui.zoomIn');
    expect(commandIds).toContain('ui.zoomOut');
    expect(commandIds).toContain('ui.zoomReset');
  });

  it('localizes shortcut metadata for zh-TW and en', () => {
    const zoomInCmd = SHORTCUT_COMMANDS.find((c) => c.id === 'editor.zoomIn')!;
    const uiZoomInCmd = SHORTCUT_COMMANDS.find((c) => c.id === 'ui.zoomIn')!;

    const zhMeta = getLocalizedShortcutMeta(zoomInCmd, 'zh-TW');
    expect(zhMeta.label).toBe('放大編輯器字體');
    expect(zhMeta.category).toBe('編輯器');

    const zhUIMeta = getLocalizedShortcutMeta(uiZoomInCmd, 'zh-TW');
    expect(zhUIMeta.label).toBe('放大應用程式介面比例');
    expect(zhUIMeta.category).toBe('檢視');

    const enMeta = getLocalizedShortcutMeta(zoomInCmd, 'en');
    expect(enMeta.label).toBe('Zoom In Editor Font');
    expect(enMeta.category).toBe('Editor');
  });
});
