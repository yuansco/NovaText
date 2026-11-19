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
import { Compartment, EditorState } from '@codemirror/state';
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

const LARGE_FILE_BYTE_THRESHOLD = 5 * 1024 * 1024; // 5 MB
const VERY_LARGE_FILE_BYTE_THRESHOLD = 10 * 1024 * 1024; // 10 MB

export function CodeEditor({ tab }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const stateCacheRef = useRef<Map<string, EditorState>>(new Map());
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

    return EditorState.create({
      doc: targetTab.content,
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

    return () => {
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
      stateCacheRef.current.set(previousTabId, view.state);
      activeTabIdRef.current = tab.id;

      let nextState = stateCacheRef.current.get(tab.id);
      if (!nextState || nextState.doc.toString() !== tab.content) {
        nextState = createEditorStateForTab(tab);
        stateCacheRef.current.set(tab.id, nextState);
      }
      view.setState(nextState);
      view.dispatch({ effects: buildSettingsEffects() });
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

  // Prune closed tabs from state cache
  useEffect(() => {
    const openIds = new Set(tabs.map((t) => t.id));
    for (const cachedId of stateCacheRef.current.keys()) {
      if (!openIds.has(cachedId)) {
        stateCacheRef.current.delete(cachedId);
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
