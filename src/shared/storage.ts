export type GraphMode = 'repo-only' | 'network';

export type Theme = 'dark' | 'light';

export type GraphPrefs = {
  mode: GraphMode;
  theme: Theme;
};

export type RecentRepo = {
  owner: string;
  repo: string;
  openedAt: number;
};

export type LocalSchema = {
  graphPrefs: GraphPrefs;
  recentRepos: RecentRepo[];
};

export const DEFAULT_GRAPH_PREFS: GraphPrefs = { mode: 'network', theme: 'dark' };

export const MAX_RECENT_REPOS = 6;

export const LOCAL_DEFAULTS: LocalSchema = {
  graphPrefs: DEFAULT_GRAPH_PREFS,
  recentRepos: [],
};

const LOCAL_KEYS = Object.keys(LOCAL_DEFAULTS) as (keyof LocalSchema)[];

// 旧バージョンで保存された graphPrefs に新フィールド (theme 等) を補完する。
// 他キーは shape が変わらないので素通し。
function normalize<K extends keyof LocalSchema>(key: K, value: unknown): LocalSchema[K] {
  if (key === 'graphPrefs') {
    const v = (value ?? {}) as Partial<GraphPrefs>;
    return { ...DEFAULT_GRAPH_PREFS, ...v } as LocalSchema[K];
  }
  return (value ?? LOCAL_DEFAULTS[key]) as LocalSchema[K];
}

type Listener = () => void;

// chrome.storage.local の同期 snapshot を提供する external store。
// React 側は useLocalValue (useSyncExternalStore) からこれを購読する。
// 同タブの書き込みは set 時に optimistic 反映、他タブ/他コンテキストの
// 書き込みは chrome.storage.onChanged 経由で反映される。
class LocalStoreCache {
  private snapshots: { [K in keyof LocalSchema]: LocalSchema[K] };
  private listeners: { [K in keyof LocalSchema]: Set<Listener> };
  private hydrated = new Set<keyof LocalSchema>();
  private hydrating = new Map<keyof LocalSchema, Promise<void>>();
  private onChangedRegistered = false;

  constructor() {
    this.snapshots = { ...LOCAL_DEFAULTS };
    this.listeners = { graphPrefs: new Set(), recentRepos: new Set() };
  }

  getSnapshot<K extends keyof LocalSchema>(key: K): LocalSchema[K] {
    return this.snapshots[key];
  }

  subscribe<K extends keyof LocalSchema>(key: K, listener: Listener): () => void {
    this.ensureOnChangedRegistered();
    void this.ensureHydrated(key);
    this.listeners[key].add(listener);
    return () => {
      this.listeners[key].delete(listener);
    };
  }

  // localStore.set / 内部 get からの同期書き込み (= optimistic update)。
  // chrome.storage.onChanged で同じ値が後追いで来ても Object.is で抑止される。
  // ここで hydrated フラグを立てておくことで、平行して走っている初回 get の
  // 後追い解決が optimistic な新値を古い値で上書きするのを防ぐ。
  applyLocalWrite<K extends keyof LocalSchema>(key: K, value: LocalSchema[K]): void {
    this.hydrated.add(key);
    if (Object.is(this.snapshots[key], value)) return;
    this.snapshots[key] = value;
    this.emit(key);
  }

  reset(): void {
    this.snapshots = { ...LOCAL_DEFAULTS };
    for (const k of LOCAL_KEYS) this.listeners[k].clear();
    this.hydrated.clear();
    this.hydrating.clear();
    this.onChangedRegistered = false;
  }

  private emit<K extends keyof LocalSchema>(key: K): void {
    for (const l of this.listeners[key]) l();
  }

  private ensureHydrated<K extends keyof LocalSchema>(key: K): Promise<void> {
    if (this.hydrated.has(key)) return Promise.resolve();
    const existing = this.hydrating.get(key);
    if (existing) return existing;
    const p = chrome.storage.local
      .get({ [key]: LOCAL_DEFAULTS[key] })
      .then((data: Record<string, unknown>) => {
        this.hydrating.delete(key);
        // get 解決前に optimistic write / onChanged で hydrated が立っていたら、
        // 自身は古い情報なので破棄する。
        if (this.hydrated.has(key)) return;
        this.hydrated.add(key);
        const next = normalize(key, data[key as string]);
        if (!Object.is(this.snapshots[key], next)) {
          this.snapshots[key] = next;
          this.emit(key);
        }
      });
    this.hydrating.set(key, p);
    return p;
  }

  private ensureOnChangedRegistered(): void {
    if (this.onChangedRegistered) return;
    const onChanged = chrome.storage?.onChanged;
    if (!onChanged?.addListener) return;
    onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const record = changes as Record<string, { newValue?: unknown }>;
      for (const k of LOCAL_KEYS) {
        if (!(k in record)) continue;
        this.applyExternalChange(k, record[k as string].newValue);
      }
    });
    this.onChangedRegistered = true;
  }

  private applyExternalChange<K extends keyof LocalSchema>(key: K, raw: unknown): void {
    // 外部書き込みは hydrate より新しい情報。後追いの初回 get の上書きを防ぐ。
    this.hydrated.add(key);
    const next = normalize(key, raw);
    if (Object.is(this.snapshots[key], next)) return;
    this.snapshots[key] = next;
    this.emit(key);
  }
}

export const localStoreCache = new LocalStoreCache();

// vi.stubGlobal('chrome', ...) で chrome ごと差し替わるテスト環境向け。
// プロダクションコードからは呼ばないこと。
export function __resetLocalStoreCacheForTest(): void {
  localStoreCache.reset();
}

export const localStore = {
  async get<K extends keyof LocalSchema>(key: K): Promise<LocalSchema[K]> {
    const data = await chrome.storage.local.get({ [key]: LOCAL_DEFAULTS[key] });
    const value = normalize(key, data[key]);
    localStoreCache.applyLocalWrite(key, value);
    return value;
  },
  async set<K extends keyof LocalSchema>(key: K, value: LocalSchema[K]): Promise<void> {
    localStoreCache.applyLocalWrite(key, value);
    await chrome.storage.local.set({ [key]: value });
  },
};

function sameRepo(a: { owner: string; repo: string }, b: { owner: string; repo: string }) {
  return a.owner.toLowerCase() === b.owner.toLowerCase() &&
    a.repo.toLowerCase() === b.repo.toLowerCase();
}

export async function recordRecentRepo(owner: string, repo: string): Promise<void> {
  if (!owner || !repo) return;
  const list = await localStore.get('recentRepos');
  const filtered = list.filter((entry) => !sameRepo(entry, { owner, repo }));
  const next: RecentRepo[] = [
    { owner, repo, openedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_REPOS);
  await localStore.set('recentRepos', next);
}
