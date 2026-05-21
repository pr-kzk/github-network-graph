import { useEffect } from 'react';
import type { Theme } from './storage';
import { useLocalValue } from './useLocalValue';

// document.documentElement に theme-dark / theme-light クラスを当てる。
// CSS 側 (globals.css) で @custom-variant dark をこの class にぶら下げているため、
// このクラスが切り替わると Tailwind の dark: ユーティリティ全体が連動する。
export function useTheme(): Theme {
  const prefs = useLocalValue('graphPrefs');
  const theme = prefs.theme;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.classList.toggle('theme-light', theme === 'light');
  }, [theme]);
  return theme;
}
