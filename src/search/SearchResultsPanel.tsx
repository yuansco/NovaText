import { X } from 'lucide-react';
import { jumpToRange } from '@/editor/editorController';
import { useT } from '@/i18n/translations';
import { useSearchStore } from '@/stores/useSearchStore';

export function SearchResultsPanel() {
  const {
    showResultsPanel,
    setResultsPanelOpen,
    results,
    query,
    showReplace,
    regexError,
  } = useSearchStore();
  const t = useT();

  if (!showResultsPanel) return null;

  return (
    <div
      className="flex h-44 shrink-0 flex-col border-t text-xs"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-1 select-none"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <span>{t.searchResults}</span>
          {query && (
            <span className="text-[var(--text-muted)]">
              ({results.length})
            </span>
          )}
          {regexError && (
            <span className="text-[var(--danger-color)]">{regexError}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setResultsPanelOpen(false)}
          title={t.closeResultsPanelTitle}
          className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {!query ? (
          <div className="p-3 text-[var(--text-muted)]">
            {t.enterQueryToView}
          </div>
        ) : results.length === 0 ? (
          <div className="p-3 text-[var(--text-muted)]">{t.noMatchesFound}</div>
        ) : (
          <ul className="space-y-0.5 font-mono text-[11px]">
            {results.map((item) => (
              <li
                key={`${item.from}-${item.index}`}
                onClick={() => jumpToRange(item.from, item.to)}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--bg-hover)]"
              >
                <span className="w-16 shrink-0 text-[var(--text-muted)] tabular-nums">
                  {item.line}:{item.column}
                </span>
                <span className="truncate text-[var(--text-primary)]">
                  {item.linePreview}
                </span>
                {showReplace && item.replacePreview !== item.matchedText && (
                  <span className="ml-auto shrink-0 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--success-color)]">
                    → {item.replacePreview}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
