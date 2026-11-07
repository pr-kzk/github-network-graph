export type GraphMode = 'repo-only' | 'network';

export type Theme = 'system' | 'dark' | 'light';

type GraphPrefs = {
  mode: GraphMode;
  theme: Theme;
};

type RecentRepo = {
  owner: string;
  repo: string;
  openedAt: number;
};

export type TelemetryPrefs = {
  enabled: boolean;
  promptSeen: boolean;
};

type GraphLayout = {
  detailWidth: number | null;
  detailCollapsed: boolean | null;
};

export type LocalSchema = {
  graphPrefs: GraphPrefs;
  graphLayout: GraphLayout;
  recentRepos: RecentRepo[];
  telemetry: TelemetryPrefs;
};

export const DEFAULT_GRAPH_PREFS: GraphPrefs = { mode: 'network', theme: 'dark' };

export const DETAIL_WIDTH_MIN = 280;
export const DETAIL_WIDTH_MAX = 720;
export const DEFAULT_GRAPH_LAYOUT: GraphLayout = { detailWidth: null, detailCollapsed: null };

export const DEFAULT_TELEMETRY: TelemetryPrefs = { enabled: true, promptSeen: false };

export const MAX_RECENT_REPOS = 6;

export const LOCAL_DEFAULTS: LocalSchema = {
  graphPrefs: DEFAULT_GRAPH_PREFS,
  graphLayout: DEFAULT_GRAPH_LAYOUT,
  recentRepos: [],
  telemetry: DEFAULT_TELEMETRY,
};

const LOCAL_KEYS = [
  'graphPrefs',
  'graphLayout',
  'recentRepos',
  'telemetry',
] as const satisfies readonly (keyof LocalSchema)[];

export function clampDetailWidth(width: number): number {
  return Math.min(DETAIL_WIDTH_MAX, Math.max(DETAIL_WIDTH_MIN, Math.round(width)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isGraphMode(value: unknown): value is GraphMode {
  return value === 'repo-only' || value === 'network';
}

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'dark' || value === 'light';
}

function isRecentRepo(value: unknown): value is RecentRepo {
  return (
    isRecord(value) &&
    typeof value.owner === 'string' &&
    typeof value.repo === 'string' &&
    typeof value.openedAt === 'number'
  );
}

const LOCAL_PARSERS: { [K in keyof LocalSchema]: (value: unknown) => LocalSchema[K] } = {
  graphPrefs: (value) => {
    const v = isRecord(value) ? value : {};
    return {
      mode: isGraphMode(v.mode) ? v.mode : DEFAULT_GRAPH_PREFS.mode,
      theme: isTheme(v.theme) ? v.theme : DEFAULT_GRAPH_PREFS.theme,
    };
  },
  graphLayout: (value) => {
    const v = isRecord(value) ? value : {};
    return {
      detailWidth:
        typeof v.detailWidth === 'number' && Number.isFinite(v.detailWidth)
          ? clampDetailWidth(v.detailWidth)
          : null,
      detailCollapsed: typeof v.detailCollapsed === 'boolean' ? v.detailCollapsed : null,
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

class LocalStoreCache {
  private snapshots: { [K in keyof LocalSchema]: LocalSchema[K] };
  private listeners: { [K in keyof LocalSchema]: Set<Listener> };
  private hydrated = new Set<keyof LocalSchema>();
  private hydrating = new Map<keyof LocalSchema, Promise<void>>();
  private onChangedRegistered = false;

  constructor() {
    this.snapshots = { ...LOCAL_DEFAULTS };
    this.listeners = {
      graphPrefs: new Set(),
      graphLayout: new Set(),
      recentRepos: new Set(),
      telemetry: new Set(),
    };
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

  isHydrated(key: keyof LocalSchema): boolean {
    return this.hydrated.has(key);
  }

  ensureHydrated(key: keyof LocalSchema): Promise<void> {
    if (this.hydrated.has(key)) return Promise.resolve();
    const existing = this.hydrating.get(key);
    if (existing) return existing;
    const p = chrome.storage.local
      .get({ [key]: LOCAL_DEFAULTS[key] })
      .then((data: Record<string, unknown>) => {
        this.hydrating.delete(key);
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

export function resetLocalStoreCacheForTest(): void {
  localStoreCache.reset();
}

export async function preloadLocalValues(keys: readonly (keyof LocalSchema)[]): Promise<void> {
  await Promise.all(keys.map((key) => localStore.get(key)));
}

type PatchableKey = Exclude<keyof LocalSchema, 'recentRepos'>;

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
  async update<K extends PatchableKey>(key: K, patch: Partial<LocalSchema[K]>): Promise<void> {
    if (!localStoreCache.isHydrated(key)) await localStoreCache.ensureHydrated(key);
    await localStore.set(key, { ...localStoreCache.getSnapshot(key), ...patch });
  },
};

export function isSameRepo(a: { owner: string; repo: string }, b: { owner: string; repo: string }) {
  return (
    a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase()
  );
}

export async function recordRecentRepo(owner: string, repo: string): Promise<void> {
  if (!owner || !repo) return;
  const list = await localStore.get('recentRepos');
  const filtered = list.filter((entry) => !isSameRepo(entry, { owner, repo }));
  const next: RecentRepo[] = [{ owner, repo, openedAt: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT_REPOS,
  );
  await localStore.set('recentRepos', next);
}

export async function removeRecentRepo(owner: string, repo: string): Promise<void> {
  const list = await localStore.get('recentRepos');
  await localStore.set(
    'recentRepos',
    list.filter((entry) => !isSameRepo(entry, { owner, repo })),
  );
}

export function clearRecentRepos(): Promise<void> {
  return localStore.set('recentRepos', []);
}
