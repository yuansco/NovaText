import {
  Command,
  FilePlus2,
  FolderOpen,
  FolderSearch,
  Moon,
  PanelLeft,
  Save,
  Search,
  Settings,
  Sun,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { openFileDialog, saveTab } from '@/file-system/fileActions';
import { useT } from '@/i18n/translations';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTabStore } from '@/stores/useTabStore';
import { getUIThemeById } from '@/themes/presets';

interface HeaderToolbarProps {
  onOpenSettings: () => void;
  onOpenCommandPalette: () => void;
}

export function HeaderToolbar({ onOpenSettings, onOpenCommandPalette }: HeaderToolbarProps) {
  const { settings, updateUI, toggleDarkLight } = useSettingsStore();
  const { createNewTab, getActiveTab } = useTabStore();
  const { isOpen: isSearchOpen, toggleFind } = useSearchStore();
  const {
    isOpen: isBottomOpen,
    activeView: bottomView,
    toggleTerminal,
    toggleFolderSearch,
  } = useBottomPanelStore();

  const activeTab = getActiveTab();
  const isDark = getUIThemeById(settings.uiThemeId).mode === 'dark';
  const t = useT();

  return (
    <header
      className="flex shrink-0 items-center justify-between border-b px-2.5 select-none"
      style={{
        height: 'calc(36px * var(--ui-scale))',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateUI({ sidebarCollapsed: !settings.ui.sidebarCollapsed })}
          title={t.toggleSidebar}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <PanelLeft size={16} />
        </button>

        <span className="ml-1 mr-2 text-xs font-semibold tracking-wide text-[var(--text-primary)]">
          NovaText
        </span>

        <button
          type="button"
          onClick={() => createNewTab()}
          title={t.newFileTitle}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <FilePlus2 size={14} />
          <span className="hidden sm:inline">{t.newFile}</span>
        </button>

        <button
          type="button"
          onClick={() => void openFileDialog()}
          title={t.openFileTitle}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <FolderOpen size={14} />
          <span className="hidden sm:inline">{t.openFile}</span>
        </button>

        <button
          type="button"
          disabled={!activeTab}
          onClick={() => activeTab && void saveTab(activeTab.id)}
          title={t.saveFileTitle}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          <Save size={14} />
          <span className="hidden sm:inline">{t.saveFile}</span>
        </button>
      </div>

      <div className="hidden md:block truncate max-w-md text-xs text-[var(--text-secondary)] font-medium">
        {activeTab ? activeTab.filePath ?? activeTab.title : t.noFileOpen}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!activeTab}
          onClick={toggleFind}
          title={t.findTitle}
          className={`rounded p-1.5 transition-colors disabled:opacity-40 ${
            isSearchOpen
              ? 'bg-[var(--bg-hover)] text-[var(--accent-color)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Search size={15} />
        </button>

        <button
          type="button"
          onClick={toggleFolderSearch}
          title={t.findInFolder}
          className={`rounded p-1.5 transition-colors ${
            isBottomOpen && bottomView === 'folder-search'
              ? 'bg-[var(--bg-hover)] text-[var(--accent-color)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FolderSearch size={15} />
        </button>

        <button
          type="button"
          onClick={toggleTerminal}
          title={t.toggleTerminal}
          className={`rounded p-1.5 transition-colors ${
            isBottomOpen && bottomView === 'terminal'
              ? 'bg-[var(--bg-hover)] text-[var(--accent-color)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          <TerminalIcon size={15} />
        </button>

        <button
          type="button"
          onClick={onOpenCommandPalette}
          title={t.commandPalette}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Command size={15} />
        </button>

        <button
          type="button"
          onClick={toggleDarkLight}
          title={isDark ? t.switchToLight : t.switchToDark}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title={t.settings}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
}
