import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, FileText, Search } from 'lucide-react';
import {
  closeTabWithConfirm,
  openFileDialog,
  openFileFromPath,
  saveTab,
  saveTabAs,
} from '@/file-system/fileActions';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const settings = useSettingsStore((s) => s.settings);
  const pinnedFiles = useSidebarStore((s) => s.pinnedFiles);
  const recentFiles = useSidebarStore((s) => s.recentFiles);
  const tabs = useTabStore((s) => s.tabs);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const kb = settings.keybindings;
    const baseCommands: PaletteItem[] = [
      {
        id: 'file.new',
        label: 'New File',
        category: 'File',
        shortcut: kb['file.new'],
        action: () => useTabStore.getState().createNewTab(),
      },
      {
        id: 'file.open',
        label: 'Open File...',
        category: 'File',
        shortcut: kb['file.open'],
        action: () => void openFileDialog(),
      },
      {
        id: 'file.save',
        label: 'Save File',
        category: 'File',
        shortcut: kb['file.save'],
        action: () => {
          const active = useTabStore.getState().getActiveTab();
          if (active) void saveTab(active.id);
        },
      },
      {
        id: 'file.saveAs',
        label: 'Save File As...',
        category: 'File',
        shortcut: kb['file.saveAs'],
        action: () => {
          const active = useTabStore.getState().getActiveTab();
          if (active) void saveTabAs(active.id);
        },
      },
      {
        id: 'tab.close',
        label: 'Close Active Tab',
        category: 'Tabs',
        shortcut: kb['tab.close'],
        action: () => {
          const active = useTabStore.getState().getActiveTab();
          if (active) void closeTabWithConfirm(active.id);
        },
      },
      {
        id: 'search.find',
        label: 'Find in File',
        category: 'Search',
        shortcut: kb['search.find'],
        action: () => useSearchStore.getState().toggleFind(),
      },
      {
        id: 'search.replace',
        label: 'Replace in File',
        category: 'Search',
        shortcut: kb['search.replace'],
        action: () => useSearchStore.getState().toggleReplace(),
      },
      {
        id: 'search.results',
        label: 'Toggle Search Results Panel',
        category: 'Search',
        action: () => useSearchStore.getState().toggleResultsPanel(),
      },
      {
        id: 'search.findInFolder',
        label: 'Find in Folder...',
        category: 'Search',
        shortcut: kb['search.findInFolder'],
        action: () => useBottomPanelStore.getState().toggleFolderSearch(),
      },
      {
        id: 'view.toggleTerminal',
        label: 'Toggle Integrated Terminal',
        category: 'View',
        shortcut: kb['view.toggleTerminal'],
        action: () => useBottomPanelStore.getState().toggleTerminal(),
      },
      {
        id: 'view.toggleSidebar',
        label: 'Toggle Sidebar',
        category: 'View',
        shortcut: kb['view.toggleSidebar'],
        action: () => {
          const cur = useSettingsStore.getState().settings.ui.sidebarCollapsed;
          useSettingsStore.getState().updateUI({ sidebarCollapsed: !cur });
        },
      },
      {
        id: 'view.toggleTheme',
        label: 'Toggle Dark / Light Theme',
        category: 'View',
        action: () => useSettingsStore.getState().toggleDarkLight(),
      },
      {
        id: 'editor.toggleWrap',
        label: 'Toggle Word Wrap',
        category: 'Editor',
        action: () => {
          const cur = useSettingsStore.getState().settings.editor.wordWrap;
          useSettingsStore.getState().updateEditor({ wordWrap: !cur });
        },
      },
      {
        id: 'editor.zoomIn',
        label: 'Increase Editor Font Size',
        category: 'Editor',
        shortcut: kb['editor.zoomIn'],
        action: () => useSettingsStore.getState().zoomEditorFont(1),
      },
      {
        id: 'editor.zoomOut',
        label: 'Decrease Editor Font Size',
        category: 'Editor',
        shortcut: kb['editor.zoomOut'],
        action: () => useSettingsStore.getState().zoomEditorFont(-1),
      },
      {
        id: 'editor.zoomReset',
        label: 'Reset Editor Font Size',
        category: 'Editor',
        shortcut: kb['editor.zoomReset'],
        action: () => useSettingsStore.getState().resetEditorFont(),
      },
      {
        id: 'view.toggleSettings',
        label: 'Toggle Settings',
        category: 'Preferences',
        shortcut: kb['view.toggleSettings'] ?? 'Ctrl+,',
        action: onOpenSettings,
      },
    ];

    const tabItems: PaletteItem[] = tabs.map((t) => ({
      id: `switch-tab:${t.id}`,
      label: `Switch to Tab: ${t.title}`,
      category: 'Open Tab',
      action: () => useTabStore.getState().setActiveTab(t.id),
    }));

    const seenPaths = new Set<string>();
    const fileItems: PaletteItem[] = [];
    for (const p of pinnedFiles) {
      seenPaths.add(p.filePath);
      fileItems.push({
        id: `open-pinned:${p.filePath}`,
        label: p.customName ? `${p.customName} (${p.fileName})` : p.fileName,
        category: 'Pinned',
        action: () => void openFileFromPath(p.filePath),
      });
    }
    for (const r of recentFiles) {
      if (seenPaths.has(r.filePath)) continue;
      fileItems.push({
        id: `open-recent:${r.filePath}`,
        label: r.fileName,
        category: 'Recent',
        action: () => void openFileFromPath(r.filePath),
      });
    }

    return [...baseCommands, ...tabItems, ...fileItems];
  }, [settings.keybindings, tabs, pinnedFiles, recentFiles, onOpenSettings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!isOpen) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    item.action();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 pt-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 border-b px-3 py-2.5"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Search size={15} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                runItem(filtered[safeIndex]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Type a command or file name..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>

        <ul className="max-h-80 overflow-y-auto p-1 text-xs">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-[var(--text-muted)]">
              No matching commands or files.
            </li>
          ) : (
            filtered.map((item, idx) => {
              const selected = idx === safeIndex;
              const isFile = item.category === 'Pinned' || item.category === 'Recent';
              return (
                <li
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => runItem(item)}
                  className={`flex cursor-pointer items-center justify-between rounded px-2.5 py-2 ${
                    selected
                      ? 'bg-[var(--accent-color)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isFile ? (
                      <FileText size={13} className="shrink-0 opacity-80" />
                    ) : (
                      <Command size={13} className="shrink-0 opacity-80" />
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.shortcut && (
                    <kbd
                      className={`ml-2 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
                        selected
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
