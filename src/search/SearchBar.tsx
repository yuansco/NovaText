import { useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  List,
  Pilcrow,
  Regex,
  Replace,
  ReplaceAll,
  WholeWord,
  X,
} from 'lucide-react';
import {
  applySearchToActiveEditor,
  execFindNext,
  execFindPrevious,
  execReplaceAll,
  execReplaceNext,
} from '@/editor/editorController';
import { useT } from '@/i18n/translations';
import { useSearchStore } from '@/stores/useSearchStore';
import { useTabStore } from '@/stores/useTabStore';
import { findMatchesWithContext } from './searchEngine';

export function SearchBar() {
  const {
    isOpen,
    showReplace,
    showResultsPanel,
    query,
    replaceText,
    caseSensitive,
    wholeWord,
    useRegex,
    multiline,
    matchCount,
    currentMatchIndex,
    regexError,
    openReplace,
    openFind,
    close,
    toggleResultsPanel,
    setQuery,
    setReplaceText,
    toggleCaseSensitive,
    toggleWholeWord,
    toggleUseRegex,
    toggleMultiline,
    setMatchStats,
    setResults,
  } = useSearchStore();

  const activeTab = useTabStore((s) => s.getActiveTab());
  const t = useT();
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const findTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (multiline) {
        findTextareaRef.current?.focus();
      } else {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }
    }
  }, [isOpen, multiline]);

  // Compute contextual results & replace previews when open
  useEffect(() => {
    if (!isOpen || !activeTab) {
      setResults([], null);
      return;
    }

    const timer = setTimeout(() => {
      const { matches, error } = findMatchesWithContext(activeTab.content, {
        query,
        replaceText,
        caseSensitive,
        wholeWord,
        useRegex,
        multiline,
      });
      setResults(matches, error);
    }, 80);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    activeTab,
    query,
    replaceText,
    caseSensitive,
    wholeWord,
    useRegex,
    multiline,
    setResults,
  ]);

  if (!isOpen) return null;

  const refreshStats = () => {
    const stats = applySearchToActiveEditor({
      search: query,
      replace: replaceText,
      caseSensitive,
      wholeWord,
      regexp: useRegex,
    });
    setMatchStats(stats.matchCount, stats.currentMatchIndex);
  };

  const handleFindNext = () => {
    execFindNext();
    refreshStats();
  };

  const handleFindPrev = () => {
    execFindPrevious();
    refreshStats();
  };

  const handleReplace = () => {
    execReplaceNext();
    refreshStats();
  };

  const handleReplaceAll = () => {
    execReplaceAll();
    refreshStats();
  };

  return (
    <div
      className="flex flex-col gap-1.5 border-b px-3 py-2 text-xs select-none"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={() => (showReplace ? openFind() : openReplace())}
          title={showReplace ? t.hideReplaceTitle : t.showReplaceTitle}
          className="mt-0.5 rounded p-1 hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
        >
          {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="relative flex flex-1 items-center max-w-md">
          {multiline ? (
            <textarea
              ref={findTextareaRef}
              rows={2}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleFindNext();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder={t.findMultilinePlaceholder}
              className="w-full resize-y rounded border px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: regexError ? 'var(--danger-color)' : 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          ) : (
            <input
              ref={findInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handleFindPrev();
                  else handleFindNext();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder={t.findPlaceholder}
              className="w-full rounded border px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: regexError ? 'var(--danger-color)' : 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={toggleCaseSensitive}
            title={t.matchCaseTitle}
            className={`rounded p-1 transition-colors ${
              caseSensitive
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <CaseSensitive size={14} />
          </button>
          <button
            type="button"
            onClick={toggleWholeWord}
            title={t.matchWholeWordTitle}
            className={`rounded p-1 transition-colors ${
              wholeWord
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <WholeWord size={14} />
          </button>
          <button
            type="button"
            onClick={toggleUseRegex}
            title={t.useRegexTitle}
            className={`rounded p-1 transition-colors ${
              useRegex
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Regex size={14} />
          </button>
          <button
            type="button"
            onClick={toggleMultiline}
            title={t.multilineSearchTitle}
            className={`rounded p-1 transition-colors ${
              multiline
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <Pilcrow size={14} />
          </button>

          <span className="min-w-[56px] text-center text-[var(--text-secondary)] tabular-nums">
            {query ? (matchCount > 0 ? `${currentMatchIndex || 1}/${matchCount}` : '0/0') : ''}
          </span>

          <button
            type="button"
            onClick={handleFindPrev}
            title={t.prevMatchTitle}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={handleFindNext}
            title={t.nextMatchTitle}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            <ArrowDown size={14} />
          </button>

          <button
            type="button"
            onClick={toggleResultsPanel}
            title={t.toggleResultsListTitle}
            className={`rounded p-1 transition-colors ${
              showResultsPanel
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <List size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={close}
          title={t.closeSearchTitle}
          className="ml-auto mt-0.5 rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1.5 pl-7">
          <div className="relative flex flex-1 items-center max-w-md">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleReplace();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  close();
                }
              }}
              placeholder={t.replacePlaceholder}
              className="w-full rounded border px-2.5 py-1 text-xs outline-none focus:border-[var(--accent-color)]"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleReplace}
            title={t.replaceNextTitle}
            className="flex items-center gap-1 rounded border px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Replace size={13} />
            <span>{t.replaceBtn}</span>
          </button>

          <button
            type="button"
            onClick={handleReplaceAll}
            title={t.replaceAllTitle}
            className="flex items-center gap-1 rounded border px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <ReplaceAll size={13} />
            <span>{t.replaceAllBtn}</span>
          </button>
        </div>
      )}
    </div>
  );
}
