import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphList } from './GraphList';
import type { GraphView } from '../lib/transform.types';

// jsdom は offsetWidth/offsetHeight が常に 0 を返すため @tanstack/react-virtual が
// 1 行も描画しない。テスト中はスクロールコンテナのサイズを偽装する。
let originalOffsetWidth: PropertyDescriptor | undefined;
let originalOffsetHeight: PropertyDescriptor | undefined;

beforeAll(() => {
  originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 800,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 600,
  });
});

afterAll(() => {
  if (originalOffsetWidth) {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
  }
  if (originalOffsetHeight) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
  }
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
    spaceToLane: new Map(),
  };
}

describe('GraphList', () => {
  it('renders the commits and the column header', () => {
    render(
      <GraphList
        view={makeView()}
        selectedSha={null}
        onSelect={vi.fn()}
        onHoverCommit={vi.fn()}
        onLeaveCommit={vi.fn()}
        onContextCommit={vi.fn()}
        hasMore={false}
        loadingMore={false}
        olderError={null}
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByText('Subject')).toBeInTheDocument();
    // 第 2 コミットは subject が空なので「(no message)」が出る
    expect(screen.getByText('(no message)')).toBeInTheDocument();
  });

  it('renders the footer row when hasMore is true', () => {
    render(
      <GraphList
        view={makeView()}
        selectedSha={null}
        onSelect={vi.fn()}
        onHoverCommit={vi.fn()}
        onLeaveCommit={vi.fn()}
        onContextCommit={vi.fn()}
        hasMore={true}
        loadingMore={true}
        olderError={null}
        onLoadMore={vi.fn()}
      />,
    );
    expect(screen.getByText(/Loading older commits/i)).toBeInTheDocument();
  });
});
