import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import enMessages from '../public/_locales/en/messages.json' with { type: 'json' };
import { __resetLocalStoreCacheForTest } from '@/shared/storage';

type I18nMessageEntry = {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string; example?: string }>;
};

// chrome.i18n のテスト用 fixture は en/messages.json を再利用する。
// (ja は本番ロケール解決経由でのみ使われるため、ユニットテストでは en で十分。)
const i18nFixture: Record<string, I18nMessageEntry> = enMessages as Record<
  string,
  I18nMessageEntry
>;

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type StorageAreaName = 'local' | 'sync' | 'managed' | 'session';
type StorageChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: StorageAreaName,
) => void;

type StorageArea = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

function createStorageArea(
  areaName: StorageAreaName,
  emit: (changes: Record<string, StorageChange>, areaName: StorageAreaName) => void,
): StorageArea {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
      if (keys === undefined || keys === null) {
        return Object.fromEntries(store);
      }
      if (typeof keys === 'string') {
        return store.has(keys) ? { [keys]: store.get(keys) } : {};
      }
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) if (store.has(k)) out[k] = store.get(k);
        return out;
      }
      const out: Record<string, unknown> = { ...keys };
      for (const k of Object.keys(keys)) if (store.has(k)) out[k] = store.get(k);
      return out;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      const changes: Record<string, StorageChange> = {};
      for (const [k, v] of Object.entries(items)) {
        const oldValue = store.get(k);
        store.set(k, v);
        changes[k] = { oldValue, newValue: v };
      }
      emit(changes, areaName);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const ks = Array.isArray(keys) ? keys : [keys];
      const changes: Record<string, StorageChange> = {};
      for (const k of ks) {
        if (store.has(k)) {
          changes[k] = { oldValue: store.get(k) };
          store.delete(k);
        }
      }
      if (Object.keys(changes).length > 0) emit(changes, areaName);
    }),
    clear: vi.fn(async () => {
      const changes: Record<string, StorageChange> = {};
      for (const [k, v] of store) changes[k] = { oldValue: v };
      store.clear();
      if (Object.keys(changes).length > 0) emit(changes, areaName);
    }),
  };
}

function createChromeMock() {
  const messageListeners: Array<
    (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void
  > = [];
  const onChangedListeners: StorageChangeListener[] = [];
  const emitStorageChange: StorageChangeListener = (changes, area) => {
    for (const l of onChangedListeners.slice()) l(changes, area);
  };
  return {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((cb: (typeof messageListeners)[number]) => {
          messageListeners.push(cb);
        }),
      },
      sendMessage: vi.fn(async (message: unknown) => {
        return new Promise((resolve) => {
          for (const listener of messageListeners) {
            const isAsync = listener(message, {}, resolve);
            if (isAsync) return;
          }
          resolve(undefined);
        });
      }),
      openOptionsPage: vi.fn(),
      getURL: vi.fn((path: string) => `github-network-graph://test-id/${path}`),
    },
    storage: {
      local: createStorageArea('local', emitStorageChange),
      sync: createStorageArea('sync', emitStorageChange),
      onChanged: {
        addListener: vi.fn((cb: StorageChangeListener) => {
          onChangedListeners.push(cb);
        }),
        removeListener: vi.fn((cb: StorageChangeListener) => {
          const i = onChangedListeners.indexOf(cb);
          if (i >= 0) onChangedListeners.splice(i, 1);
        }),
      },
    },
    action: { onClicked: { addListener: vi.fn() } },
    tabs: {
      query: vi.fn(async () => [] as Array<{ url?: string }>),
      create: vi.fn(async () => ({ id: 1 })),
    },
    i18n: {
      // chrome.i18n.getMessage の最小実装。
      //   1. messages.json の placeholders.<name>.content = "$N" → subsArr[N-1] にマップ
      //   2. メッセージ中の $NAME$ を解決済み値で置換 (Chrome 同様 case-insensitive)
      // 未定義キーは Chrome 本体と同じく空文字列を返す。
      getMessage: vi.fn((key: string, subs?: string | string[]): string => {
        const entry = i18nFixture[key];
        if (!entry) return '';
        let msg = entry.message;
        const subsArr = subs === undefined ? [] : Array.isArray(subs) ? subs : [subs];
        if (entry.placeholders) {
          for (const [name, def] of Object.entries(entry.placeholders)) {
            const idxMatch = /^\$(\d+)$/.exec(def.content);
            const replacement = idxMatch ? (subsArr[Number(idxMatch[1]) - 1] ?? '') : def.content;
            const re = new RegExp('\\$' + name + '\\$', 'gi');
            msg = msg.replace(re, replacement);
          }
        }
        return msg;
      }),
    },
  };
}

vi.stubGlobal('chrome', createChromeMock());

afterEach(() => {
  cleanup();
  vi.stubGlobal('chrome', createChromeMock());
  __resetLocalStoreCacheForTest();
});
