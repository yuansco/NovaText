import {
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

let activeEditorView: EditorView | null = null;

export function setActiveEditorView(view: EditorView | null): void {
  activeEditorView = view;
}

export function getActiveEditorView(): EditorView | null {
  return activeEditorView;
}

export interface SearchStats {
  matchCount: number;
  currentMatchIndex: number;
}

export function applySearchToActiveEditor(params: {
  search: string;
  replace: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regexp: boolean;
  scrollToMatch?: boolean;
}): SearchStats {
  const view = activeEditorView;
  if (!view) return { matchCount: 0, currentMatchIndex: 0 };

  const query = new SearchQuery({
    search: params.search,
    replace: params.replace,
    caseSensitive: params.caseSensitive,
    wholeWord: params.wholeWord,
    regexp: params.regexp,
  });

  view.dispatch({ effects: setSearchQuery.of(query) });

  if (!params.search || !query.valid) {
    return { matchCount: 0, currentMatchIndex: 0 };
  }

  const cursor = query.getCursor(view.state.doc);
  const selFrom = view.state.selection.main.from;
  let matchCount = 0;
  let currentMatchIndex = 0;
  let firstMatch: { from: number; to: number } | null = null;
  let nextMatchFromCursor: { from: number; to: number; index: number } | null = null;
  const MAX_COUNT = 10000;

  let item = cursor.next();
  while (!item.done && matchCount < MAX_COUNT) {
    matchCount += 1;
    if (!firstMatch) {
      firstMatch = { from: item.value.from, to: item.value.to };
    }
    if (!nextMatchFromCursor && item.value.from >= selFrom) {
      nextMatchFromCursor = { from: item.value.from, to: item.value.to, index: matchCount };
    }
    if (item.value.from <= selFrom && item.value.to >= selFrom) {
      currentMatchIndex = matchCount;
    } else if (currentMatchIndex === 0 && item.value.from >= selFrom) {
      currentMatchIndex = matchCount;
    }
    item = cursor.next();
  }

  if (params.scrollToMatch && matchCount > 0) {
    const target = nextMatchFromCursor ?? (firstMatch ? { ...firstMatch, index: 1 } : null);
    if (target) {
      currentMatchIndex = target.index;
      view.dispatch({
        selection: EditorSelection.range(target.from, target.to),
        effects: EditorView.scrollIntoView(target.from, { y: 'center' }),
      });
    }
  }

  return { matchCount, currentMatchIndex };
}

export function execFindNext(): boolean {
  return activeEditorView ? findNext(activeEditorView) : false;
}

export function execFindPrevious(): boolean {
  return activeEditorView ? findPrevious(activeEditorView) : false;
}

export function execReplaceNext(): boolean {
  return activeEditorView ? replaceNext(activeEditorView) : false;
}

export function execReplaceAll(): boolean {
  return activeEditorView ? replaceAll(activeEditorView) : false;
}

export function jumpToRange(from: number, to: number): void {
  const view = activeEditorView;
  if (!view) return;
  const docLen = view.state.doc.length;
  const safeFrom = Math.max(0, Math.min(from, docLen));
  const safeTo = Math.max(safeFrom, Math.min(to, docLen));
  view.dispatch({
    selection: EditorSelection.range(safeFrom, safeTo),
    effects: EditorView.scrollIntoView(safeFrom, { y: 'center' }),
  });
  view.focus();
}
