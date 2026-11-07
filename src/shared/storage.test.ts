import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRAPH_LAYOUT,
  DEFAULT_GRAPH_PREFS,
  DETAIL_WIDTH_MAX,
  DETAIL_WIDTH_MIN,
  DEFAULT_TELEMETRY,
  LOCAL_DEFAULTS,
  MAX_RECENT_REPOS,
  localStore,
  localStoreCache,
  clearRecentRepos,
  recordRecentRepo,
  removeRecentRepo,
} from './storage';

describe('localStore', () => {
  it('starts every setting from its default, with the dark theme, when nothing is saved', async () => {
    expect(await localStore.get('graphPrefs')).toEqual(DEFAULT_GRAPH_PREFS);
    expect((await localStore.get('graphPrefs')).theme).toBe('dark');
    expect(await localStore.get('recentRepos')).toEqual(LOCAL_DEFAULTS.recentRepos);
    expect(await localStore.get('telemetry')).toEqual(DEFAULT_TELEMETRY);
  });

  it('round-trips graph prefs', async () => {
    await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'light' });
    expect(await localStore.get('graphPrefs')).toEqual({ mode: 'repo-only', theme: 'light' });
  });

  it('keeps dark for legacy graphPrefs saved before themes existed', async () => {
    await chrome.storage.local.set({ graphPrefs: { mode: 'repo-only' } });
    expect(await localStore.get('graphPrefs')).toEqual({ mode: 'repo-only', theme: 'dark' });
  });

  it.each(['system', 'dark', 'light'] as const)('accepts the saved %s theme', async (theme) => {
    await chrome.storage.local.set({ graphPrefs: { mode: 'network', theme } });
    expect((await localStore.get('graphPrefs')).theme).toBe(theme);
  });

  it('keeps dark for an unrecognised saved theme', async () => {
    await chrome.storage.local.set({ graphPrefs: { mode: 'network', theme: 'sepia' } });
    expect((await localStore.get('graphPrefs')).theme).toBe('dark');
  });

  it('keeps both fields when two partial updates start from the same stale snapshot', async () => {
    await localStore.set('graphPrefs', { mode: 'network', theme: 'dark' });
    const stale = await localStore.get('graphPrefs');

    await localStore.update('graphPrefs', { mode: 'repo-only' });
    await localStore.update('graphPrefs', { theme: 'light' });

    expect(stale).toEqual({ mode: 'network', theme: 'dark' });
    expect(await localStore.get('graphPrefs')).toEqual({ mode: 'repo-only', theme: 'light' });
  });

  it('keeps both fields when partial updates are issued without waiting', async () => {
    await Promise.all([
      localStore.update('graphLayout', { detailWidth: 500 }),
      localStore.update('graphLayout', { detailCollapsed: true }),
    ]);

    expect(await localStore.get('graphLayout')).toEqual({
      detailWidth: 500,
      detailCollapsed: true,
    });
  });

  it('merges a partial update into what is already stored before the cache was loaded', async () => {
    await chrome.storage.local.set({ telemetry: { enabled: false, promptSeen: false } });

    await localStore.update('telemetry', { promptSeen: true });

    expect(await localStore.get('telemetry')).toEqual({ enabled: false, promptSeen: true });
  });

  it('round-trips telemetry prefs', async () => {
    await localStore.set('telemetry', { enabled: false, promptSeen: true });
    expect(await localStore.get('telemetry')).toEqual({ enabled: false, promptSeen: true });
  });

  it('back-fills missing fields on legacy telemetry values', async () => {
    await chrome.storage.local.set({ telemetry: { enabled: false } });
    expect(await localStore.get('telemetry')).toEqual({
      enabled: false,
      promptSeen: DEFAULT_TELEMETRY.promptSeen,
    });
  });
});

describe('graphLayout', () => {
  it('defaults to an automatic width and collapsed state so the window size decides', async () => {
    expect(await localStore.get('graphLayout')).toEqual(DEFAULT_GRAPH_LAYOUT);
  });

  it('round-trips the saved layout', async () => {
    await localStore.set('graphLayout', { detailWidth: 500, detailCollapsed: true });
    expect(await localStore.get('graphLayout')).toEqual({
      detailWidth: 500,
      detailCollapsed: true,
    });
  });

  it.each([
    [10, DETAIL_WIDTH_MIN],
    [5000, DETAIL_WIDTH_MAX],
  ])('clamps a saved width of %i into the supported range', async (saved, expected) => {
    await chrome.storage.local.set({ graphLayout: { detailWidth: saved, detailCollapsed: false } });
    expect((await localStore.get('graphLayout')).detailWidth).toBe(expected);
  });

  it('falls back to defaults for malformed values', async () => {
    await chrome.storage.local.set({ graphLayout: { detailWidth: 'wide', detailCollapsed: 1 } });
    expect(await localStore.get('graphLayout')).toEqual(DEFAULT_GRAPH_LAYOUT);
  });
});

describe('removeRecentRepo', () => {
  it('removes only the matching entry, ignoring case', async () => {
    await recordRecentRepo('numpy', 'numpy');
    await recordRecentRepo('facebook', 'react');
    await removeRecentRepo('NumPy', 'NumPy');
    const list = await localStore.get('recentRepos');
    expect(list.map((e) => `${e.owner}/${e.repo}`)).toEqual(['facebook/react']);
  });
});

describe('clearRecentRepos', () => {
  it('empties the list', async () => {
    await recordRecentRepo('numpy', 'numpy');
    await clearRecentRepos();
    expect(await localStore.get('recentRepos')).toEqual([]);
  });
});

describe('recordRecentRepo', () => {
  it('prepends the latest entry', async () => {
    await recordRecentRepo('numpy', 'numpy');
    await recordRecentRepo('facebook', 'react');
    const list = await localStore.get('recentRepos');
    expect(list.map((e) => `${e.owner}/${e.repo}`)).toEqual(['facebook/react', 'numpy/numpy']);
  });

  it('deduplicates case-insensitively and moves to top', async () => {
    await recordRecentRepo('numpy', 'numpy');
    await recordRecentRepo('facebook', 'react');
    await recordRecentRepo('NumPy', 'NumPy');
    const list = await localStore.get('recentRepos');
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ owner: 'NumPy', repo: 'NumPy' });
    expect(list[1]).toMatchObject({ owner: 'facebook', repo: 'react' });
  });

  it(`caps the list at ${MAX_RECENT_REPOS} entries`, async () => {
    for (let i = 0; i < MAX_RECENT_REPOS + 3; i++) {
      await recordRecentRepo(`owner${i}`, `repo${i}`);
    }
    const list = await localStore.get('recentRepos');
    expect(list).toHaveLength(MAX_RECENT_REPOS);
    expect(list[0]).toMatchObject({
      owner: `owner${MAX_RECENT_REPOS + 2}`,
    });
  });

  it('ignores empty owner or repo', async () => {
    await recordRecentRepo('', 'repo');
    await recordRecentRepo('owner', '');
    expect(await localStore.get('recentRepos')).toEqual([]);
  });
});

describe('localStoreCache', () => {
  it('reflects localStore.set synchronously in the snapshot', async () => {
    let notified = 0;
    const unsub = localStoreCache.subscribe('graphPrefs', () => {
      notified += 1;
    });
    try {
      await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'dark' });
      expect(localStoreCache.getSnapshot('graphPrefs')).toEqual({
        mode: 'repo-only',
        theme: 'dark',
      });
      expect(notified).toBeGreaterThan(0);
    } finally {
      unsub();
    }
  });

  it('reflects chrome.storage.onChanged writes from outside localStore', async () => {
    let notified = 0;
    const unsub = localStoreCache.subscribe('recentRepos', () => {
      notified += 1;
    });
    try {
      await chrome.storage.local.set({
        recentRepos: [{ owner: 'foo', repo: 'bar', openedAt: 1 }],
      });
      expect(localStoreCache.getSnapshot('recentRepos')).toEqual([
        { owner: 'foo', repo: 'bar', openedAt: 1 },
      ]);
      expect(notified).toBeGreaterThan(0);
    } finally {
      unsub();
    }
  });

  it('falls back to defaults when a key is removed externally', async () => {
    await chrome.storage.local.set({
      graphPrefs: { mode: 'repo-only', theme: 'light' },
    });
    const unsub = localStoreCache.subscribe('graphPrefs', () => undefined);
    try {
      await chrome.storage.local.remove('graphPrefs');
      expect(localStoreCache.getSnapshot('graphPrefs')).toEqual(DEFAULT_GRAPH_PREFS);
    } finally {
      unsub();
    }
  });
});
