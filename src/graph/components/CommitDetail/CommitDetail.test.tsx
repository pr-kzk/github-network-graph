import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCommit } from '../../../../test/factories';
import { CommitDetail } from './CommitDetail';

vi.mock(
  '../../hooks/useCommitDetailExtra',
  async () => (await import('../../../../test/graphPage')).idleCommitDetailExtra,
);

const SHA = 'c'.repeat(40);
const PARENT = 'a'.repeat(40);
const CHILD = 'd'.repeat(40);

function setup() {
  const handlers = {
    onCopy: vi.fn<(text: string) => void>(),
    onCopyLink: vi.fn<(sha: string) => void>(),
    onSelectSha: vi.fn<(sha: string) => void>(),
  };
  render(
    <CommitDetail
      commit={makeCommit(SHA, {
        subject: 'Fix crash',
        message: 'Fix crash\n\nDetails',
        parents: [PARENT],
        refs: [{ name: 'main', isFocus: true, ownerName: 'o' }],
      })}
      owner="o"
      repo="r"
      childrenShas={[CHILD]}
      containingRefs={[]}
      {...handlers}
    />,
  );
  return handlers;
}

describe('CommitDetail', () => {
  it('selects a parent or child commit from its link', async () => {
    const { onSelectSha } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: PARENT.slice(0, 7) }));
    await user.click(screen.getByRole('button', { name: CHILD.slice(0, 7) }));

    expect(onSelectSha).toHaveBeenNthCalledWith(1, PARENT);
    expect(onSelectSha).toHaveBeenNthCalledWith(2, CHILD);
  });

  it('copies the full SHA', async () => {
    const { onCopy } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Copy SHA' }));

    expect(onCopy).toHaveBeenCalledWith(SHA);
  });

  it('shows the ref badges and the full message', () => {
    setup();

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText(/Details/)).toBeInTheDocument();
  });

  it('asks the user to select a commit when none is selected', () => {
    render(
      <CommitDetail
        commit={null}
        owner="o"
        repo="r"
        childrenShas={[]}
        containingRefs={[]}
        onCopy={() => undefined}
        onCopyLink={() => undefined}
        onSelectSha={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Copy SHA' })).not.toBeInTheDocument();
  });
});
