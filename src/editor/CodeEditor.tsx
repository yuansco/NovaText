import { useEffect, useRef } from 'react';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
} from '@codemirror/language';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import type { TabDocument } from '@shared/types/file';
import { useSearchStore } from '@/stores/useSearchStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTabStore } from '@/stores/useTabStore';
import { resolveEditorTheme } from '@/themes/presets';
import { buildCodeMirrorTheme } from './cmTheme';
import { applySearchToActiveEditor, setActiveEditorView } from './editorController';
import { getLanguageExtension } from './languageRegistry';

interface CodeEditorProps {
  tab: TabDocument;
}

interface TabScrollState {
  scrollTop: number;
  scrollLeft: number;
  snapshot?: StateEffect<unknown>;
}

const getScrollSnapshot = (view: EditorView): StateEffect<unknown> | undefined => {
  try {
    return view.scrollSnapshot();
  } catch {
    return undefined;
  }
};

const LARGE_FILE_BYTE_THRESHOLD = 5 * 1024 * 1024; // 5 MB
const VERY_LARGE_FILE_BYTE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export function CodeEditor({ tab }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const stateCacheRef = useRef<Map<string, EditorState>>(new Map());
  const scrollCacheRef = useRef<Map<string, TabScrollState>>(new Map());
  const activeTabIdRef = useRef<string>(tab.id);
  const cursorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dynamic reconfiguration compartments
  const compartmentsRef = useRef({
    language: new Compartment(),
    theme: new Compartment(),
    typography: new Compartment(),
    wordWrap: new Compartment(),
    tabSize: new Compartment(),
    folding: new Compartment(),
  });

  const settings = useSettingsStore((s) => s.settings);
  const tabs = useTabStore((s) => s.tabs);

  const buildTypographyExtension = () =>
    EditorView.theme({
      '&': {
        fontSize: `${settings.editor.fontSize}px`,
      },
      '.cm-scroller': {
        fontFamily: settings.editor.fontFamily,
        lineHeight: String(settings.editor.lineHeight),
        letterSpacing: `${settings.editor.letterSpacing}px`,
      },
    });

  const createEditorStateForTab = (targetTab: TabDocument): EditorState => {
    const c = compartmentsRef.current;
    const editorTheme = resolveEditorTheme(settings.editorThemeId, settings.customEditorTheme);
    const isLargeFile = targetTab.byteSize > LARGE_FILE_BYTE_THRESHOLD;
    const isVeryLargeFile = targetTab.byteSize > VERY_LARGE_FILE_BYTE_THRESHOLD;

    let initialSelection: { anchor: number } | undefined;
    if (targetTab.cursor && targetTab.content) {
      const content = targetTab.content;
      const targetLine = Math.max(1, targetTab.cursor.line);
      const targetCol = Math.max(1, targetTab.cursor.col);
      let currentLine = 1;
      let lineStart = 0;
      let pos = 0;
      while (currentLine < targetLine && pos < content.length) {
        if (content.charCodeAt(pos) === 10) {
          currentLine++;
          lineStart = pos + 1;
        }
        pos++;
      }
      let lineEnd = content.indexOf('\n', lineStart);
      if (lineEnd === -1) lineEnd = content.length;
      const lineLen = lineEnd - lineStart;
      const colOffset = Math.min(targetCol - 1, lineLen);
      const initialPos = Math.min(lineStart + colOffset, content.length);
      initialSelection = { anchor: initialPos };
    }

    return EditorState.create({
      doc: targetTab.content,
      selection: initialSelection,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        highlightSelectionMatches(),
        search({ top: true }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        c.folding.of(isLargeFile ? [] : foldGutter()),
        c.language.of(isVeryLargeFile ? [] : getLanguageExtension(targetTab.languageId)),
        c.theme.of(buildCodeMirrorTheme(editorTheme)),
        c.typography.of(buildTypographyExtension()),
        c.wordWrap.of(settings.editor.wordWrap ? EditorView.lineWrapping : []),
        c.tabSize.of([
          EditorState.tabSize.of(settings.editor.tabSize),
          indentUnit.of(' '.repeat(settings.editor.tabSize)),
        ]),
        EditorView.domEventHandlers({
          dragover(event) {
            if (event.dataTransfer?.types.includes('Files')) {
              event.preventDefault();
              return true;
            }
            return false;
          },
          drop(event) {
            if (
              event.dataTransfer?.types.includes('Files') ||
              (event.dataTransfer?.files?.length ?? 0) > 0
            ) {
              event.preventDefault();
              return true;
            }
            return false;
          },
        }),
        EditorView.updateListener.of((update) => {
          const currentTabId = activeTabIdRef.current;
          if (update.docChanged) {
            const nextContent = update.state.doc.toString();
            useTabStore.getState().updateTabContent(currentTabId, nextContent);
          }
          if (update.selectionSet || update.docChanged) {
            if (cursorDebounceRef.current) {
              clearTimeout(cursorDebounceRef.current);
            }
            cursorDebounceRef.current = setTimeout(() => {
              const head = update.state.selection.main.head;
              const lineObj = update.state.doc.lineAt(head);
              useTabStore
                .getState()
                .updateTabCursor(currentTabId, lineObj.number, head - lineObj.from + 1);
            }, 60);
          }
        }),
      ],
    });
  };

  const buildSettingsEffects = () => {
    const c = compartmentsRef.current;
    const editorTheme = resolveEditorTheme(settings.editorThemeId, settings.customEditorTheme);
    return [
      c.theme.reconfigure(buildCodeMirrorTheme(editorTheme)),
      c.typography.reconfigure(buildTypographyExtension()),
      c.wordWrap.reconfigure(settings.editor.wordWrap ? EditorView.lineWrapping : []),
      c.tabSize.reconfigure([
        EditorState.tabSize.of(settings.editor.tabSize),
        indentUnit.of(' '.repeat(settings.editor.tabSize)),
      ]),
    ];
  };

  // Mount single EditorView once
  useEffect(() => {
    if (!containerRef.current) return;

    const initialState = createEditorStateForTab(tab);
    stateCacheRef.current.set(tab.id, initialState);

    const view = new EditorView({
      state: initialState,
      parent: containerRef.current,
    });

    viewRef.current = view;
    setActiveEditorView(view);
    view.focus();

    if (tab.scrollTop > 0 && view.scrollDOM) {
      view.scrollDOM.scrollTop = tab.scrollTop;
      scrollCacheRef.current.set(tab.id, {
        scrollTop: tab.scrollTop,
        scrollLeft: 0,
        snapshot: getScrollSnapshot(view),
      });
      requestAnimationFrame(() => {
        if (viewRef.current && activeTabIdRef.current === tab.id && viewRef.current.scrollDOM) {
          viewRef.current.scrollDOM.scrollTop = tab.scrollTop;
        }
      });
    }

    const handleScroll = () => {
      const currentTabId = activeTabIdRef.current;
      const scroller = view.scrollDOM;
      if (!scroller) return;
      scrollCacheRef.current.set(currentTabId, {
        scrollTop: scroller.scrollTop,
        scrollLeft: scroller.scrollLeft,
        snapshot: getScrollSnapshot(view),
      });
    };

    const scroller = view.scrollDOM;
    scroller?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scroller?.removeEventListener('scroll', handleScroll);
      if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
      setActiveEditorView(null);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch EditorState when active tab changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const previousTabId = activeTabIdRef.current;
    if (previousTabId !== tab.id) {
      // 1. Save previous tab state and scroll position
      stateCacheRef.current.set(previousTabId, view.state);
      if (view.scrollDOM) {
        const prevScroll: TabScrollState = {
          scrollTop: view.scrollDOM.scrollTop,
          scrollLeft: view.scrollDOM.scrollLeft,
          snapshot: getScrollSnapshot(view),
        };
        scrollCacheRef.current.set(previousTabId, prevScroll);
        useTabStore.getState().updateTabScroll(previousTabId, prevScroll.scrollTop);
      }

      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
        cursorDebounceRef.current = null;
        const head = view.state.selection.main.head;
        const lineObj = view.state.doc.lineAt(head);
        useTabStore
          .getState()
          .updateTabCursor(previousTabId, lineObj.number, head - lineObj.from + 1);
      }

      activeTabIdRef.current = tab.id;

      // 2. Retrieve or create nextState
      let nextState = stateCacheRef.current.get(tab.id);
      if (!nextState || nextState.doc.toString() !== tab.content) {
        nextState = createEditorStateForTab(tab);
        stateCacheRef.current.set(tab.id, nextState);
      }

      // 3. Switch to next state
      view.setState(nextState);

      // 4. Restore settings and snapshot
      const savedScroll = scrollCacheRef.current.get(tab.id);
      const effects = buildSettingsEffects();
      if (savedScroll?.snapshot) {
        effects.push(savedScroll.snapshot);
      }
      view.dispatch({ effects });

      // 5. Restore scrollDOM position synchronously and in next frame
      const targetScrollTop = savedScroll ? savedScroll.scrollTop : (tab.scrollTop || 0);
      const targetScrollLeft = savedScroll ? savedScroll.scrollLeft : 0;
      if (view.scrollDOM) {
        view.scrollDOM.scrollTop = targetScrollTop;
        view.scrollDOM.scrollLeft = targetScrollLeft;
      }
      requestAnimationFrame(() => {
        if (viewRef.current && activeTabIdRef.current === tab.id && viewRef.current.scrollDOM) {
          viewRef.current.scrollDOM.scrollTop = targetScrollTop;
          viewRef.current.scrollDOM.scrollLeft = targetScrollLeft;
        }
      });

      view.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id]);

  // Sync external reload when tab.content changes outside CodeMirror (e.g. Reload from Disk)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || activeTabIdRef.current !== tab.id) return;
    if (!tab.isDirty && view.state.doc.toString() !== tab.content) {
      const freshState = createEditorStateForTab(tab);
      stateCacheRef.current.set(tab.id, freshState);
      view.setState(freshState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.content, tab.isDirty]);

  // Prune closed tabs from state and scroll caches
  useEffect(() => {
    const openIds = new Set(tabs.map((t) => t.id));
    for (const cachedId of stateCacheRef.current.keys()) {
      if (!openIds.has(cachedId)) {
        stateCacheRef.current.delete(cachedId);
      }
    }
    for (const cachedId of scrollCacheRef.current.keys()) {
      if (!openIds.has(cachedId)) {
        scrollCacheRef.current.delete(cachedId);
      }
    }
  }, [tabs]);

  // Reconfigure language when tab languageId changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: compartmentsRef.current.language.reconfigure(
        getLanguageExtension(tab.languageId),
      ),
    });
  }, [tab.languageId]);

  // Reconfigure theme, typography, wordWrap, and tabSize when settings change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: buildSettingsEffects(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.editor, settings.editorThemeId, settings.customEditorTheme]);

  // Re-apply search query immediately when search input/options change
  const searchState = useSearchStore();
  useEffect(() => {
    if (!searchState.isOpen) {
      applySearchToActiveEditor({
        search: '',
        replace: '',
        caseSensitive: false,
        wholeWord: false,
        regexp: false,
      });
      return;
    }
    const stats = applySearchToActiveEditor({
      search: searchState.query,
      replace: searchState.replaceText,
      caseSensitive: searchState.caseSensitive,
      wholeWord: searchState.wholeWord,
      regexp: searchState.useRegex,
      scrollToMatch: Boolean(searchState.query),
    });
    searchState.setMatchStats(stats.matchCount, stats.currentMatchIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab.id,
    searchState.isOpen,
    searchState.query,
    searchState.replaceText,
    searchState.caseSensitive,
    searchState.wholeWord,
    searchState.useRegex,
  ]);

  // Refresh match count when document content changes while search bar is open
  useEffect(() => {
    if (!searchState.isOpen || !searchState.query) return;
    const stats = applySearchToActiveEditor({
      search: searchState.query,
      replace: searchState.replaceText,
      caseSensitive: searchState.caseSensitive,
      wholeWord: searchState.wholeWord,
      regexp: searchState.useRegex,
      scrollToMatch: false,
    });
    searchState.setMatchStats(stats.matchCount, stats.currentMatchIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.content]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
