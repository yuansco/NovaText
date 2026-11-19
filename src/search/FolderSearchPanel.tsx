import { CaseSensitive, FolderOpen, Regex, Search } from 'lucide-react';
import { jumpToRange } from '@/editor/editorController';
import { openFileFromPath } from '@/file-system/fileActions';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { useT } from '@/i18n/translations';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';

export function FolderSearchPanel() {
  const {
    workspacePath,
    folderQuery,
    folderCaseSensitive,
    folderUseRegex,
    includeExtensions,
    excludePatterns,
    folderResults,
    isSearchingFolder,
    setWorkspacePath,
    setFolderQuery,
    toggleFolderCaseSensitive,
    toggleFolderUseRegex,
    setIncludeExtensions,
    setExcludePatterns,
    runFolderSearch,
  } = useBottomPanelStore();
  const t = useT();

  const pickFolder = async () => {
    if (!hasNovaAPI()) return;
    const dir = await getNovaAPI().dialog.openDirectory();
    if (dir) {
      setWorkspacePath(dir);
    }
  };

  const handleOpenMatch = async (filePath: string, from: number, to: number) => {
    const ok = await openFileFromPath(filePath);
    if (ok) {
      setTimeout(() => jumpToRange(from, to), 60);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden text-xs">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runFolderSearch();
        }}
        className="flex flex-wrap items-center gap-2 border-b px-3 py-2"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <button
          type="button"
          onClick={() => void pickFolder()}
          className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-[var(--bg-hover)]"
          style={{ borderColor: 'var(--border-color)' }}
          title={workspacePath ?? t.selectFolder}
        >
          <FolderOpen size={13} />
          <span className="max-w-[160px] truncate">
            {workspacePath ? workspacePath : t.selectFolder}
          </span>
        </button>

        <input
          type="text"
          value={folderQuery}
          onChange={(e) => setFolderQuery(e.target.value)}
          placeholder={t.searchAcrossFiles}
          className="min-w-[180px] flex-1 rounded border px-2 py-1 outline-none focus:border-[var(--accent-color)]"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
          }}
        />

        <button
          type="button"
          onClick={toggleFolderCaseSensitive}
          title={t.matchCaseTitle}
          className={`rounded p-1 ${
            folderCaseSensitive
              ? 'bg-[var(--accent-color)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <CaseSensitive size={14} />
        </button>

        <button
          type="button"
          onClick={toggleFolderUseRegex}
          title={t.useRegexTitle}
          className={`rounded p-1 ${
            folderUseRegex
              ? 'bg-[var(--accent-color)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          <Regex size={14} />
        </button>

        <input
          type="text"
          value={includeExtensions}
          onChange={(e) => setIncludeExtensions(e.target.value)}
          placeholder="Ext: .ts,.cpp"
          className="w-28 rounded border px-2 py-1 outline-none"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
          }}
        />

        <input
          type="text"
          value={excludePatterns}
          onChange={(e) => setExcludePatterns(e.target.value)}
          placeholder="Exclude: node_modules,.git"
          className="w-36 rounded border px-2 py-1 outline-none"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
          }}
        />

        <button
          type="submit"
          disabled={!workspacePath || !folderQuery.trim() || isSearchingFolder}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-white disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent-color)' }}
        >
          <Search size={12} />
          <span>{isSearchingFolder ? 'Searching...' : 'Search'}</span>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-1">
        {folderResults.length === 0 ? (
          <div className="p-3 text-[var(--text-muted)]">
            {workspacePath
              ? 'Enter a search query and press Search.'
              : 'Select a folder to search across files.'}
          </div>
        ) : (
          <ul className="space-y-0.5 font-mono text-[11px]">
            {folderResults.map((m, idx) => (
              <li
                key={`${m.filePath}-${m.line}-${m.column}-${idx}`}
                onClick={() => void handleOpenMatch(m.filePath, m.fromOffset, m.toOffset)}
                title={m.filePath}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--bg-hover)]"
              >
                <span className="w-40 shrink-0 truncate text-[var(--accent-color)]">
                  {m.fileName}:{m.line}:{m.column}
                </span>
                <span className="truncate text-[var(--text-primary)]">{m.preview}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
