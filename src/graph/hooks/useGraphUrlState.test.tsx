import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type GraphMode, localStore } from '@/shared/storage';
import { useGraphUrlState } from './useGraphUrlState';

const SHA = 'a'.repeat(40);
const OTHER = 'b'.repeat(40);

function render(initial: { sha: string | null; mode: GraphMode | null }) {
  return renderHook(() => useGraphUrlState({ owner: 'o', repo: 'r', initial }));
}

async function saveMode(mode: GraphMode) {
  await localStore.set('graphPrefs', { ...(await localStore.get('graphPrefs')), mode });
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useGraphUrlState', () => {
  it('starts with the selection from the URL', () => {
    const { result } = render({ sha: SHA, mode: null });
    expect(result.current.selectedSha).toBe(SHA);
  });

  it('mirrors the selection and mode into the address bar', () => {
    const { result } = render({ sha: null, mode: 'network' });
    act(() => result.current.setSelectedSha(OTHER));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('owner')).toBe('o');
    expect(params.get('repo')).toBe('r');
    expect(params.get('sha')).toBe(OTHER);
    expect(params.get('mode')).toBe('network');
  });

  it('removes sha from the address bar when the selection is cleared', () => {
    const { result } = render({ sha: SHA, mode: null });
    act(() => result.current.setSelectedSha(null));
    expect(new URLSearchParams(window.location.search).has('sha')).toBe(false);
  });

  it('uses the URL mode for this tab without changing the saved default', async () => {
    await saveMode('repo-only');
    const { result } = render({ sha: null, mode: 'network' });
    expect(result.current.mode).toBe('network');
    expect((await localStore.get('graphPrefs')).mode).toBe('repo-only');
  });

  it('falls back to the saved mode when the URL has none', async () => {
    await saveMode('network');
    const { result } = render({ sha: null, mode: null });
    await waitFor(() => expect(result.current.mode).toBe('network'));
  });

  it('saves the mode as the new default when the user changes it', async () => {
    const { result } = render({ sha: null, mode: 'network' });
    await act(() => result.current.changeMode('repo-only'));
    expect(result.current.mode).toBe('repo-only');
    expect((await localStore.get('graphPrefs')).mode).toBe('repo-only');
  });

  it('builds a link carrying the repository, commit and mode', () => {
    const { result } = render({ sha: null, mode: 'network' });
    const params = new URL(result.current.linkTo(SHA)).searchParams;
    expect(Object.fromEntries(params)).toEqual({
      owner: 'o',
      repo: 'r',
      sha: SHA,
      mode: 'network',
    });
  });
});
