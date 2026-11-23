import { create } from 'zustand';
import type { FolderSearchMatch } from '@shared/types/ipc';
import { getActiveEditorView } from '@/editor/editorController';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';

export type BottomPanelView = 'terminal' | 'folder-search';

export interface TerminalSessionItem {
  sessionId: string;
  title: string;
  shell: string;
  cwd: string;
  exited?: boolean;
}

interface BottomPanelState {
  isOpen: boolean;
  activeView: BottomPanelView;
  height: number;
  // Terminal state
  sessions: TerminalSessionItem[];
  activeSessionId: string | null;
  splitSessionId: string | null;
  shellProfile: string;
  // Folder search state
  workspacePath: string | null;
  folderQuery: string;
  folderCaseSensitive: boolean;
  folderUseRegex: boolean;
  includeExtensions: string;
  excludePatterns: string;
  folderResults: FolderSearchMatch[];
  isSearchingFolder: boolean;

  setOpen: (open: boolean) => void;
  toggleTerminal: () => void;
  openFolderSearch: () => void;
  toggleFolderSearch: () => void;
  setActiveView: (view: BottomPanelView) => void;
  setHeight: (height: number) => void;
  setShellProfile: (profile: string) => void;
  createTerminal: (cwd?: string) => Promise<void>;
  createSplitTerminal: (cwd?: string) => Promise<void>;
  closeTerminal: (sessionId: string) => void;
  setActiveTerminal: (sessionId: string) => void;
  markTerminalExited: (sessionId: string) => void;
  setWorkspacePath: (path: string | null) => void;
  setFolderQuery: (q: string) => void;
  toggleFolderCaseSensitive: () => void;
  toggleFolderUseRegex: () => void;
  setIncludeExtensions: (ext: string) => void;
  setExcludePatterns: (pat: string) => void;
  runFolderSearch: () => Promise<void>;
}

export const useBottomPanelStore = create<BottomPanelState>((set, get) => ({
  isOpen: false,
  activeView: 'terminal',
  height: 240,
  sessions: [],
  activeSessionId: null,
  splitSessionId: null,
  shellProfile: '',
  workspacePath: null,
  folderQuery: '',
  folderCaseSensitive: false,
  folderUseRegex: false,
  includeExtensions: '',
  excludePatterns: 'node_modules, .git, out, dist',
  folderResults: [],
  isSearchingFolder: false,

  setOpen: (isOpen) => set({ isOpen }),

  toggleTerminal: () => {
    const { isOpen, activeView, sessions, createTerminal } = get();
    if (isOpen && activeView === 'terminal') {
      set({ isOpen: false });
      getActiveEditorView()?.focus();
      return;
    }
    set({ isOpen: true, activeView: 'terminal' });
    if (sessions.length === 0) {
      void createTerminal();
    }
  },

  openFolderSearch: () => set({ isOpen: true, activeView: 'folder-search' }),

  toggleFolderSearch: () => {
    const { isOpen, activeView } = get();
    if (isOpen && activeView === 'folder-search') {
      set({ isOpen: false });
      getActiveEditorView()?.focus();
    } else {
      set({ isOpen: true, activeView: 'folder-search' });
    }
  },

  setActiveView: (activeView) => set({ activeView }),

  setHeight: (height) => set({ height: Math.min(560, Math.max(140, height)) }),

  setShellProfile: (shellProfile) => set({ shellProfile }),

  createTerminal: async (cwd) => {
    if (!hasNovaAPI()) return;
    const { shellProfile, workspacePath, sessions } = get();
    const res = await getNovaAPI().terminal.create(
      shellProfile || undefined,
      cwd ?? workspacePath ?? undefined,
    );
    const nextItem: TerminalSessionItem = {
      sessionId: res.sessionId,
      title: `${res.title} #${sessions.length + 1}`,
      shell: res.shell,
      cwd: res.cwd,
    };
    set({
      sessions: [...sessions, nextItem],
      activeSessionId: res.sessionId,
    });
  },

  createSplitTerminal: async (cwd) => {
    if (!hasNovaAPI()) return;
    const { shellProfile, workspacePath, sessions } = get();
    const res = await getNovaAPI().terminal.create(
      shellProfile || undefined,
      cwd ?? workspacePath ?? undefined,
    );
    const nextItem: TerminalSessionItem = {
      sessionId: res.sessionId,
      title: `${res.title} #${sessions.length + 1}`,
      shell: res.shell,
      cwd: res.cwd,
    };
    set({
      sessions: [...sessions, nextItem],
      splitSessionId: res.sessionId,
    });
  },

  closeTerminal: (sessionId) => {
    if (hasNovaAPI()) {
      getNovaAPI().terminal.kill(sessionId);
    }
    const { sessions, activeSessionId, splitSessionId } = get();
    const nextSessions = sessions.filter((s) => s.sessionId !== sessionId);
    let nextActive = activeSessionId;
    let nextSplit = splitSessionId === sessionId ? null : splitSessionId;

    if (activeSessionId === sessionId) {
      if (nextSplit) {
        nextActive = nextSplit;
        nextSplit = null;
      } else {
        nextActive = nextSessions[0]?.sessionId ?? null;
      }
    }

    set({
      sessions: nextSessions,
      activeSessionId: nextActive,
      splitSessionId: nextSplit,
    });
  },

  setActiveTerminal: (activeSessionId) => set({ activeSessionId }),

  markTerminalExited: (sessionId) => {
    set({
      sessions: get().sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, exited: true } : s,
      ),
    });
  },

  setWorkspacePath: (workspacePath) => {
    set({ workspacePath });
    if (hasNovaAPI()) {
      void getNovaAPI().store.saveState({ workspacePath });
    }
  },

  setFolderQuery: (folderQuery) => set({ folderQuery }),
  toggleFolderCaseSensitive: () =>
    set((s) => ({ folderCaseSensitive: !s.folderCaseSensitive })),
  toggleFolderUseRegex: () => set((s) => ({ folderUseRegex: !s.folderUseRegex })),
  setIncludeExtensions: (includeExtensions) => set({ includeExtensions }),
  setExcludePatterns: (excludePatterns) => set({ excludePatterns }),

  runFolderSearch: async () => {
    if (!hasNovaAPI()) return;
    const {
      workspacePath,
      folderQuery,
      folderCaseSensitive,
      folderUseRegex,
      includeExtensions,
      excludePatterns,
    } = get();

    if (!workspacePath || !folderQuery.trim()) {
      set({ folderResults: [] });
      return;
    }

    set({ isSearchingFolder: true });
    try {
      const results = await getNovaAPI().search.inFolder({
        rootDir: workspacePath,
        query: folderQuery,
        caseSensitive: folderCaseSensitive,
        useRegex: folderUseRegex,
        includeExtensions: includeExtensions.split(',').map((s) => s.trim()).filter(Boolean),
        excludePatterns: excludePatterns.split(',').map((s) => s.trim()).filter(Boolean),
      });
      set({ folderResults: results, isSearchingFolder: false });
    } catch {
      set({ folderResults: [], isSearchingFolder: false });
    }
  },
}));
