import '@testing-library/jest-dom/vitest';
import { afterEach, vi, type Mock } from 'vitest';
import { cleanup } from '@testing-library/react';
import enMessages from '../public/_locales/en/messages.json' with { type: 'json' };
import { resetLocalStoreCacheForTest } from '@/shared/storage';

type I18nMessageEntry = {
  message: string;
  description?: string;
  placeholders?: Record<string, { content: string; example?: string }>;
};

const i18nFixture: Record<string, I18nMessageEntry> = enMessages;

type StorageChange = { oldValue?: unknown; newValue?: unknown };
type StorageAreaName = 'local' | 'sync' | 'managed' | 'session';
type StorageChangeListener = (
  changes: Record<string, StorageChange>,
  areaName: StorageAreaName,
) => void;

type StorageGet = (
  keys?: string | string[] | Record<string, unknown>,
) => Promise<Record<string, unknown>>;
type StorageSet = (items: Record<string, unknown>) => Promise<void>;
type StorageRemove = (keys: string | string[]) => Promise<void>;
type StorageClear = () => Promise<void>;
type MessageListener = (
  msg: unknown,
  sender: unknown,
  sendResponse: (r: unknown) => void,
) => boolean | void;

type StorageArea = {
  get: Mock<StorageGet>;
  set: Mock<StorageSet>;
  remove: Mock<StorageRemove>;
  clear: Mock<StorageClear>;
};

function createStorageArea(
  areaName: StorageAreaName,
  emit: (changes: Record<string, StorageChange>, areaName: StorageAreaName) => void,
): StorageArea {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn<StorageGet>(async (keys) => {
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
    set: vi.fn<StorageSet>(async (items) => {
      const changes: Record<string, StorageChange> = {};
      for (const [k, v] of Object.entries(items)) {
        const oldValue = store.get(k);
        store.set(k, v);
        changes[k] = { oldValue, newValue: v };
      }
      emit(changes, areaName);
    }),
    remove: vi.fn<StorageRemove>(async (keys) => {
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
    clear: vi.fn<StorageClear>(async () => {
      const changes: Record<string, StorageChange> = {};
      for (const [k, v] of store) changes[k] = { oldValue: v };
      store.clear();
      if (Object.keys(changes).length > 0) emit(changes, areaName);
    }),
  };
}

function createChromeMock() {
  const messageListeners: MessageListener[] = [];
  const onChangedListeners: StorageChangeListener[] = [];
  const emitStorageChange: StorageChangeListener = (changes, area) => {
    for (const l of onChangedListeners.slice()) l(changes, area);
  };
  return {
    runtime: {
      id: 'test-extension-id',
      onInstalled: { addListener: vi.fn<(cb: () => void) => void>() },
      onMessage: {
        addListener: vi.fn<(cb: MessageListener) => void>((cb) => {
          messageListeners.push(cb);
        }),
        removeListener: vi.fn<(cb: MessageListener) => void>((cb) => {
          const i = messageListeners.indexOf(cb);
          if (i >= 0) messageListeners.splice(i, 1);
        }),
      },
      sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(async (message) => {
        return new Promise((resolve) => {
          for (const listener of messageListeners) {
            const isAsync = listener(message, { id: 'test-extension-id' }, resolve);
            if (isAsync) return;
          }
          resolve(undefined);
        });
      }),
      openOptionsPage: vi.fn<() => void>(),
      getURL: vi.fn<(path: string) => string>((path) => `github-network-graph://test-id/${path}`),
    },
    storage: {
      local: createStorageArea('local', emitStorageChange),
      sync: createStorageArea('sync', emitStorageChange),
      session: createStorageArea('session', emitStorageChange),
      onChanged: {
        addListener: vi.fn<(cb: StorageChangeListener) => void>((cb) => {
          onChangedListeners.push(cb);
        }),
        removeListener: vi.fn<(cb: StorageChangeListener) => void>((cb) => {
          const i = onChangedListeners.indexOf(cb);
          if (i >= 0) onChangedListeners.splice(i, 1);
        }),
      },
    },
    action: { onClicked: { addListener: vi.fn<(cb: () => void) => void>() } },
    tabs: {
      query: vi.fn<() => Promise<Array<{ url?: string }>>>(async () => []),
      create: vi.fn<() => Promise<{ id: number }>>(async () => ({ id: 1 })),
      getCurrent: vi.fn<() => Promise<{ id: number; windowId: number }>>(async () => ({
        id: 1,
        windowId: 1,
      })),
      update: vi.fn<(tabId: number, props: object) => Promise<{ id: number }>>(async (id) => ({
        id,
      })),
    },
    windows: {
      update: vi.fn<(windowId: number, info: object) => Promise<{ id: number }>>(async (id) => ({
        id,
      })),
    },
    i18n: {
      getUILanguage: vi.fn<() => string>(() => 'en'),
      getMessage: vi.fn<(key: string, subs?: string | string[]) => string>((key, subs) => {
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

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
  })),
);
Element.prototype.scrollIntoView = vi.fn<Element['scrollIntoView']>();

afterEach(() => {
  cleanup();
  vi.stubGlobal('chrome', createChromeMock());
  resetLocalStoreCacheForTest();
});
