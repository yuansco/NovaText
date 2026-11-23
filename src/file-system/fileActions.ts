import { getNovaAPI, hasNovaAPI } from '@/ipc/novaApi';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { useTabStore } from '@/stores/useTabStore';

export async function openFileFromPath(filePath: string): Promise<boolean> {
  if (!hasNovaAPI()) return false;
  try {
    const api = getNovaAPI();
    const result = await api.fs.readFile(filePath);
    useTabStore.getState().openFileResult(result);
    useSidebarStore.getState().recordRecentFile(result.filePath);
    void api.fs.watchFile(result.filePath);
    return true;
  } catch (error) {
    console.error('Failed to open file:', filePath, error);
    void useSidebarStore.getState().refreshPinnedExistence();
    return false;
  }
}

export async function reloadTabFromDisk(tabId: string): Promise<boolean> {
  if (!hasNovaAPI()) return false;
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab || !tab.filePath) return false;
  try {
    const result = await getNovaAPI().fs.readFile(tab.filePath);
    useTabStore.getState().reloadTabFromFileResult(tab.id, result);
    return true;
  } catch (error) {
    console.error('Failed to reload file:', tab.filePath, error);
    return false;
  }
}

export async function openFileDialog(): Promise<void> {
  if (!hasNovaAPI()) return;
  const paths = await getNovaAPI().dialog.openFile();
  for (const filePath of paths) {
    await openFileFromPath(filePath);
  }
}

export async function saveTabAs(tabId: string): Promise<boolean> {
  if (!hasNovaAPI()) return false;
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return false;

  const targetPath = await getNovaAPI().dialog.saveFile(tab.filePath ?? tab.title);
  if (!targetPath) return false;

  const result = await getNovaAPI().fs.writeFile(
    targetPath,
    tab.content,
    tab.encoding,
    tab.lineEnding,
  );
  useTabStore.getState().markTabSaved(tab.id, result.filePath, tab.content, result.byteSize);
  useSidebarStore.getState().recordRecentFile(result.filePath);
  void useSidebarStore.getState().refreshPinnedExistence();
  return true;
}

export async function saveTab(tabId: string): Promise<boolean> {
  if (!hasNovaAPI()) return false;
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return false;

  if (!tab.filePath) {
    return saveTabAs(tabId);
  }

  const result = await getNovaAPI().fs.writeFile(
    tab.filePath,
    tab.content,
    tab.encoding,
    tab.lineEnding,
  );
  useTabStore.getState().markTabSaved(tab.id, result.filePath, tab.content, result.byteSize);
  return true;
}

export async function closeTabWithConfirm(tabId: string): Promise<boolean> {
  const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
  if (!tab) return true;

  if (tab.isDirty && hasNovaAPI()) {
    const choice = await getNovaAPI().dialog.confirmUnsaved(tab.title);
    if (choice === 'cancel') {
      return false;
    }
    if (choice === 'save') {
      const saved = await saveTab(tabId);
      if (!saved) return false;
    }
  }

  useTabStore.getState().closeTabImmediate(tabId);
  if (tab.filePath && hasNovaAPI()) {
    const stillOpen = useTabStore.getState().tabs.some((t) => t.filePath === tab.filePath);
    if (!stillOpen) {
      void getNovaAPI().fs.unwatchFile(tab.filePath);
    }
  }
  return true;
}

export async function closeOtherTabs(targetTabId: string): Promise<void> {
  const tabs = [...useTabStore.getState().tabs];
  for (const tab of tabs) {
    if (tab.id !== targetTabId) {
      const closed = await closeTabWithConfirm(tab.id);
      if (!closed) return;
    }
  }
}

export async function closeTabsToTheRight(targetTabId: string): Promise<void> {
  const tabs = [...useTabStore.getState().tabs];
  const idx = tabs.findIndex((t) => t.id === targetTabId);
  if (idx === -1) return;
  const tabsToClose = tabs.slice(idx + 1);
  for (const tab of tabsToClose) {
    const closed = await closeTabWithConfirm(tab.id);
    if (!closed) return;
  }
}

export async function closeSavedTabs(): Promise<void> {
  const tabs = [...useTabStore.getState().tabs];
  for (const tab of tabs) {
    if (!tab.isDirty) {
      await closeTabWithConfirm(tab.id);
    }
  }
}

export async function closeAllTabs(): Promise<void> {
  const tabs = [...useTabStore.getState().tabs];
  for (const tab of tabs) {
    const closed = await closeTabWithConfirm(tab.id);
    if (!closed) return;
  }
}

export async function showItemInFolder(filePath: string): Promise<void> {
  if (!hasNovaAPI()) return;
  const api = getNovaAPI();
  if (api.app.showItemInFolder) {
    await api.app.showItemInFolder(filePath);
  }
}

export async function handleWindowCloseRequest(): Promise<void> {
  if (!hasNovaAPI()) return;
  const tabsSnapshot = [...useTabStore.getState().tabs];

  for (const tab of tabsSnapshot) {
    if (tab.isDirty) {
      useTabStore.getState().setActiveTab(tab.id);
      const choice = await getNovaAPI().dialog.confirmUnsaved(tab.title);
      if (choice === 'cancel') {
        return;
      }
      if (choice === 'save') {
        const saved = await saveTab(tab.id);
        if (!saved) return;
      }
    }
  }

  const currentState = useTabStore.getState();
  const openFilePaths = currentState.tabs
    .map((t) => t.filePath)
    .filter((p): p is string => Boolean(p));
  const activeTab = currentState.getActiveTab();

  await getNovaAPI().store.saveState({
    openFilePaths,
    activeFilePath: activeTab?.filePath ?? null,
  });

  getNovaAPI().window.confirmClose();
}
