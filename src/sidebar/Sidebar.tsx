import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  FileText,
  Pin,
  PinOff,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { PinnedFile } from '@shared/types/sidebar';
import { openFileFromPath } from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';
import { formatRelativeTime, getDirName } from '@/utils/fileUtils';

interface ContextMenuState {
  x: number;
  y: number;
  item: PinnedFile;
}

export function Sidebar() {
  const {
    pinnedFiles,
    recentFiles,
    filterQuery,
    setFilterQuery,
    pinFile,
    unpinFile,
    renamePinnedFile,
    reorderPinnedFiles,
    removeRecentFile,
    clearRecentFiles,
  } = useSidebarStore();

  const { settings, updateUI } = useSettingsStore();
  const activeTab = useTabStore((s) => s.getActiveTab());
  const t = useT();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Handle sidebar drag-resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nextWidth = Math.min(480, Math.max(180, e.clientX));
      updateUI({ sidebarWidth: nextWidth });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, updateUI]);

  const normalizedFilter = filterQuery.trim().toLowerCase();

  const filteredPinned = useMemo(() => {
    if (!normalizedFilter) return pinnedFiles;
    return pinnedFiles.filter((p) => {
      const label = (p.customName ?? p.fileName).toLowerCase();
      return label.includes(normalizedFilter) || p.filePath.toLowerCase().includes(normalizedFilter);
    });
  }, [pinnedFiles, normalizedFilter]);

  const visibleRecent = useMemo(() => {
    const pinnedSet = new Set(pinnedFiles.map((p) => p.filePath));
    return recentFiles
      .filter((r) => !pinnedSet.has(r.filePath))
      .filter((r) => {
        if (!normalizedFilter) return true;
        return (
          r.fileName.toLowerCase().includes(normalizedFilter) ||
          r.filePath.toLowerCase().includes(normalizedFilter)
        );
      });
  }, [pinnedFiles, recentFiles, normalizedFilter]);

  if (settings.ui.sidebarCollapsed) {
    return null;
  }

  const startRename = (item: PinnedFile) => {
    setEditingId(item.id);
    setEditingName(item.customName ?? item.fileName);
    setContextMenu(null);
  };

  const commitRename = (id: string) => {
    renamePinnedFile(id, editingName);
    setEditingId(null);
  };

  return (
    <aside
      className="relative flex h-full shrink-0 flex-col border-r select-none"
      style={{
        width: `${settings.ui.sidebarWidth}px`,
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Search / Filter Input */}
      <div className="border-b p-2" style={{ borderColor: 'var(--border-color)' }}>
        <div
          className="flex items-center gap-1.5 rounded border px-2 py-1"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <Search size={13} className="shrink-0 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t.filterFilesPlaceholder}
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: 'var(--text-primary)' }}
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Sections */}
      <div className="flex-1 overflow-y-auto px-1.5 py-2 space-y-4">
        {/* Pinned Files */}
        <section>
          <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Pin size={11} />
              {t.pinned} ({filteredPinned.length})
            </span>
          </div>

          {filteredPinned.length === 0 ? (
            <div className="px-2 py-2 text-xs text-[var(--text-muted)]">
              {t.noPinnedFiles}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredPinned.map((item, index) => {
                const isActive = activeTab?.filePath === item.filePath;
                const displayName = item.customName ?? item.fileName;

                return (
                  <li
                    key={item.id}
                    draggable={!normalizedFilter && editingId !== item.id}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null && !normalizedFilter) {
                        reorderPinnedFiles(dragIndex, index);
                      }
                      setDragIndex(null);
                    }}
                    onClick={() => {
                      if (editingId !== item.id) {
                        void openFileFromPath(item.filePath);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, item });
                    }}
                    title={
                      item.exists
                        ? `${item.filePath}`
                        : `${t.missingFilePrefix} ${item.filePath}`
                    }
                    className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.exists ? (
                      <FileText size={14} className="shrink-0 text-[var(--accent-color)]" />
                    ) : (
                      <AlertTriangle
                        size={14}
                        className="shrink-0 text-[var(--warning-color)]"
                      />
                    )}

                    {editingId === item.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => commitRename(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(item.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded border px-1 py-0.5 text-xs outline-none"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--accent-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className={`truncate ${!item.exists ? 'line-through opacity-60' : ''}`}>
                          {displayName}
                        </div>
                        <div className="truncate text-[10px] text-[var(--text-muted)]">
                          {getDirName(item.filePath)}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unpinFile(item.filePath);
                      }}
                      title={t.unpinFile}
                      className="hidden rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] group-hover:block"
                    >
                      <PinOff size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recent Files */}
        <section>
          <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Clock size={11} />
              {t.recent} ({visibleRecent.length})
            </span>
            {visibleRecent.length > 0 && (
              <button
                type="button"
                onClick={clearRecentFiles}
                title={t.clearRecentTitle}
                className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-normal normal-case hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                <Trash2 size={10} />
                {t.clear}
              </button>
            )}
          </div>

          {visibleRecent.length === 0 ? (
            <div className="px-2 py-2 text-xs text-[var(--text-muted)]">
              {t.noRecentFiles}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {visibleRecent.map((item) => {
                const isActive = activeTab?.filePath === item.filePath;
                return (
                  <li
                    key={item.filePath}
                    onClick={() => void openFileFromPath(item.filePath)}
                    title={item.filePath}
                    className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <FileText size={14} className="shrink-0 opacity-85" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{item.fileName}</div>
                      <div className="truncate text-[10px] text-[var(--text-muted)]">
                        {getDirName(item.filePath)}
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] text-[var(--text-muted)] group-hover:hidden">
                      {formatRelativeTime(item.lastOpenedAt)}
                    </span>

                    <div className="hidden items-center gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pinFile(item.filePath);
                        }}
                        title={t.pinFile}
                        className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--accent-color)]"
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentFile(item.filePath);
                        }}
                        title={t.removeFromRecentTitle}
                        className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger-color)]"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-[var(--accent-color)]"
      />

      {/* Context Menu for Pinned Files */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded border py-1 text-xs shadow-lg"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              void openFileFromPath(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)]"
          >
            Open File
          </button>
          <button
            type="button"
            onClick={() => startRename(contextMenu.item)}
            className="block w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)]"
          >
            Rename Alias
          </button>
          {contextMenu.item.customName && (
            <button
              type="button"
              onClick={() => {
                renamePinnedFile(contextMenu.item.id, '');
                setContextMenu(null);
              }}
              className="block w-full px-3 py-1.5 text-left hover:bg-[var(--bg-hover)]"
            >
              Reset Default Name
            </button>
          )}
          <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />
          <button
            type="button"
            onClick={() => {
              unpinFile(contextMenu.item.filePath);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-[var(--danger-color)] hover:bg-[var(--bg-hover)]"
          >
            Unpin File
          </button>
        </div>
      )}
    </aside>
  );
}
