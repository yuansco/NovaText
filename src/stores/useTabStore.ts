import { create } from 'zustand';
import type { FileEncoding, FileReadResult, LineEnding, TabDocument } from '@shared/types/file';
import { detectLanguageId, getFileName } from '@/utils/fileUtils';

interface TabState {
  tabs: TabDocument[];
  activeTabId: string | null;
  untitledCounter: number;
  createNewTab: () => string;
  openFileResult: (file: FileReadResult) => string;
  setActiveTab: (id: string) => void;
  closeTabImmediate: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabCursor: (id: string, line: number, col: number) => void;
  markTabSaved: (id: string, filePath: string, savedContent: string, byteSize: number) => void;
  setTabLineEnding: (id: string, lineEnding: LineEnding) => void;
  setTabEncoding: (id: string, encoding: FileEncoding) => void;
  setTabLanguage: (id: string, languageId: string) => void;
  setExternalChange: (filePath: string, change: 'modified' | 'deleted' | null) => void;
  reloadTabFromFileResult: (id: string, file: FileReadResult) => void;
  getActiveTab: () => TabDocument | undefined;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  untitledCounter: 1,

  createNewTab: () => {
    const { tabs, untitledCounter } = get();
    const id = crypto.randomUUID();
    const title = untitledCounter === 1 ? 'Untitled' : `Untitled-${untitledCounter}`;
    const newTab: TabDocument = {
      id,
      filePath: null,
      title,
      content: '',
      savedContent: '',
      isDirty: false,
      encoding: 'utf-8',
      lineEnding: 'LF',
      languageId: 'plaintext',
      cursor: { line: 1, col: 1 },
      scrollTop: 0,
      byteSize: 0,
    };
    set({
      tabs: [...tabs, newTab],
      activeTabId: id,
      untitledCounter: untitledCounter + 1,
    });
    return id;
  },

  openFileResult: (file) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.filePath === file.filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    const id = crypto.randomUUID();
    const newTab: TabDocument = {
      id,
      filePath: file.filePath,
      title: file.fileName,
      content: file.content,
      savedContent: file.content,
      isDirty: false,
      encoding: file.encoding,
      lineEnding: file.lineEnding,
      languageId: detectLanguageId(file.fileName),
      cursor: { line: 1, col: 1 },
      scrollTop: 0,
      byteSize: file.byteSize,
    };

    set({
      tabs: [...tabs, newTab],
      activeTabId: id,
    });
    return id;
  },

  setActiveTab: (id) => {
    if (get().tabs.some((t) => t.id === id)) {
      set({ activeTabId: id });
    }
  },

  closeTabImmediate: (id) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;

    const nextTabs = tabs.filter((t) => t.id !== id);
    let nextActive = activeTabId;

    if (activeTabId === id) {
      if (nextTabs.length === 0) {
        nextActive = null;
      } else {
        const fallbackIdx = Math.min(idx, nextTabs.length - 1);
        nextActive = nextTabs[fallbackIdx].id;
      }
    }

    set({ tabs: nextTabs, activeTabId: nextActive });
  },

  updateTabContent: (id, content) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              content,
              isDirty: content !== tab.savedContent,
            }
          : tab,
      ),
    });
  },

  updateTabCursor: (id, line, col) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id && (tab.cursor.line !== line || tab.cursor.col !== col)
          ? { ...tab, cursor: { line, col } }
          : tab,
      ),
    });
  },

  markTabSaved: (id, filePath, savedContent, byteSize) => {
    const fileName = getFileName(filePath);
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              filePath,
              title: fileName,
              content: savedContent,
              savedContent,
              isDirty: false,
              byteSize,
              languageId:
                tab.languageId === 'plaintext' ? detectLanguageId(fileName) : tab.languageId,
            }
          : tab,
      ),
    });
  },

  setTabLineEnding: (id, lineEnding) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id ? { ...tab, lineEnding, isDirty: true } : tab,
      ),
    });
  },

  setTabEncoding: (id, encoding) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id ? { ...tab, encoding, isDirty: true } : tab,
      ),
    });
  },

  setTabLanguage: (id, languageId) => {
    set({
      tabs: get().tabs.map((tab) => (tab.id === id ? { ...tab, languageId } : tab)),
    });
  },

  setExternalChange: (filePath, change) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.filePath === filePath ? { ...tab, externalChange: change } : tab,
      ),
    });
  },

  reloadTabFromFileResult: (id, file) => {
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              content: file.content,
              savedContent: file.content,
              isDirty: false,
              encoding: file.encoding,
              lineEnding: file.lineEnding,
              byteSize: file.byteSize,
              externalChange: null,
            }
          : tab,
      ),
    });
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId);
  },
}));
