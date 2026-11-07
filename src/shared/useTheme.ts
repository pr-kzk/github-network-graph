import { useEffect, useSyncExternalStore } from 'react';
import { applyTheme, prefersDarkScheme, resolveTheme, subscribeDarkScheme } from './theme';
import type { ResolvedTheme } from './theme';
import { useLocalValue } from './useLocalValue';

export function useTheme(): ResolvedTheme {
  const { theme } = useLocalValue('graphPrefs');
  const systemPrefersDark = useSyncExternalStore(subscribeDarkScheme, prefersDarkScheme);
  const resolved = resolveTheme(theme, systemPrefersDark);
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);
  return resolved;
}
