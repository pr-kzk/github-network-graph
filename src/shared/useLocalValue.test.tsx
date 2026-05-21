import { describe, expect, it } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { useLocalValue } from './useLocalValue';
import { DEFAULT_GRAPH_PREFS, LOCAL_DEFAULTS, localStore } from './storage';

describe('useLocalValue', () => {
  it('returns the defaults synchronously on first render', () => {
    const { result } = renderHook(() => useLocalValue('graphPrefs'));
    expect(result.current).toEqual(DEFAULT_GRAPH_PREFS);
  });

  it('hydrates from chrome.storage.local on mount', async () => {
    await chrome.storage.local.set({
      graphPrefs: { mode: 'repo-only', theme: 'light' },
    });
    const { result } = renderHook(() => useLocalValue('graphPrefs'));
    await waitFor(() =>
      expect(result.current).toEqual({ mode: 'repo-only', theme: 'light' }),
    );
  });

  it('reflects optimistic updates from localStore.set in the same context', async () => {
    const { result } = renderHook(() => useLocalValue('graphPrefs'));
    await act(async () => {
      await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'dark' });
    });
    expect(result.current).toEqual({ mode: 'repo-only', theme: 'dark' });
  });

  it('reflects external chrome.storage writes via onChanged', async () => {
    const { result } = renderHook(() => useLocalValue('recentRepos'));
    await waitFor(() => expect(result.current).toEqual(LOCAL_DEFAULTS.recentRepos));
    await act(async () => {
      await chrome.storage.local.set({
        recentRepos: [{ owner: 'foo', repo: 'bar', openedAt: 1 }],
      });
    });
    expect(result.current).toEqual([{ owner: 'foo', repo: 'bar', openedAt: 1 }]);
  });

  it('notifies all subscribers of the same key', async () => {
    const renderCounts = { a: 0, b: 0 };
    function ProbeA() {
      const v = useLocalValue('graphPrefs');
      renderCounts.a += 1;
      return <span data-testid="a">{v.mode}</span>;
    }
    function ProbeB() {
      const v = useLocalValue('graphPrefs');
      renderCounts.b += 1;
      return <span data-testid="b">{v.mode}</span>;
    }
    const { getByTestId } = render(
      <>
        <ProbeA />
        <ProbeB />
      </>,
    );
    expect(getByTestId('a').textContent).toBe('network');
    expect(getByTestId('b').textContent).toBe('network');

    const beforeA = renderCounts.a;
    const beforeB = renderCounts.b;
    await act(async () => {
      await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'dark' });
    });
    expect(getByTestId('a').textContent).toBe('repo-only');
    expect(getByTestId('b').textContent).toBe('repo-only');
    expect(renderCounts.a).toBeGreaterThan(beforeA);
    expect(renderCounts.b).toBeGreaterThan(beforeB);
  });

  it('removes its listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useLocalValue('graphPrefs'));
    await waitFor(() => expect(result.current).toEqual(DEFAULT_GRAPH_PREFS));
    unmount();
    await act(async () => {
      await localStore.set('graphPrefs', { mode: 'repo-only', theme: 'dark' });
    });
    expect(result.current).toEqual(DEFAULT_GRAPH_PREFS);
  });
});
