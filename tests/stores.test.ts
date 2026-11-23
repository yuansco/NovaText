import { beforeEach, describe, expect, it } from 'vitest';
import { useSidebarStore } from '../src/stores/useSidebarStore';
import { useTabStore } from '../src/stores/useTabStore';

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ pinnedFiles: [], recentFiles: [], filterQuery: '' });
  });

  it('pins, renames, reorders, and unpins files', () => {
    const store = useSidebarStore.getState();
    store.pinFile('/a/one.c');
    store.pinFile('/a/two.c');
    store.pinFile('/a/one.c'); // duplicate ignored

    let pinned = useSidebarStore.getState().pinnedFiles;
    expect(pinned).toHaveLength(2);
    expect(pinned[0].fileName).toBe('one.c');

    store.renamePinnedFile(pinned[0].id, 'Primary Driver');
    store.reorderPinnedFiles(0, 1);

    pinned = useSidebarStore.getState().pinnedFiles;
    expect(pinned[1].customName).toBe('Primary Driver');
    expect(pinned[0].fileName).toBe('two.c');

    store.unpinFile('/a/two.c');
    expect(useSidebarStore.getState().pinnedFiles).toHaveLength(1);
  });

  it('deduplicates recent files by path and keeps latest first', () => {
    const store = useSidebarStore.getState();
    store.recordRecentFile('/tmp/a.log');
    store.recordRecentFile('/tmp/b.log');
    store.recordRecentFile('/tmp/a.log');

    const recent = useSidebarStore.getState().recentFiles;
    expect(recent).toHaveLength(2);
    expect(recent[0].filePath).toBe('/tmp/a.log');

    store.removeRecentFile('/tmp/b.log');
    expect(useSidebarStore.getState().recentFiles).toHaveLength(1);

    store.clearRecentFiles();
    expect(useSidebarStore.getState().recentFiles).toHaveLength(0);
  });
});

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: null, untitledCounter: 1 });
  });

  it('creates tabs, tracks dirty state, and closes with fallback active tab', () => {
    const store = useTabStore.getState();
    const id1 = store.createNewTab();
    const id2 = store.createNewTab();

    expect(useTabStore.getState().tabs).toHaveLength(2);
    expect(useTabStore.getState().activeTabId).toBe(id2);

    store.updateTabContent(id2, 'hello');
    expect(useTabStore.getState().tabs[1].isDirty).toBe(true);

    store.markTabSaved(id2, '/tmp/hello.txt', 'hello', 5);
    const saved = useTabStore.getState().tabs[1];
    expect(saved.isDirty).toBe(false);
    expect(saved.title).toBe('hello.txt');

    store.closeTabImmediate(id2);
    expect(useTabStore.getState().activeTabId).toBe(id1);
  });

  it('reorders tabs correctly', () => {
    const store = useTabStore.getState();
    const id1 = store.createNewTab();
    const id2 = store.createNewTab();
    const id3 = store.createNewTab();

    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id1, id2, id3]);

    // Move first tab to last
    store.reorderTabs(0, 2);
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id2, id3, id1]);

    // Move last tab to middle
    store.reorderTabs(2, 1);
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id2, id1, id3]);

    // Out of bounds or no-op
    store.reorderTabs(0, 0);
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id2, id1, id3]);

    store.reorderTabs(-1, 2);
    expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id2, id1, id3]);
  });

  it('updates tab scroll position and cursor', () => {
    const store = useTabStore.getState();
    const id = store.createNewTab();

    expect(useTabStore.getState().tabs[0].scrollTop).toBe(0);
    expect(useTabStore.getState().tabs[0].cursor).toEqual({ line: 1, col: 1 });

    store.updateTabScroll(id, 450);
    expect(useTabStore.getState().tabs[0].scrollTop).toBe(450);

    store.updateTabCursorAndScroll(id, 42, 10, 800);
    expect(useTabStore.getState().tabs[0].cursor).toEqual({ line: 42, col: 10 });
    expect(useTabStore.getState().tabs[0].scrollTop).toBe(800);
  });
});

