import { useState } from 'react';
import { FileCode2, Pin, PinOff, Plus, X } from 'lucide-react';
import { closeTabWithConfirm } from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, createNewTab, reorderTabs } = useTabStore();
  const { pinnedFiles, pinFile, unpinFile } = useSidebarStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const t = useT();

  const pinnedSet = new Set(pinnedFiles.map((p) => p.filePath));

  return (
    <div
      className="flex items-center overflow-x-auto border-b select-none"
      style={{
        height: 'calc(var(--tab-height) * var(--ui-scale))',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div
        className="flex flex-1 items-center overflow-x-auto h-full"
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

          return (
            <div
              key={tab.id}
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
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  void closeTabWithConfirm(tab.id);
                }
              }}
              title={tab.filePath ?? tab.title}
              className={`group relative flex h-full min-w-[130px] max-w-[240px] cursor-pointer items-center gap-2 border-r px-3 text-xs transition-colors ${
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
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity hover:bg-[var(--bg-hover)] ${
                    isPinned ? 'opacity-85 text-[var(--accent-color)]' : 'opacity-0 group-hover:opacity-80'
                  }`}
                >
                  {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
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
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-[var(--bg-hover)]"
              >
                {tab.isDirty ? (
                  <>
                    <span
                      className="h-2.5 w-2.5 rounded-full group-hover:hidden"
                      style={{ backgroundColor: 'var(--accent-color)' }}
                    />
                    <X size={14} className="hidden group-hover:block" />
                  </>
                ) : (
                  <X size={14} className="opacity-80 group-hover:opacity-100" />
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
        className="flex h-full items-center justify-center px-2.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
