import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import type { ExternalFileChangeEvent } from '@shared/types/ipc';

const watchers = new Map<string, fs.FSWatcher>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const selfWriteTimestamps = new Map<string, number>();

const DEBOUNCE_MS = 300;
const SELF_WRITE_IGNORE_MS = 1000;

export function markSelfWrite(filePath: string): void {
  const resolved = path.resolve(filePath);
  selfWriteTimestamps.set(resolved, Date.now());
}

export function watchFile(
  filePath: string,
  getMainWindow: () => BrowserWindow | null,
): void {
  const resolved = path.resolve(filePath);
  if (watchers.has(resolved)) return;

  try {
    const watcher = fs.watch(resolved, () => {
      const lastSelfWrite = selfWriteTimestamps.get(resolved) ?? 0;
      if (Date.now() - lastSelfWrite < SELF_WRITE_IGNORE_MS) {
        return;
      }

      const existingTimer = debounceTimers.get(resolved);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(async () => {
        debounceTimers.delete(resolved);
        const win = getMainWindow();
        if (!win || win.isDestroyed()) return;

        let type: ExternalFileChangeEvent['type'] = 'change';
        try {
          await fsPromises.access(resolved);
        } catch {
          type = 'unlink';
        }

        const payload: ExternalFileChangeEvent = {
          filePath: resolved,
          type,
        };
        win.webContents.send('fs:fileChanged', payload);
      }, DEBOUNCE_MS);

      debounceTimers.set(resolved, timer);
    });

    watcher.on('error', () => {
      unwatchFile(resolved);
    });

    watchers.set(resolved, watcher);
  } catch {
    // Ignore watch errors on non-existent or restricted files
  }
}

export function unwatchFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  const timer = debounceTimers.get(resolved);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(resolved);
  }
  const watcher = watchers.get(resolved);
  if (watcher) {
    watcher.close();
    watchers.delete(resolved);
  }
}

export function disposeAllWatchers(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers.clear();
}
