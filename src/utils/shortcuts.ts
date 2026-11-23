export interface ShortcutCommandMeta {
  id: string;
  label: string;
  category: string;
}

export const SHORTCUT_COMMANDS: ShortcutCommandMeta[] = [
  { id: 'file.new', label: 'New File', category: 'File' },
  { id: 'file.open', label: 'Open File', category: 'File' },
  { id: 'file.save', label: 'Save File', category: 'File' },
  { id: 'file.saveAs', label: 'Save As', category: 'File' },
  { id: 'tab.close', label: 'Close Tab', category: 'Tabs' },
  { id: 'tab.next', label: 'Next Tab', category: 'Tabs' },
  { id: 'tab.prev', label: 'Previous Tab', category: 'Tabs' },
  { id: 'search.find', label: 'Find in File', category: 'Search' },
  { id: 'search.replace', label: 'Replace in File', category: 'Search' },
  { id: 'search.findInFolder', label: 'Find in Folder', category: 'Search' },
  { id: 'view.toggleSidebar', label: 'Toggle Sidebar', category: 'View' },
  { id: 'view.toggleTerminal', label: 'Toggle Terminal', category: 'View' },
  { id: 'view.commandPalette', label: 'Command Palette', category: 'View' },
  { id: 'view.toggleSettings', label: 'Toggle Settings', category: 'View' },
  { id: 'editor.zoomIn', label: 'Zoom In Editor Font', category: 'Editor' },
  { id: 'editor.zoomOut', label: 'Zoom Out Editor Font', category: 'Editor' },
  { id: 'editor.zoomReset', label: 'Reset Editor Font Size', category: 'Editor' },
];

export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);

  const mods = new Set<string>();
  let mainKey = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'meta' || lower === 'mod') {
      mods.add('Ctrl');
    } else if (lower === 'shift') {
      mods.add('Shift');
    } else if (lower === 'alt' || lower === 'option') {
      mods.add('Alt');
    } else {
      mainKey = part.length === 1 ? part.toUpperCase() : part;
    }
  }

  const ordered: string[] = [];
  if (mods.has('Ctrl')) ordered.push('Ctrl');
  if (mods.has('Alt')) ordered.push('Alt');
  if (mods.has('Shift')) ordered.push('Shift');
  if (mainKey) ordered.push(mainKey);
  return ordered.join('+');
}

export function eventToShortcutString(e: KeyboardEvent): string | null {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === '+') key = '=';
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();

  parts.push(key);
  return normalizeShortcut(parts.join('+'));
}

export function matchesShortcut(e: KeyboardEvent, binding: string | undefined): boolean {
  if (!binding) return false;
  const pressed = eventToShortcutString(e);
  if (!pressed) return false;

  const normalizedBinding = normalizeShortcut(binding);
  if (pressed === normalizedBinding) return true;

  // Allow Ctrl++ (Shift+=) to also match Ctrl+=
  if (normalizedBinding === 'Ctrl+=' && (pressed === 'Ctrl+Shift+=' || pressed === 'Ctrl++')) {
    return true;
  }
  return false;
}

/**
 * Returns a map of normalized shortcut -> array of conflicting command IDs (only entries with > 1 command).
 */
export function detectShortcutConflicts(
  keybindings: Record<string, string>,
): Record<string, string[]> {
  const byShortcut = new Map<string, string[]>();

  for (const [cmdId, raw] of Object.entries(keybindings)) {
    if (!raw.trim()) continue;
    const normalized = normalizeShortcut(raw);
    const list = byShortcut.get(normalized) ?? [];
    list.push(cmdId);
    byShortcut.set(normalized, list);
  }

  const conflicts: Record<string, string[]> = {};
  for (const [shortcut, cmds] of byShortcut.entries()) {
    if (cmds.length > 1) {
      conflicts[shortcut] = cmds;
    }
  }
  return conflicts;
}
