import type { Theme } from './storage';

export type ResolvedTheme = 'dark' | 'light';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function prefersDarkScheme(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

export function subscribeDarkScheme(listener: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark ? 'dark' : 'light';
  return theme;
}

export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('theme-dark', resolved === 'dark');
  root.classList.toggle('theme-light', resolved === 'light');
}
