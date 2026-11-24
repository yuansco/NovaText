import { useEffect } from 'react';
import {
  closeTabWithConfirm,
  openFileDialog,
  saveTab,
  saveTabAs,
} from '@/file-system/fileActions';
import { useBottomPanelStore } from '@/stores/useBottomPanelStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useTabStore } from '@/stores/useTabStore';
import { matchesShortcut } from '@/utils/shortcuts';

export function useKeyboardShortcuts(
  onToggleCommandPalette: () => void,
  onToggleSettings?: () => void,
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      if (e.key === 'F3') {
        e.preventDefault();
        return;
      }

      const kb = useSettingsStore.getState().settings.keybindings;

      if (matchesShortcut(e, kb['view.commandPalette'])) {
        e.preventDefault();
        onToggleCommandPalette();
        return;
      }

      if (matchesShortcut(e, kb['file.open'])) {
        e.preventDefault();
        void openFileDialog();
        return;
      }

      if (matchesShortcut(e, kb['file.new'])) {
        e.preventDefault();
        useTabStore.getState().createNewTab();
        return;
      }

      if (matchesShortcut(e, kb['file.saveAs'])) {
        e.preventDefault();
        const activeTab = useTabStore.getState().getActiveTab();
        if (activeTab) void saveTabAs(activeTab.id);
        return;
      }

      if (matchesShortcut(e, kb['file.save'])) {
        e.preventDefault();
        const activeTab = useTabStore.getState().getActiveTab();
        if (activeTab) void saveTab(activeTab.id);
        return;
      }

      if (matchesShortcut(e, kb['tab.close'])) {
        e.preventDefault();
        const activeTab = useTabStore.getState().getActiveTab();
        if (activeTab) void closeTabWithConfirm(activeTab.id);
        return;
      }

      if (matchesShortcut(e, kb['search.find'])) {
        e.preventDefault();
        useSearchStore.getState().toggleFind();
        return;
      }

      if (matchesShortcut(e, kb['search.replace'])) {
        e.preventDefault();
        useSearchStore.getState().toggleReplace();
        return;
      }

      if (matchesShortcut(e, kb['search.findInFolder'])) {
        e.preventDefault();
        useBottomPanelStore.getState().toggleFolderSearch();
        return;
      }

      if (matchesShortcut(e, kb['view.toggleSettings'] ?? 'Ctrl+,')) {
        e.preventDefault();
        onToggleSettings?.();
        return;
      }

      if (matchesShortcut(e, kb['view.toggleTerminal'])) {
        e.preventDefault();
        useBottomPanelStore.getState().toggleTerminal();
        return;
      }

      if (matchesShortcut(e, kb['view.toggleSidebar'])) {
        e.preventDefault();
        const settings = useSettingsStore.getState().settings;
        useSettingsStore
          .getState()
          .updateUI({ sidebarCollapsed: !settings.ui.sidebarCollapsed });
        return;
      }

      if (matchesShortcut(e, kb['editor.zoomIn'])) {
        e.preventDefault();
        useSettingsStore.getState().zoomEditorFont(1);
        return;
      }

      if (matchesShortcut(e, kb['editor.zoomOut'])) {
        e.preventDefault();
        useSettingsStore.getState().zoomEditorFont(-1);
        return;
      }

      if (matchesShortcut(e, kb['editor.zoomReset'])) {
        e.preventDefault();
        useSettingsStore.getState().resetEditorFont();
        return;
      }

      if (matchesShortcut(e, kb['ui.zoomIn'])) {
        e.preventDefault();
        useSettingsStore.getState().zoomUIScale(0.05);
        return;
      }

      if (matchesShortcut(e, kb['ui.zoomOut'])) {
        e.preventDefault();
        useSettingsStore.getState().zoomUIScale(-0.05);
        return;
      }

      if (matchesShortcut(e, kb['ui.zoomReset'])) {
        e.preventDefault();
        useSettingsStore.getState().resetUIScale();
        return;
      }

      const isTabNext =
        matchesShortcut(e, kb['tab.next']) ||
        (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowRight');
      const isTabPrev =
        matchesShortcut(e, kb['tab.prev']) ||
        (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === 'ArrowLeft');

      if (isTabNext || isTabPrev) {
        const { tabs, activeTabId, setActiveTab } = useTabStore.getState();
        if (tabs.length < 2 || !activeTabId) return;
        e.preventDefault();
        e.stopPropagation();
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        const nextIdx = isTabPrev
          ? (idx - 1 + tabs.length) % tabs.length
          : (idx + 1) % tabs.length;
        setActiveTab(tabs[nextIdx].id);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.deltaY === 0) return;

      e.preventDefault();
      e.stopPropagation();
      const direction = e.deltaY < 0 ? 1 : -1;

      if (e.altKey) {
        useSettingsStore.getState().zoomUIScale(direction * 0.05);
      } else {
        useSettingsStore.getState().zoomEditorFont(direction);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, [onToggleCommandPalette, onToggleSettings]);
}
