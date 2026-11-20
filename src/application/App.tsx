import { useEffect, useRef, useState } from 'react';
import { FilePlus2, FolderOpen } from 'lucide-react';
import { BottomPanel } from '@/components/BottomPanel';
import { CommandPalette } from '@/components/CommandPalette';
import { ExternalChangeBanner } from '@/components/ExternalChangeBanner';
import { HeaderToolbar } from '@/components/HeaderToolbar';
import { StatusBar } from '@/components/StatusBar';
import { CodeEditor } from '@/editor/CodeEditor';
import {
  handleWindowCloseRequest,
  openFileDialog,
  openFileFromPath,
} from '@/file-system/fileActions';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useT } from '@/i18n/translations';
import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { SearchBar } from '@/search/SearchBar';
import { SearchResultsPanel } from '@/search/SearchResultsPanel';
import { SettingsModal } from '@/settings/SettingsModal';
import { Sidebar } from '@/sidebar/Sidebar';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';
import { TabBar } from '@/tabs/TabBar';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragCounterRef = useRef(0);
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const createNewTab = useTabStore((s) => s.createNewTab);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const t = useT();

  useKeyboardShortcuts(() => setPaletteOpen(true));

  useEffect(() => {
    let cleanupBeforeClose: (() => void) | undefined;
    let cleanupFileChanged: (() => void) | undefined;
    let cleanupOpenFiles: (() => void) | undefined;

    const handleOpenFileOrDirectory = async (filePath: string) => {
      if (!hasNovaAPI()) return;
      const api = getNovaAPI();
      const isDir = await api.fs.isDirectory(filePath);
      if (isDir) {
        useBottomPanelStore.getState().setWorkspacePath(filePath);
        useBottomPanelStore.getState().openFolderSearch();
      } else {
        await openFileFromPath(filePath);
      }
    };

    const init = async () => {
      if (!hasNovaAPI()) return;
      const api = getNovaAPI();

      cleanupBeforeClose = api.window.onBeforeClose(() => {
        void handleWindowCloseRequest();
      });

      cleanupFileChanged = api.fs.onFileChanged((event) => {
        useTabStore
          .getState()
          .setExternalChange(event.filePath, event.type === 'unlink' ? 'deleted' : 'modified');
        void useSidebarStore.getState().refreshPinnedExistence();
      });

      cleanupOpenFiles = api.app.onOpenFiles((filePaths) => {
        void (async () => {
          for (const filePath of filePaths) {
            await handleOpenFileOrDirectory(filePath);
          }
        })();
      });

      const persisted = await api.store.loadState();
      useSettingsStore.getState().hydrate(persisted.settings);
      useSidebarStore
        .getState()
        .hydrate(persisted.pinnedFiles, persisted.recentFiles);
      if (persisted.workspacePath) {
        useBottomPanelStore.getState().setWorkspacePath(persisted.workspacePath);
      }
      await useSidebarStore.getState().refreshPinnedExistence();

      if (persisted.openFilePaths && persisted.openFilePaths.length > 0) {
        for (const filePath of persisted.openFilePaths) {
          await openFileFromPath(filePath);
        }
        if (persisted.activeFilePath) {
          const target = useTabStore
            .getState()
            .tabs.find((t) => t.filePath === persisted.activeFilePath);
          if (target) {
            useTabStore.getState().setActiveTab(target.id);
          }
        }
      }

      const pendingFiles = await api.app.getPendingFiles();
      if (pendingFiles.length > 0) {
        for (const filePath of pendingFiles) {
          await handleOpenFileOrDirectory(filePath);
        }
      }
    };

    void init();

    return () => {
      cleanupBeforeClose?.();
      cleanupFileChanged?.();
      cleanupOpenFiles?.();
    };
  }, []);

  useEffect(() => {
    const isExternalFileDrag = (e: DragEvent): boolean => {
      const types = e.dataTransfer?.types;
      return Boolean(types && Array.from(types).includes('Files'));
    };

    const onDragEnter = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDraggingFiles(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFiles(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      const hasFiles =
        isExternalFileDrag(e) || (e.dataTransfer?.files?.length ?? 0) > 0;
      if (!hasFiles) return;

      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);

      if (!hasNovaAPI() || !e.dataTransfer?.files) return;
      const api = getNovaAPI();
      const uniquePaths = Array.from(
        new Set(
          Array.from(e.dataTransfer.files)
            .map((file) => api.app.getPathForFile(file))
            .filter(Boolean),
        ),
      );

      void (async () => {
        for (const filePath of uniquePaths) {
          const isDir = await api.fs.isDirectory(filePath);
          if (isDir) {
            useBottomPanelStore.getState().setWorkspacePath(filePath);
            useBottomPanelStore.getState().openFolderSearch();
          } else {
            await openFileFromPath(filePath);
          }
        }
      })();
    };

    const onDragEnd = () => {
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
    };

    // Capture phase ensures CodeMirror/xterm cannot intercept dropped files as text
    window.addEventListener('dragenter', onDragEnter, true);
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('dragleave', onDragLeave, true);
    window.addEventListener('drop', onDrop, true);
    window.addEventListener('dragend', onDragEnd, true);

    return () => {
      window.removeEventListener('dragenter', onDragEnter, true);
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('dragleave', onDragLeave, true);
      window.removeEventListener('drop', onDrop, true);
      window.removeEventListener('dragend', onDragEnd, true);
    };
  }, []);

  return (
    <div
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}
    >
      {isDraggingFiles && (
        <div
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed bg-black/35 text-sm font-medium text-white"
          style={{ borderColor: 'var(--accent-color)' }}
        >
          {t.dropFilesToOpen}
        </div>
      )}
      <HeaderToolbar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TabBar />
          <SearchBar />
          {activeTab && <ExternalChangeBanner tab={activeTab} />}

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {activeTab ? (
              <CodeEditor tab={activeTab} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center select-none">
                <div className="space-y-1">
                  <h1 className="text-lg font-semibold tracking-wide text-[var(--text-primary)]">
                    NovaText
                  </h1>
                  <p className="text-xs text-[var(--text-muted)]">
                    {t.welcomeSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => createNewTab()}
                    className="flex items-center gap-1.5 rounded border px-3 py-1.5 hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <FilePlus2 size={14} />
                    {t.newFileShortcut}
                  </button>
                  <button
                    type="button"
                    onClick={() => void openFileDialog()}
                    className="flex items-center gap-1.5 rounded px-3 py-1.5 text-white"
                    style={{ backgroundColor: 'var(--accent-color)' }}
                  >
                    <FolderOpen size={14} />
                    {t.openFileShortcut}
                  </button>
                </div>
              </div>
            )}
          </div>

          <SearchResultsPanel />
          <BottomPanel />
        </main>
      </div>

      <StatusBar />

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    </div>
  );
}
