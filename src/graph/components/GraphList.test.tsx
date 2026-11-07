import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { makeCommit, makeView } from '../../../test/factories';
import { stubClientSize } from '../../../test/graphPage';
import { GraphList } from './GraphList';
import type { GraphView } from '../lib/transform.types';

stubClientSize();

function sampleView(): GraphView {
  return makeView([
    makeCommit('a'.repeat(40), {
      row: 0,
      time: 1,
      authorName: 'alice',
      authorLogin: 'alice',
      message: 'first\n\nbody',
      subject: 'first',
    }),
    makeCommit('b'.repeat(40), { row: 1, authorName: 'bob', authorLogin: 'bob' }),
  ]);
}

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);

function renderList(overrides: Partial<ComponentProps<typeof GraphList>> = {}) {
  const view = overrides.view ?? sampleView();
  const props: ComponentProps<typeof GraphList> = {
    view,
    selectedSha: null,
    flashSha: null,
    commitBySha: new Map(view.commits.map((c) => [c.sha, c])),
    childrenBySha: new Map(),
    matchShas: new Set(),
    query: '',
    rowHandlers: {
      onSelect: vi.fn<(sha: string) => void>(),
      onHover: vi.fn<(sha: string, x: number, y: number) => void>(),
      onKeyboardFocus: vi.fn<(sha: string, x: number, y: number) => void>(),
      onLeave: vi.fn<() => void>(),
      onContextMenu: vi.fn<(sha: string, x: number, y: number) => void>(),
    },
    paging: {
      hasMore: false,
      loadingMore: false,
      olderError: null,
      onLoadMore: vi.fn<() => void>(),
    },
    ...overrides,
  };
  const result = render(<GraphList {...props} />);
  return { props, ...result };
}

function rowOf(text: string): HTMLElement {
  const row = screen.getByText(text).closest('button');
  if (!row) throw new Error(`commit row for "${text}" not found`);
  return row;
}

describe('GraphList', () => {
  it('renders the commits and the column header', () => {
    renderList();
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('(no message)')).toBeInTheDocument();
  });

  it('opens the context menu when a commit row is right-clicked', () => {
    const { props } = renderList();
    fireEvent.contextMenu(rowOf('first'), { clientX: 40, clientY: 70 });
    expect(props.rowHandlers.onContextMenu).toHaveBeenCalledWith(A, 40, 70);
  });

  it('makes the first row the tab stop while nothing is selected', () => {
    renderList();
    expect(rowOf('first')).toHaveAttribute('tabindex', '0');
  });

  it('exposes a list of positioned commits with the selected row as the only tab stop', () => {
    renderList({ selectedSha: B });
    expect(screen.getByRole('list', { name: 'Commits' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-posinset', '2');
    expect(items[1]).toHaveAttribute('aria-setsize', '2');
    const selected = screen.getByText('(no message)').closest('button');
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(rowOf('first')).not.toHaveAttribute('aria-current');
    expect(rowOf('first')).toHaveAttribute('tabindex', '-1');
  });

  it('makes the first row the tab stop while nothing is selected', () => {
    renderList();
    expect(rowOf('first')).toHaveAttribute('tabindex', '0');
  });

  it('highlights matching rows and the matched text', () => {
    renderList({ matchShas: new Set([A]), query: 'fir' });
    expect(document.querySelector('[data-sha="' + A + '"]')).toHaveAttribute('data-match', 'true');
    expect(screen.getByText('fir', { selector: 'mark' })).toBeInTheDocument();
  });

  it('does not highlight rows that do not match', () => {
    renderList({ matchShas: new Set([A]), query: 'fir' });
    expect(screen.getByText('(no message)').closest('button')).not.toHaveAttribute('data-match');
  });

  it('moves focus to the newly selected row when focus was not in another control', () => {
    const { rerender, props } = renderList({ selectedSha: A });
    rerender(<GraphList {...props} selectedSha={B} />);
    expect(screen.getByText('(no message)').closest('button')).toHaveFocus();
  });

  it('leaves focus alone when another control has it', () => {
    const { rerender, props } = renderList({ selectedSha: A });
    const other = document.createElement('button');
    document.body.append(other);
    other.focus();
    rerender(<GraphList {...props} selectedSha={B} />);
    expect(other).toHaveFocus();
    other.remove();
  });

  it('does not redraw its rows when its parent re-renders with the same props', () => {
    class CountingSet extends Set<string> {
      reads = 0;
      override has(sha: string) {
        this.reads += 1;
        return super.has(sha);
      }
    }
    const matchShas = new CountingSet();
    const { rerender, props } = renderList({ matchShas });
    expect(matchShas.reads).toBeGreaterThan(0);
    matchShas.reads = 0;
    rerender(<GraphList {...props} />);
    expect(matchShas.reads).toBe(0);
    rerender(<GraphList {...props} selectedSha={B} />);
    expect(matchShas.reads).toBeGreaterThan(0);
  });

  it('keeps the graph column within a share of the list width however many lanes exist', () => {
    const view = { ...sampleView(), laneCount: 600 };
    const { container } = renderList({ view });
    const svg = container.querySelector('svg');
    expect(Number(svg?.getAttribute('width'))).toBe(240);
    const spacer = rowOf('first').querySelector<HTMLElement>('span[aria-hidden="true"]');
    expect(spacer?.style.width).toBe('240px');
  });

  it('hides the sha and author name columns before the subject gets cramped', () => {
    const width = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(400);
    try {
      renderList();
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.queryByText('SHA')).not.toBeInTheDocument();
      expect(screen.queryByText('Author')).not.toBeInTheDocument();
      expect(screen.queryByText('alice')).not.toBeInTheDocument();
    } finally {
      width.mockReturnValue(800);
    }
  });

  it('shows every column in a wide list', () => {
    renderList();
    expect(screen.getByText('SHA')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  describe('with more lanes than fit', () => {
    function crowdedView(): GraphView {
      const base = sampleView();
      const commits = Array.from({ length: 120 }, (_, row) => ({
        ...base.commits[0],
        sha: `${row}`.padStart(40, '0'),
        shortSha: `${row}`.padStart(7, '0'),
        row,
        lane: row,
        subject: `commit ${row}`,
        message: `commit ${row}`,
      }));
      const edge = (from: number, to: number) => ({
        fromSha: commits[from].sha,
        toSha: commits[to].sha,
        fromRow: from,
        toRow: to,
        fromLane: from,
        toLane: to,
        isMerge: false,
      });
      return { ...base, commits, edges: [edge(0, 1), edge(2, 3)], laneCount: 120 };
    }

    function nodeXs(container: HTMLElement): number[] {
      return [...container.querySelectorAll('svg circle')].map((c) => Number(c.getAttribute('cx')));
    }

    it('counts the folded lanes in a chip that explains them', () => {
      renderList({ view: crowdedView() });
      const chip = screen.getByText(/^\+\d+$/);
      expect(chip).toHaveAttribute('title', expect.stringMatching(/folded into the dashed line/));
    });

    it('shows no chip when every lane fits', () => {
      renderList();
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('never puts two lanes on the same x except in the overflow gutter', () => {
      const { container } = renderList({ view: crowdedView() });
      const gutterX = Number(container.querySelector('svg')?.getAttribute('width')) - 12;
      const xs = nodeXs(container).filter((x) => x !== gutterX);
      expect(xs.length).toBeGreaterThan(0);
      expect(new Set(xs).size).toBe(xs.length);
    });

    it('keeps the selected path in full color and fades the other lines', () => {
      const view = crowdedView();
      const [c0, c1, c2, c3] = view.commits;
      const parents = new Map([
        [c0.sha, [c1.sha]],
        [c2.sha, [c3.sha]],
      ]);
      const commitBySha = new Map(
        view.commits.map((c) => [c.sha, { ...c, parents: parents.get(c.sha) ?? [] }]),
      );
      const childrenBySha = new Map([
        [c1.sha, [c0.sha]],
        [c3.sha, [c2.sha]],
      ]);
      const { container } = renderList({
        view,
        selectedSha: c0.sha,
        commitBySha,
        childrenBySha,
      });
      const opacities = [...container.querySelectorAll('svg path')].map((p) =>
        Number(p.getAttribute('stroke-opacity')),
      );
      expect(opacities).toEqual([1, expect.any(Number)]);
      expect(opacities[1]).toBeLessThan(0.5);
    });

    it('leaves the lines alone when nothing is selected', () => {
      const { container } = renderList({ view: crowdedView() });
      const widths = new Set(
        [...container.querySelectorAll('svg path')].map((p) => p.getAttribute('stroke-opacity')),
      );
      expect(widths.size).toBeLessThanOrEqual(2);
    });
  });
});
