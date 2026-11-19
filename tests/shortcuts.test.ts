import { describe, expect, it } from 'vitest';
import { detectShortcutConflicts, normalizeShortcut } from '../src/utils/shortcuts';

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
});
