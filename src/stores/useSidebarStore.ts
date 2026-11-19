import { create } from 'zustand';
import type { PinnedFile, RecentFile } from '@shared/types/sidebar';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { getFileName } from '@/utils/fileUtils';

const MAX_RECENT_FILES = 30;

interface SidebarState {
  pinnedFiles: PinnedFile[];
  recentFiles: RecentFile[];
  filterQuery: string;
  hydrate: (pinnedFiles: PinnedFile[], recentFiles: RecentFile[]) => void;
  setFilterQuery: (query: string) => void;
  pinFile: (filePath: string) => void;
  unpinFile: (filePath: string) => void;
  isPinned: (filePath: string) => boolean;
  renamePinnedFile: (id: string, customName: string) => void;
  reorderPinnedFiles: (fromIndex: number, toIndex: number) => void;
  recordRecentFile: (filePath: string) => void;
  removeRecentFile: (filePath: string) => void;
  clearRecentFiles: () => void;
  refreshPinnedExistence: () => Promise<void>;
}

function persistSidebar(pinnedFiles: PinnedFile[], recentFiles: RecentFile[]): void {
  if (!hasNovaAPI()) return;
  void getNovaAPI().store.saveState({ pinnedFiles, recentFiles });
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  pinnedFiles: [],
  recentFiles: [],
  filterQuery: '',

  hydrate: (pinnedFiles, recentFiles) => {
    const sorted = [...pinnedFiles].sort((a, b) => a.order - b.order);
    set({ pinnedFiles: sorted, recentFiles });
  },

  setFilterQuery: (filterQuery) => set({ filterQuery }),

  isPinned: (filePath) => get().pinnedFiles.some((p) => p.filePath === filePath),

  pinFile: (filePath) => {
    const { pinnedFiles, recentFiles } = get();
    if (pinnedFiles.some((p) => p.filePath === filePath)) return;

    const newItem: PinnedFile = {
      id: crypto.randomUUID(),
      filePath,
      fileName: getFileName(filePath),
      order: pinnedFiles.length,
      exists: true,
    };
    const nextPinned = [...pinnedFiles, newItem];
    set({ pinnedFiles: nextPinned });
    persistSidebar(nextPinned, recentFiles);
  },

  unpinFile: (filePath) => {
    const { pinnedFiles, recentFiles } = get();
    const nextPinned = pinnedFiles
      .filter((p) => p.filePath !== filePath)
      .map((item, idx) => ({ ...item, order: idx }));
    set({ pinnedFiles: nextPinned });
    persistSidebar(nextPinned, recentFiles);
  },

  renamePinnedFile: (id, customName) => {
    const { pinnedFiles, recentFiles } = get();
    const trimmed = customName.trim();
    const nextPinned = pinnedFiles.map((item) =>
      item.id === id ? { ...item, customName: trimmed || undefined } : item,
    );
    set({ pinnedFiles: nextPinned });
    persistSidebar(nextPinned, recentFiles);
  },

  reorderPinnedFiles: (fromIndex, toIndex) => {
    const { pinnedFiles, recentFiles } = get();
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= pinnedFiles.length ||
      toIndex >= pinnedFiles.length
    ) {
      return;
    }
    const next = [...pinnedFiles];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const reindexed = next.map((item, idx) => ({ ...item, order: idx }));
    set({ pinnedFiles: reindexed });
    persistSidebar(reindexed, recentFiles);
  },

  recordRecentFile: (filePath) => {
    const { pinnedFiles, recentFiles } = get();
    const filtered = recentFiles.filter((r) => r.filePath !== filePath);
    const nextRecent: RecentFile[] = [
      {
        filePath,
        fileName: getFileName(filePath),
        lastOpenedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT_FILES);

    set({ recentFiles: nextRecent });
    persistSidebar(pinnedFiles, nextRecent);
  },

  removeRecentFile: (filePath) => {
    const { pinnedFiles, recentFiles } = get();
    const nextRecent = recentFiles.filter((r) => r.filePath !== filePath);
    set({ recentFiles: nextRecent });
    persistSidebar(pinnedFiles, nextRecent);
  },

  clearRecentFiles: () => {
    const { pinnedFiles } = get();
    set({ recentFiles: [] });
    persistSidebar(pinnedFiles, []);
  },

  refreshPinnedExistence: async () => {
    if (!hasNovaAPI()) return;
    const { pinnedFiles } = get();
    if (pinnedFiles.length === 0) return;

    const statusMap = await getNovaAPI().fs.exists(pinnedFiles.map((p) => p.filePath));
    set({
      pinnedFiles: pinnedFiles.map((p) => ({
        ...p,
        exists: statusMap[p.filePath] ?? p.exists,
      })),
    });
  },
}));
