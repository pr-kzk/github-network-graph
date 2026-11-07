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

export type TelemetryPrefs = {
  enabled: boolean;
  promptSeen: boolean;
};

export type LocalSchema = {
  graphPrefs: GraphPrefs;
  recentRepos: RecentRepo[];
  telemetry: TelemetryPrefs;
};

export const DEFAULT_GRAPH_PREFS: GraphPrefs = { mode: 'network', theme: 'dark' };

export const DEFAULT_TELEMETRY: TelemetryPrefs = { enabled: true, promptSeen: false };

export const MAX_RECENT_REPOS = 6;

export const LOCAL_DEFAULTS: LocalSchema = {
  graphPrefs: DEFAULT_GRAPH_PREFS,
  recentRepos: [],
  telemetry: DEFAULT_TELEMETRY,
};

const LOCAL_KEYS = [
  'graphPrefs',
  'recentRepos',
  'telemetry',
] as const satisfies readonly (keyof LocalSchema)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGraphMode(value: unknown): value is GraphMode {
  return value === 'repo-only' || value === 'network';
}

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

function isRecentRepo(value: unknown): value is RecentRepo {
  return (
    isRecord(value) &&
    typeof value.owner === 'string' &&
    typeof value.repo === 'string' &&
    typeof value.openedAt === 'number'
  );
}

// chrome.storage から読んだ値は型を保証できないため、キーごとに検証して既定値で補完する。
// 旧バージョンで保存された graphPrefs に新フィールド (theme 等) が無い場合もここで埋まる。
const LOCAL_PARSERS: { [K in keyof LocalSchema]: (value: unknown) => LocalSchema[K] } = {
  graphPrefs: (value) => {
    const v = isRecord(value) ? value : {};
    return {
      mode: isGraphMode(v.mode) ? v.mode : DEFAULT_GRAPH_PREFS.mode,
      theme: isTheme(v.theme) ? v.theme : DEFAULT_GRAPH_PREFS.theme,
    };
  },
  recentRepos: (value) => (Array.isArray(value) ? value.filter(isRecentRepo) : []),
  telemetry: (value) => {
    const v = isRecord(value) ? value : {};
    return {
      enabled: typeof v.enabled === 'boolean' ? v.enabled : DEFAULT_TELEMETRY.enabled,
      promptSeen: typeof v.promptSeen === 'boolean' ? v.promptSeen : DEFAULT_TELEMETRY.promptSeen,
    };
  },
};

export function parseLocalValue<K extends keyof LocalSchema>(
  key: K,
  value: unknown,
): LocalSchema[K] {
  return LOCAL_PARSERS[key](value);
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
    this.listeners = { graphPrefs: new Set(), recentRepos: new Set(), telemetry: new Set() };
  }

  getSnapshot<K extends keyof LocalSchema>(key: K): LocalSchema[K] {
    return this.snapshots[key];
  }

  subscribe(key: keyof LocalSchema, listener: Listener): () => void {
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
    this.replaceSnapshot(key, value);
  }

  reset(): void {
    this.snapshots = { ...LOCAL_DEFAULTS };
    for (const k of LOCAL_KEYS) this.listeners[k].clear();
    this.hydrated.clear();
    this.hydrating.clear();
    this.onChangedRegistered = false;
  }

  private emit(key: keyof LocalSchema): void {
    for (const l of this.listeners[key]) l();
  }

  private ensureHydrated(key: keyof LocalSchema): Promise<void> {
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
        this.replaceSnapshot(key, parseLocalValue(key, data[key]));
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
      for (const k of LOCAL_KEYS) {
        const change = changes[k];
        if (change) this.applyExternalChange(k, change.newValue);
      }
    });
    this.onChangedRegistered = true;
  }

  private applyExternalChange(key: keyof LocalSchema, raw: unknown): void {
    // 外部書き込みは hydrate より新しい情報。後追いの初回 get の上書きを防ぐ。
    this.hydrated.add(key);
    this.replaceSnapshot(key, parseLocalValue(key, raw));
  }

  private replaceSnapshot<K extends keyof LocalSchema>(key: K, next: LocalSchema[K]): void {
    if (Object.is(this.snapshots[key], next)) return;
    this.snapshots[key] = next;
    this.emit(key);
  }
}

export const localStoreCache = new LocalStoreCache();

// vi.stubGlobal('chrome', ...) で chrome ごと差し替わるテスト環境向け。
// プロダクションコードからは呼ばないこと。
export function resetLocalStoreCacheForTest(): void {
  localStoreCache.reset();
}

export const localStore = {
  async get<K extends keyof LocalSchema>(key: K): Promise<LocalSchema[K]> {
    const data = await chrome.storage.local.get({ [key]: LOCAL_DEFAULTS[key] });
    const value = parseLocalValue(key, data[key]);
    localStoreCache.applyLocalWrite(key, value);
    return value;
  },
  async set<K extends keyof LocalSchema>(key: K, value: LocalSchema[K]): Promise<void> {
    localStoreCache.applyLocalWrite(key, value);
    await chrome.storage.local.set({ [key]: value });
  },
};

function sameRepo(a: { owner: string; repo: string }, b: { owner: string; repo: string }) {
  return (
    a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase()
  );
}

export async function recordRecentRepo(owner: string, repo: string): Promise<void> {
  if (!owner || !repo) return;
  const list = await localStore.get('recentRepos');
  const filtered = list.filter((entry) => !sameRepo(entry, { owner, repo }));
  const next: RecentRepo[] = [{ owner, repo, openedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT_REPOS,
  );
  await localStore.set('recentRepos', next);
}
