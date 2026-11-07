import { useCallback, useEffect, useRef } from 'react';

export function useRestartableTimeout(): (callback: () => void, delayMs: number) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((callback, delayMs) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(callback, delayMs);
  }, []);
}
