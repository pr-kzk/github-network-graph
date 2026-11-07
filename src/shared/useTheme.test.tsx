import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { localStore } from './storage';
import { useTheme } from './useTheme';

function stubOsScheme(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return dark;
      },
      media: query,
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    })),
  );
  return (next: boolean) => {
    dark = next;
    for (const l of listeners) l();
  };
}

const rootClasses = () => document.documentElement.classList;

describe('useTheme', () => {
  afterEach(() => {
    rootClasses().remove('theme-dark', 'theme-light');
  });

  it('applies an explicit light theme regardless of the OS setting', async () => {
    stubOsScheme(true);
    await localStore.set('graphPrefs', { mode: 'network', theme: 'light' });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('light');
    expect(rootClasses().contains('theme-light')).toBe(true);
    expect(rootClasses().contains('theme-dark')).toBe(false);
  });

  it('follows the OS scheme when set to system', async () => {
    stubOsScheme(true);
    await localStore.set('graphPrefs', { mode: 'network', theme: 'system' });
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('dark');
    expect(rootClasses().contains('theme-dark')).toBe(true);
  });

  it('reacts live when the OS scheme changes', async () => {
    const setOsDark = stubOsScheme(false);
    await localStore.set('graphPrefs', { mode: 'network', theme: 'system' });
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('light');

    act(() => setOsDark(true));

    expect(result.current).toBe('dark');
    expect(rootClasses().contains('theme-dark')).toBe(true);
    expect(rootClasses().contains('theme-light')).toBe(false);
  });

  it('ignores OS changes once a fixed theme is chosen', async () => {
    const setOsDark = stubOsScheme(false);
    await localStore.set('graphPrefs', { mode: 'network', theme: 'light' });
    const { result } = renderHook(() => useTheme());

    act(() => setOsDark(true));

    expect(result.current).toBe('light');
  });
});
