import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeCommit } from '../../../test/factories';
import { CommitRow } from './CommitRow';

const SHA = 'a'.repeat(40);

function renderRow(overrides: Partial<ComponentProps<typeof CommitRow>> = {}) {
  const onSelect = vi.fn<(sha: string) => void>();
  const props: ComponentProps<typeof CommitRow> = {
    commit: makeCommit(SHA, { subject: 'Fix crash', authorName: 'alice' }),
    isSelected: false,
    isMatch: false,
    query: '',
    isTabStop: true,
    isFlashing: false,
    columns: { sha: true, date: true, authorName: true },
    handlers: {
      onSelect,
      onContextMenu: vi.fn<(sha: string, x: number, y: number) => void>(),
      onHover: vi.fn<(sha: string, x: number, y: number) => void>(),
      onKeyboardFocus: vi.fn<(sha: string, x: number, y: number) => void>(),
      onLeave: vi.fn<() => void>(),
    },
    graphAreaWidth: 100,
    ...overrides,
  };
  render(<CommitRow {...props} />);
  return { onSelect };
}

describe('CommitRow', () => {
  it('shows the branch and tag badges of the commit, qualifying those from forks', () => {
    renderRow({
      commit: makeCommit(SHA, {
        subject: 'Release',
        refs: [
          { name: 'main', isFocus: true, ownerName: 'o' },
          { name: 'v2.0', isFocus: false, ownerName: 'fork-owner' },
        ],
      }),
    });

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('fork-owner:v2.0')).toBeInTheDocument();
  });

  it('selects the commit on click', async () => {
    const { onSelect } = renderRow({
      commit: makeCommit(SHA, { subject: 'Merge pull request #7' }),
    });

    await userEvent.click(screen.getByRole('button', { name: /Merge pull request #7/ }));

    expect(onSelect).toHaveBeenCalledWith(SHA);
  });

  it('keeps a very long subject inside one row while the other columns stay visible', () => {
    const subject = 'x'.repeat(5000);
    renderRow({ commit: makeCommit(SHA, { subject, authorName: 'alice', shortSha: 'aaaaaaa' }) });

    expect(screen.getByText(subject)).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('aaaaaaa')).toBeInTheDocument();
  });

  it('marks a commit without a message', () => {
    renderRow({ commit: makeCommit(SHA, { subject: '' }) });

    expect(screen.getByText('(no message)')).toBeInTheDocument();
  });
});
