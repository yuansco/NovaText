import { FileCode2, Pin, PinOff, Plus, X } from 'lucide-react';
import { closeTabWithConfirm } from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, createNewTab } = useTabStore();
  const { pinnedFiles, pinFile, unpinFile } = useSidebarStore();
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
      <div className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isPinned = tab.filePath ? pinnedSet.has(tab.filePath) : false;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  void closeTabWithConfirm(tab.id);
                }
              }}
              title={tab.filePath ?? tab.title}
              className="group relative flex h-full min-w-[130px] max-w-[240px] cursor-pointer items-center gap-2 border-r px-3 text-xs transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--bg-tab-active)' : 'var(--bg-tab-inactive)',
                borderColor: 'var(--border-color)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                borderTop: isActive
                  ? '2px solid var(--accent-color)'
                  : '2px solid transparent',
              }}
            >
              <FileCode2 size={14} className="shrink-0 opacity-85" />
              <span className="truncate flex-1">{tab.title}</span>

              {tab.filePath && (
                <button
                  type="button"
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
                  <X size={14} className="opacity-70 group-hover:opacity-100" />
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
