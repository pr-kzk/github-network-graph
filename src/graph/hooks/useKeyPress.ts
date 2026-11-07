import { useEffect } from 'react';
import { useLatest } from '@/shared/useLatest';

export function useKeyPress(key: string, onPress: () => void, active = true): void {
  const handler = useLatest(onPress);
  useEffect(() => {
    if (!active) return undefined;
    function handleKey(e: KeyboardEvent) {
      if (e.key === key) handler.current();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [key, handler, active]);
}
