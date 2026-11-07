import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCommitContextMenu } from './useCommitContextMenu';
import type { ViewCommit } from '../lib/transform.types';
import { makeCommit } from '../../../test/factories';

function setup(commit: ViewCommit) {
  const onCopyLink = vi.fn<(sha: string) => void>();
  const hook = renderHook(() =>
    useCommitContextMenu({
      commitBySha: new Map([[commit.sha, commit]]),
      owner: 'o',
      repo: 'r',
      onSelectSha: vi.fn<(sha: string) => void>(),
      onCopy: vi.fn<(text: string) => void>(),
      onCopyLink,
    }),
  );
  return { ...hook, onCopyLink };
}

describe('useCommitContextMenu', () => {
  it('offers to copy a link to the commit view', () => {
    const { result, onCopyLink } = setup(makeCommit('sha1'));
    act(() => result.current.openMenu('sha1', 0, 0));
    const item = result.current.menuItems.find((i) => i.kind === 'item' && i.id === 'copy-link');
    if (item?.kind !== 'item') throw new Error('copy-link item missing');
    item.onClick();
    expect(onCopyLink).toHaveBeenCalledWith('sha1');
  });

  it('disables the parent jump for a root commit', () => {
    const { result } = setup(makeCommit('sha1'));
    act(() => result.current.openMenu('sha1', 0, 0));
    const item = result.current.menuItems.find((i) => i.kind === 'item' && i.id === 'jump-parent');
    expect(item?.kind === 'item' && item.disabled).toBe(true);
  });
});
