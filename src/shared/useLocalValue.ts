import { useSyncExternalStore } from 'react';
import { localStoreCache, type LocalSchema } from './storage';

// chrome.storage.local の特定 key を購読し、現在の snapshot を返す。
// マウント直後は LOCAL_DEFAULTS、hydrate 完了後・別タブからの書き込み後は
// その時点の値が同期的に取得できる。Suspense は使わない。
export function useLocalValue<K extends keyof LocalSchema>(key: K): LocalSchema[K] {
  return useSyncExternalStore(
    (listener) => localStoreCache.subscribe(key, listener),
    () => localStoreCache.getSnapshot(key),
  );
}
