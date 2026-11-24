import { useEffect, useRef, useState } from 'react';
import { FileCode2, Pin, PinOff, Plus, X } from 'lucide-react';
import { getActiveEditorView } from '@/editor/editorController';
import {
  closeOtherTabs,
  closeTabsToTheRight,
  closeTabWithConfirm,
  reloadTabFromDisk,
  saveTab,
  saveTabAs,
  showItemInFolder,
} from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';

interface TabContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

export function TabBar() {
  const {
    tabs,
    activeTabId,
    setActiveTab,
    createNewTab,
    reorderTabs,
    toggleTabMarkdownPreview,
  } = useTabStore();
  const { pinnedFiles, pinFile, unpinFile } = useSidebarStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  const handleToggleMarkdownPreview = (tabId: string) => {
    const currentTab = tabs.find((t) => t.id === tabId);
    if (!currentTab) return;

    if (tabId === activeTabId && !currentTab.isMarkdownPreview) {
      const view = getActiveEditorView();
      if (view && view.scrollDOM) {
        const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
        const ratio = maxScroll > 0 ? view.scrollDOM.scrollTop / maxScroll : 0;
        useTabStore.getState().updateTabScrollRatio(tabId, ratio);
        useTabStore.getState().updateTabScroll(tabId, view.scrollDOM.scrollTop);
      }
    } else if (tabId !== activeTabId) {
      setActiveTab(tabId);
    }
    toggleTabMarkdownPreview(tabId);
  };

  const pinnedSet = new Set(pinnedFiles.map((p) => p.filePath));

  // Dismiss context menu on click outside, escape key, or window resize
  useEffect(() => {
    if (!contextMenu) return;

    const handleDismiss = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('click', handleDismiss);
    window.addEventListener('contextmenu', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleDismiss);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('contextmenu', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [contextMenu]);

  // Handle wheel scrolling over tab bar to scroll tabs horizontally
  useEffect(() => {
    const barEl = tabBarRef.current;
    const listEl = tabListRef.current;
    if (!barEl || !listEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;

      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta !== 0) {
        e.preventDefault();
        listEl.scrollLeft += delta;
      }
    };

    barEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      barEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Ensure active tab is scrolled into view when switching tabs
  useEffect(() => {
    if (!activeTabId || !tabListRef.current) return;
    const activeEl = tabListRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTabId}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeTabId]);

  // Handle double clicking on empty space in the tab bar to create a new file
  const handleTabBarDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isTab = (e.target as HTMLElement).closest('[data-tab-item]');
    const isButton = (e.target as HTMLElement).closest('button');
    if (!isTab && !isButton) {
      createNewTab();
    }
  };

  const targetTab = contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) : null;
  const targetTabIndex = contextMenu ? tabs.findIndex((t) => t.id === contextMenu.tabId) : -1;
  const isTargetPinned = targetTab?.filePath ? pinnedSet.has(targetTab.filePath) : false;
  const hasTabsToRight = targetTabIndex >= 0 && targetTabIndex < tabs.length - 1;
  const hasOtherTabs = tabs.length > 1;

  const menuPosition = contextMenu
    ? {
        x: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 220)),
        y: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 380)),
      }
    : null;

  return (
    <div
      ref={tabBarRef}
      onDoubleClick={handleTabBarDoubleClick}
      className="flex items-center overflow-hidden border-b select-none"
      style={{
        height: 'calc(var(--tab-height) * var(--ui-scale))',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div
        ref={tabListRef}
        className="tab-scrollbar flex flex-1 min-w-0 items-center overflow-x-auto h-full"
        onDragOver={(e) => {
          if (draggedIndex !== null) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedIndex !== null && tabs.length > 0) {
            reorderTabs(draggedIndex, tabs.length - 1);
          }
          setDraggedIndex(null);
          setDragOverIndex(null);
        }}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isPinned = tab.filePath ? pinnedSet.has(tab.filePath) : false;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;
          const isMarkdownFile =
            tab.title.toLowerCase().endsWith('.md') ||
            (tab.filePath ? tab.filePath.toLowerCase().endsWith('.md') : false);

          return (
            <div
              key={tab.id}
              data-tab-item="true"
              data-tab-id={tab.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', tab.id);
                e.dataTransfer.setData('application/x-novatext-tab', String(index));
                e.dataTransfer.effectAllowed = 'move';
                setDraggedIndex(index);
              }}
              onDragOver={(e) => {
                if (draggedIndex !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  if (dragOverIndex === index) {
                    setDragOverIndex(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedIndex !== null && draggedIndex !== index) {
                  reorderTabs(draggedIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab(tab.id);
                setContextMenu({
                  tabId: tab.id,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  void closeTabWithConfirm(tab.id);
                }
              }}
              title={tab.filePath ?? tab.title}
              className={`group relative flex h-full shrink-0 min-w-[120px] max-w-[240px] cursor-pointer items-center gap-1.5 border-r px-2.5 text-xs transition-colors ${
                isDragging ? 'opacity-40' : ''
              }`}
              style={{
                backgroundColor: isActive ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
                borderColor: 'var(--border-color)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                borderTop: isActive
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
                boxShadow: isDragOver ? 'inset 0 0 0 2px var(--accent-color)' : undefined,
              }}
            >
              <FileCode2 size={14} className="shrink-0 opacity-85" />
              <span className="truncate flex-1">{tab.title}</span>

              {/* MD Preview Toggle Button for .md files */}
              {isMarkdownFile && (
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMarkdownPreview(tab.id);
                  }}
                  title={tab.isMarkdownPreview ? t.switchToEditor : t.switchToMarkdownPreview}
                  className={`h-5 px-1.5 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-tight transition-all select-none ${
                    tab.isMarkdownPreview
                      ? 'flex bg-[var(--accent-color)] text-white shadow-sm ring-1 ring-[var(--accent-color)]'
                      : isActive
                        ? 'flex text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:bg-[var(--bg-hover)]'
                        : 'hidden group-hover:flex text-[var(--text-secondary)] border border-[var(--border-color)]/60 hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  MD
                </button>
              )}

              {tab.filePath && (
                <button
                  type="button"
                  draggable={false}
                  onDragStart={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!tab.filePath) return;
                    if (isPinned) unpinFile(tab.filePath);
                    else pinFile(tab.filePath);
                  }}
                  title={isPinned ? t.unpinFile : t.pinFile}
                  className={`h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity hover:bg-[var(--bg-hover)] ${
                    isPinned
                      ? 'flex opacity-85 text-[var(--accent-color)]'
                      : 'hidden group-hover:flex opacity-70 hover:opacity-100'
                  }`}
                >
                  {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
              )}

              <button
                type="button"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  void closeTabWithConfirm(tab.id);
                }}
                title={t.closeTabTitle}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-[var(--bg-hover)]"
              >
                {tab.isDirty ? (
                  <>
                    <span
                      className="h-2.5 w-2.5 rounded-full group-hover:hidden"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    />
                    <X size={13} className="hidden group-hover:block" />
                  </>
                ) : (
                  <X size={13} className="opacity-80 group-hover:opacity-100" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => createNewTab()}
        title={t.newFileTitle}
        className="flex h-full shrink-0 items-center justify-center px-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <Plus size={14} />
      </button>

      {/* Tab Context Menu */}
      {contextMenu && targetTab && menuPosition && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[210px] rounded-md border py-1 text-xs shadow-2xl select-none"
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Tab */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
            onClick={() => {
              setContextMenu(null);
              void closeTabWithConfirm(targetTab.id);
            }}
          >
            <span>{t.closeTab}</span>
            <span className="text-[10px] text-[var(--text-muted)]">Ctrl+W</span>
          </button>

          {/* Close Others */}
          <button
            type="button"
            disabled={!hasOtherTabs}
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => {
              setContextMenu(null);
              void closeOtherTabs(targetTab.id);
            }}
          >
            <span>{t.closeOtherTabs}</span>
          </button>

          {/* Close Tabs to the Right */}
          <button
            type="button"
            disabled={!hasTabsToRight}
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => {
              setContextMenu(null);
              void closeTabsToTheRight(targetTab.id);
            }}
          >
            <span>{t.closeTabsToTheRight}</span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

          {/* Save */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
            onClick={() => {
              setContextMenu(null);
              void saveTab(targetTab.id);
            }}
          >
            <span>{t.saveFile}</span>
            <span className="text-[10px] text-[var(--text-muted)]">Ctrl+S</span>
          </button>

          {/* Save As */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
            onClick={() => {
              setContextMenu(null);
              void saveTabAs(targetTab.id);
            }}
          >
            <span>{t.saveFileAs}</span>
            <span className="text-[10px] text-[var(--text-muted)]">Ctrl+Shift+S</span>
          </button>

          {/* Reload from disk */}
          {targetTab.filePath && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
              onClick={() => {
                setContextMenu(null);
                void reloadTabFromDisk(targetTab.id);
              }}
            >
              <span>{t.reloadFromDisk}</span>
            </button>
          )}

          {/* Markdown Preview Toggle in Context Menu */}
          {targetTab &&
            (targetTab.title.toLowerCase().endsWith('.md') ||
              (targetTab.filePath ? targetTab.filePath.toLowerCase().endsWith('.md') : false)) && (
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
                onClick={() => {
                  setContextMenu(null);
                  handleToggleMarkdownPreview(targetTab.id);
                }}
              >
                <span>
                  {targetTab.isMarkdownPreview ? t.switchToEditor : t.switchToMarkdownPreview}
                </span>
                <span className="rounded bg-[var(--accent-color)]/15 px-1 text-[10px] font-mono text-[var(--accent-color)]">
                  MD
                </span>
              </button>
            )}

          <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

          {/* Pin / Unpin */}
          {targetTab.filePath && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
              onClick={() => {
                setContextMenu(null);
                if (isTargetPinned) unpinFile(targetTab.filePath!);
                else pinFile(targetTab.filePath!);
              }}
            >
              <span>{isTargetPinned ? t.unpinFile : t.pinFile}</span>
            </button>
          )}

          {/* Copy Path */}
          {targetTab.filePath && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
              onClick={() => {
                setContextMenu(null);
                void navigator.clipboard.writeText(targetTab.filePath!);
              }}
            >
              <span>{t.copyPath}</span>
            </button>
          )}

          {/* Copy Name */}
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
            onClick={() => {
              setContextMenu(null);
              void navigator.clipboard.writeText(targetTab.title);
            }}
          >
            <span>{t.copyFileName}</span>
          </button>

          {/* Reveal in File Manager */}
          {targetTab.filePath && (
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-[var(--bg-hover)] text-left"
              onClick={() => {
                setContextMenu(null);
                void showItemInFolder(targetTab.filePath!);
              }}
            >
              <span>{t.revealInFileManager}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
