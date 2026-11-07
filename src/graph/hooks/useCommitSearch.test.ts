import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCommitSearch } from './useCommitSearch';
import type { ViewCommit } from '../lib/transform.types';

function commit(sha: string, row: number, subject: string): ViewCommit {
  return {
    sha,
    shortSha: sha,
    row,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    isFocus: true,
    message: subject,
    subject,
    parents: [],
    refs: [],
  };
}

const COMMITS = [
  commit('s0', 0, 'fix one'),
  commit('s1', 1, 'docs'),
  commit('s2', 2, 'fix two'),
  commit('s3', 3, 'fix three'),
];
const BY_SHA = new Map(COMMITS.map((c) => [c.sha, c]));

function setup(selectedSha: string | null, scope = 'o/r') {
  const onSelect = vi.fn<(sha: string) => void>();
  const hook = renderHook(
    (props: { selectedSha: string | null; scope: string }) =>
      useCommitSearch({
        scope: props.scope,
        commits: COMMITS,
        commitBySha: BY_SHA,
        selectedSha: props.selectedSha,
        onSelect,
      }),
    { initialProps: { selectedSha, scope } },
  );
  return { ...hook, onSelect };
}

describe('useCommitSearch', () => {
  it('matches commits against the typed query', () => {
    const { result } = setup(null);
    act(() => result.current.setQuery('fix'));
    expect(result.current.result.rows).toEqual([0, 2, 3]);
  });

  it('clears the query when the repository changes', () => {
    const { result, rerender } = setup(null);
    act(() => result.current.setQuery('fix'));
    rerender({ selectedSha: null, scope: 'o/other' });
    expect(result.current.query).toBe('');
    expect(result.current.result.rows).toEqual([]);
  });

  it('selects the first match when nothing is selected', () => {
    const { result, onSelect } = setup(null);
    act(() => result.current.setQuery('fix'));
    act(() => result.current.step(1));
    expect(onSelect).toHaveBeenCalledWith('s0');
  });

  it('selects the next match after the current selection', () => {
    const { result, onSelect } = setup('s0');
    act(() => result.current.setQuery('fix'));
    act(() => result.current.step(1));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });

  it('selects the previous match with wrap-around', () => {
    const { result, onSelect } = setup('s0');
    act(() => result.current.setQuery('fix'));
    act(() => result.current.step(-1));
    expect(onSelect).toHaveBeenCalledWith('s3');
  });

  it('leaves the selection alone when nothing matches', () => {
    const { result, onSelect } = setup('s1');
    act(() => result.current.setQuery('nope'));
    act(() => result.current.step(1));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
