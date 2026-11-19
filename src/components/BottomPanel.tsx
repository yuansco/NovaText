import { useEffect, useState } from 'react';
import { FolderSearch, Terminal as TerminalIcon, X } from 'lucide-react';
import { useT } from '@/i18n/translations';
import { FolderSearchPanel } from '@/search/FolderSearchPanel';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { TerminalPanel } from '@/terminal/TerminalPanel';

export function BottomPanel() {
  const { isOpen, activeView, height, setOpen, setActiveView, setHeight } =
    useBottomPanelStore();
  const [isResizing, setIsResizing] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nextHeight = window.innerHeight - e.clientY - 24;
      setHeight(nextHeight);
    };
    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setHeight]);

  if (!isOpen) return null;

  return (
    <section
      className="relative flex shrink-0 flex-col border-t"
      style={{
        height: `${height}px`,
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Top Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 left-0 h-1 w-full cursor-row-resize hover:bg-[var(--accent-color)]"
      />

      {/* Panel View Switcher */}
      <div
        className="flex items-center justify-between border-b px-2 py-1 text-xs select-none"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveView('terminal')}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 ${
              activeView === 'terminal'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <TerminalIcon size={12} />
            <span>{t.terminalTab}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('folder-search')}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 ${
              activeView === 'folder-search'
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <FolderSearch size={12} />
            <span>{t.findInFolderTab}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          title={t.closePanelTitle}
          className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeView === 'terminal' ? <TerminalPanel /> : <FolderSearchPanel />}
      </div>
    </section>
  );
}
