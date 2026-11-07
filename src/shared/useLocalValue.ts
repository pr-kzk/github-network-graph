import { useSyncExternalStore } from 'react';
import { localStoreCache, type LocalSchema } from './storage';

export function useLocalValue<K extends keyof LocalSchema>(key: K): LocalSchema[K] {
  return useSyncExternalStore(
    (listener) => localStoreCache.subscribe(key, listener),
    () => localStoreCache.getSnapshot(key),
  );
}
