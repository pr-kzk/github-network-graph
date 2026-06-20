import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRAPH_PREFS,
  DEFAULT_TELEMETRY,
  LOCAL_DEFAULTS,
  MAX_RECENT_REPOS,
  localStore,
  localStoreCache,
  recordRecentRepo,
} from './storage';

describe('localStore', () => {
  it('returns the default graph prefs when unset', async () => {
    expect(await localStore.get('graphPrefs')).toEqual(DEFAULT_GRAPH_PREFS);
  });

  it('round-trips graph prefs', async () => {
    await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'light' });
    expect(await localStore.get('graphPrefs')).toEqual({ mode: 'repo-only', theme: 'light' });
  });

  it('back-fills missing theme on legacy graphPrefs values', async () => {
    await chrome.storage.local.set({ graphPrefs: { mode: 'repo-only' } });
    expect(await localStore.get('graphPrefs')).toEqual({
      mode: 'repo-only',
      theme: DEFAULT_GRAPH_PREFS.theme,
    });
  });

  it('returns the default recent repos when unset', async () => {
    expect(await localStore.get('recentRepos')).toEqual(LOCAL_DEFAULTS.recentRepos);
  });

  it('defaults telemetry to enabled with the prompt unseen', async () => {
    expect(await localStore.get('telemetry')).toEqual(DEFAULT_TELEMETRY);
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

describe('recordRecentRepo', () => {
  it('prepends the latest entry', async () => {
    await recordRecentRepo('numpy', 'numpy');
    await recordRecentRepo('facebook', 'react');
    const list = await localStore.get('recentRepos');
    expect(list.map((e) => `${e.owner}/${e.repo}`)).toEqual([
      'facebook/react',
      'numpy/numpy',
    ]);
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
