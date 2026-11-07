import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void): () => void {
  window.addEventListener('resize', listener);
  return () => window.removeEventListener('resize', listener);
}

export function useWindowWidth(): number {
  return useSyncExternalStore(subscribe, () => window.innerWidth);
}
