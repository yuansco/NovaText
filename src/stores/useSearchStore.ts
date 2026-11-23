import { create } from 'zustand';
import { getActiveEditorView } from '@/editor/editorController';
import type { SearchMatch } from '@/search/searchEngine';

interface SearchState {
  isOpen: boolean;
  showReplace: boolean;
  showResultsPanel: boolean;
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  multiline: boolean;
  matchCount: number;
  currentMatchIndex: number;
  results: SearchMatch[];
  regexError: string | null;
  openFind: () => void;
  toggleFind: () => void;
  openReplace: () => void;
  toggleReplace: () => void;
  close: () => void;
  toggleResultsPanel: () => void;
  setResultsPanelOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setReplaceText: (replaceText: string) => void;
  toggleCaseSensitive: () => void;
  toggleWholeWord: () => void;
  toggleUseRegex: () => void;
  toggleMultiline: () => void;
  setMatchStats: (matchCount: number, currentMatchIndex: number) => void;
  setResults: (results: SearchMatch[], regexError: string | null) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isOpen: false,
  showReplace: false,
  showResultsPanel: false,
  query: '',
  replaceText: '',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  multiline: false,
  matchCount: 0,
  currentMatchIndex: 0,
  results: [],
  regexError: null,

  openFind: () => set({ isOpen: true, showReplace: false }),
  toggleFind: () => {
    set((s) => {
      if (s.isOpen) {
        getActiveEditorView()?.focus();
        return { isOpen: false };
      }
      return { isOpen: true, showReplace: false };
    });
  },
  openReplace: () => set({ isOpen: true, showReplace: true }),
  toggleReplace: () => {
    set((s) => {
      if (s.isOpen && s.showReplace) {
        getActiveEditorView()?.focus();
        return { isOpen: false };
      }
      return { isOpen: true, showReplace: true };
    });
  },
  close: () => {
    set({ isOpen: false });
    getActiveEditorView()?.focus();
  },
  toggleResultsPanel: () => set((s) => ({ showResultsPanel: !s.showResultsPanel })),
  setResultsPanelOpen: (showResultsPanel) => set({ showResultsPanel }),
  setQuery: (query) => set({ query }),
  setReplaceText: (replaceText) => set({ replaceText }),
  toggleCaseSensitive: () => set((s) => ({ caseSensitive: !s.caseSensitive })),
  toggleWholeWord: () => set((s) => ({ wholeWord: !s.wholeWord })),
  toggleUseRegex: () => set((s) => ({ useRegex: !s.useRegex })),
  toggleMultiline: () => set((s) => ({ multiline: !s.multiline })),
  setMatchStats: (matchCount, currentMatchIndex) => set({ matchCount, currentMatchIndex }),
  setResults: (results, regexError) => set({ results, regexError }),
}));
