import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GraphList } from './GraphList';
import type { GraphView } from '../lib/transform.types';

// jsdom はレイアウトを持たず clientWidth/clientHeight が常に 0 を返すため、
// @tanstack/react-virtual が 1 行も描画しない。テスト中はスクロールコンテナのサイズを偽装する。
beforeAll(() => {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(600);
});

afterAll(() => {
  vi.restoreAllMocks();
});

function makeView(): GraphView {
  return {
    commits: [
      {
        sha: 'a'.repeat(40),
        shortSha: 'aaaaaaa',
        row: 0,
        lane: 0,
        time: 1,
        dateLabel: '',
        authorName: 'alice',
        authorLogin: 'alice',
        authorRepo: '',
        isFocus: true,
        message: 'first\n\nbody',
        subject: 'first',
        parents: [],
        refs: [],
      },
      {
        sha: 'b'.repeat(40),
        shortSha: 'bbbbbbb',
        row: 1,
        lane: 0,
        time: 0,
        dateLabel: '',
        authorName: 'bob',
        authorLogin: 'bob',
        authorRepo: '',
        isFocus: true,
        message: '',
        subject: '',
        parents: [],
        refs: [],
      },
    ],
    edges: [],
    laneCount: 1,
    totalCommitsAvailable: 2,
    focusOwner: 'o',
    focusRepo: 'r',
    focusHeads: [],
    branches: [],
    spaceToLane: new Map(),
  };
}

describe('GraphList', () => {
  it('renders the commits and the column header', () => {
    render(
      <GraphList
        view={makeView()}
        selectedSha={null}
        onSelect={vi.fn<(sha: string) => void>()}
        onHoverCommit={vi.fn<(sha: string, x: number, y: number) => void>()}
        onLeaveCommit={vi.fn<(sha: string) => void>()}
        onContextCommit={vi.fn<(sha: string, x: number, y: number) => void>()}
        hasMore={false}
        loadingMore={false}
        olderError={null}
        onLoadMore={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText('Subject')).toBeInTheDocument();
    // 第 2 コミットは subject が空なので「(no message)」が出る
    expect(screen.getByText('(no message)')).toBeInTheDocument();
  });

  it('opens the context menu when a commit row is right-clicked', () => {
    const onContextCommit = vi.fn<(sha: string, x: number, y: number) => void>();
    render(
      <GraphList
        view={makeView()}
        selectedSha={null}
        onSelect={vi.fn<(sha: string) => void>()}
        onHoverCommit={vi.fn<(sha: string, x: number, y: number) => void>()}
        onLeaveCommit={vi.fn<(sha: string) => void>()}
        onContextCommit={onContextCommit}
        hasMore={false}
        loadingMore={false}
        olderError={null}
        onLoadMore={vi.fn<() => void>()}
      />,
    );
    const row = screen.getByText('first').closest('button');
    if (!row) throw new Error('commit row not found');
    fireEvent.contextMenu(row, { clientX: 40, clientY: 70 });
    expect(onContextCommit).toHaveBeenCalledWith('a'.repeat(40), 40, 70);
  });

  it('renders the footer row when hasMore is true', () => {
    render(
      <GraphList
        view={makeView()}
        selectedSha={null}
        onSelect={vi.fn<(sha: string) => void>()}
        onHoverCommit={vi.fn<(sha: string, x: number, y: number) => void>()}
        onLeaveCommit={vi.fn<(sha: string) => void>()}
        onContextCommit={vi.fn<(sha: string, x: number, y: number) => void>()}
        hasMore={true}
        loadingMore={true}
        olderError={null}
        onLoadMore={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText(/Loading older commits/i)).toBeInTheDocument();
  });
});
