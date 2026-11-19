import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_APP_SETTINGS, type PersistedAppState } from '@shared/types/settings';

const STATE_FILENAME = 'novatext-state.json';

function getStateFilePath(): string {
  return path.join(app.getPath('userData'), STATE_FILENAME);
}

export function getDefaultPersistedState(): PersistedAppState {
  return {
    settings: {
      ...DEFAULT_APP_SETTINGS,
      editor: { ...DEFAULT_APP_SETTINGS.editor },
      ui: { ...DEFAULT_APP_SETTINGS.ui },
    },
    pinnedFiles: [],
    recentFiles: [],
    windowBounds: { width: 1280, height: 820 },
    openFilePaths: [],
    activeFilePath: null,
  };
}

export async function loadPersistedState(): Promise<PersistedAppState> {
  const filePath = getStateFilePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    const defaults = getDefaultPersistedState();
    return {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
        editor: {
          ...defaults.settings.editor,
          ...(parsed.settings?.editor ?? {}),
        },
        ui: {
          ...defaults.settings.ui,
          ...(parsed.settings?.ui ?? {}),
        },
        keybindings: {
          ...defaults.settings.keybindings,
          ...(parsed.settings?.keybindings ?? {}),
        },
        quickCommands: Array.isArray(parsed.settings?.quickCommands)
          ? parsed.settings.quickCommands
          : defaults.settings.quickCommands,
      },
      pinnedFiles: Array.isArray(parsed.pinnedFiles) ? parsed.pinnedFiles : [],
      recentFiles: Array.isArray(parsed.recentFiles) ? parsed.recentFiles : [],
      openFilePaths: Array.isArray(parsed.openFilePaths) ? parsed.openFilePaths : [],
    };
  } catch {
    return getDefaultPersistedState();
  }
}

export async function savePersistedState(partial: Partial<PersistedAppState>): Promise<void> {
  const current = await loadPersistedState();
  const next: PersistedAppState = {
    ...current,
    ...partial,
    settings: partial.settings
      ? {
          ...current.settings,
          ...partial.settings,
          editor: {
            ...current.settings.editor,
            ...(partial.settings.editor ?? {}),
          },
          ui: {
            ...current.settings.ui,
            ...(partial.settings.ui ?? {}),
          },
          keybindings: {
            ...current.settings.keybindings,
            ...(partial.settings.keybindings ?? {}),
          },
        }
      : current.settings,
  };

  const filePath = getStateFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), 'utf8');
  await fs.rename(tempPath, filePath);
}
