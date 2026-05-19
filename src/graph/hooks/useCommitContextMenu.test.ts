import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCommitContextMenu } from './useCommitContextMenu';
import type { ViewCommit } from '../lib/transform.types';

function makeCommit(sha: string, overrides: Partial<ViewCommit> = {}): ViewCommit {
  return {
    sha,
    shortSha: sha.slice(0, 7),
    row: 0,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    isFocus: true,
    message: '',
    subject: '',
    parents: [],
    refs: [],
    ...overrides,
  };
}

describe('useCommitContextMenu', () => {
  it('opens the menu with the commit and hides the tooltip', () => {
    const commitBySha = new Map([['sha1', makeCommit('sha1', { parents: ['sha0'] })]]);
    const { result } = renderHook(() =>
      useCommitContextMenu({ commitBySha, owner: 'o', repo: 'r', onSelectSha: vi.fn() }),
    );
    act(() => result.current.handlers.onContextCommit('sha1', 10, 20));
    expect(result.current.menu).toEqual({ sha: 'sha1', x: 10, y: 20 });
    expect(result.current.menuItems.length).toBeGreaterThan(0);
    expect(result.current.showTooltip).toBe(false);
  });

  it('closes the menu via closeMenu', () => {
    const commitBySha = new Map([['sha1', makeCommit('sha1')]]);
    const { result } = renderHook(() =>
      useCommitContextMenu({ commitBySha, owner: 'o', repo: 'r', onSelectSha: vi.fn() }),
    );
    act(() => result.current.handlers.onContextCommit('sha1', 0, 0));
    act(() => result.current.handlers.closeMenu());
    expect(result.current.menu).toBeNull();
  });
});
