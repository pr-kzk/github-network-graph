import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphView } from '../lib/transform.types';
import type { GraphDataState } from './useGraphData';
import { useResolveSelectedCommit } from './useResolveSelectedCommit';

const VIEW: GraphView = {
  commits: [],
  edges: [],
  laneCount: 0,
  totalCommitsAvailable: 0,
  focusOwner: 'o',
  focusRepo: 'r',
  focusHeads: [],
  branches: [],
  forkBranches: [],
  spaceToLane: new Map(),
};

function readyState({
  hasMore,
  loadingMore = false,
  rawShas = [],
}: {
  hasMore: boolean;
  loadingMore?: boolean;
  rawShas?: string[];
}): GraphDataState {
  return {
    status: 'ready',
    meta: { nethash: '', focus: 0, dates: [], name: '', users: [] },
    rawCommits: rawShas.map((id) => ({
      id,
      author: 0,
      time: 0,
      space: 0,
      message: '',
      parents: [],
    })),
    nextEnd: 0,
    hasMore,
    loadingMore,
    olderError: null,
    seek: null,
    refreshing: false,
    pendingAttempts: 0,
    retry: null,
    view: VIEW,
  };
}

function setup(state: GraphDataState, selectedSha: string | null, isLoaded: boolean) {
  const seekTo = vi.fn<(sha: string) => void>();
  const cancelSeek = vi.fn<() => void>();
  const onNotFound = vi.fn<() => void>();
  const onHiddenByMode = vi.fn<() => void>();
  renderHook(() =>
    useResolveSelectedCommit({
      state,
      isLoaded,
      selectedSha,
      seekTo,
      cancelSeek,
      onNotFound,
      onHiddenByMode,
    }),
  );
  return { seekTo, cancelSeek, onNotFound, onHiddenByMode };
}

describe('useResolveSelectedCommit', () => {
  it('seeks the selected commit through older history while it is not loaded', () => {
    const { seekTo, onNotFound } = setup(readyState({ hasMore: true }), 'abc', false);
    expect(seekTo).toHaveBeenCalledExactlyOnceWith('abc');
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('reports not found once history is exhausted without the selected commit', () => {
    const { seekTo, onNotFound } = setup(readyState({ hasMore: false }), 'abc', false);
    expect(onNotFound).toHaveBeenCalledTimes(1);
    expect(seekTo).not.toHaveBeenCalled();
  });

  it('waits while an older page is already loading', () => {
    const { seekTo, onNotFound } = setup(
      readyState({ hasMore: true, loadingMore: true }),
      'abc',
      false,
    );
    expect(seekTo).not.toHaveBeenCalled();
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('does nothing when the selected commit is loaded', () => {
    const { seekTo, onNotFound } = setup(readyState({ hasMore: true }), 'abc', true);
    expect(seekTo).not.toHaveBeenCalled();
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('reports a commit hidden by the mode without paging through history', () => {
    const { seekTo, onNotFound, onHiddenByMode } = setup(
      readyState({ hasMore: true, rawShas: ['abc'] }),
      'abc',
      false,
    );
    expect(onHiddenByMode).toHaveBeenCalledTimes(1);
    expect(seekTo).not.toHaveBeenCalled();
    expect(onNotFound).not.toHaveBeenCalled();
  });

  it('cancels a running seek when the selection changes', () => {
    const seekTo = vi.fn<(sha: string) => void>();
    const cancelSeek = vi.fn<() => void>();
    const state = readyState({ hasMore: true, loadingMore: true });
    const { rerender } = renderHook(
      ({ sha }) =>
        useResolveSelectedCommit({
          state,
          isLoaded: false,
          selectedSha: sha,
          seekTo,
          cancelSeek,
          onNotFound: vi.fn<() => void>(),
          onHiddenByMode: vi.fn<() => void>(),
        }),
      { initialProps: { sha: 'abc' } },
    );
    expect(cancelSeek).not.toHaveBeenCalled();
    rerender({ sha: 'def' });
    expect(cancelSeek).toHaveBeenCalledTimes(1);
  });
});
