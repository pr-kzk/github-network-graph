import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchMenu } from './BranchMenu';
import type { GraphBranch, GraphForkBranches } from '../lib/transform.types';

beforeAll(() => {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(256);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(256);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(256);
});

afterAll(() => {
  vi.restoreAllMocks();
});

const BRANCHES: GraphBranch[] = [
  { name: 'main', sha: 'a'.repeat(40) },
  { name: 'develop', sha: 'b'.repeat(40) },
  { name: 'feature/x', sha: 'c'.repeat(40) },
];

const FORKS: GraphForkBranches[] = [
  { owner: 'alice', branches: [{ name: 'experiment', sha: 'd'.repeat(40) }] },
  { owner: 'bob', branches: [{ name: 'main', sha: 'e'.repeat(40) }] },
];

function renderMenu(
  selectedSha: string | null,
  onSelect = vi.fn<(sha: string) => void>(),
  forkBranches: GraphForkBranches[] = [],
) {
  return render(
    <BranchMenu
      branches={BRANCHES}
      forkBranches={forkBranches}
      selectedSha={selectedSha}
      onSelect={onSelect}
    />,
  );
}

describe('BranchMenu', () => {
  it('marks the currently selected branch when opened', async () => {
    const user = userEvent.setup();
    renderMenu('b'.repeat(40));
    await user.click(screen.getByRole('button', { name: /3/ }));
    const current = screen
      .getAllByRole('option')
      .filter((o) => o.getAttribute('aria-current') === 'true');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('develop');
  });

  it('reports the chosen branch and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    renderMenu(null, onSelect);
    await user.click(screen.getByRole('button', { name: /3/ }));
    await user.click(screen.getByRole('option', { name: /feature\/x/ }));
    expect(onSelect).toHaveBeenCalledWith('c'.repeat(40));
    expect(screen.queryByPlaceholderText(/./)).not.toBeInTheDocument();
  });

  it('selects the highlighted branch with the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    renderMenu('a'.repeat(40), onSelect);
    await user.click(screen.getByRole('button', { name: /3/ }));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('b'.repeat(40));
  });

  it('groups fork branches under their owner and counts them in the button', async () => {
    const user = userEvent.setup();
    renderMenu(null, undefined, FORKS);
    await user.click(screen.getByRole('button', { name: /5/ }));
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'experiment' })).toBeInTheDocument();
  });

  it('shows every branch of a fork whose owner matches the search', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    renderMenu(null, onSelect, FORKS);
    await user.click(screen.getByRole('button', { name: /5/ }));
    await user.type(screen.getByRole('combobox'), 'alice');
    expect(screen.queryByRole('option', { name: 'develop' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'experiment' }));
    expect(onSelect).toHaveBeenCalledWith('d'.repeat(40));
  });

  it('moves the keyboard highlight across group boundaries', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    renderMenu('c'.repeat(40), onSelect, FORKS);
    await user.click(screen.getByRole('button', { name: /5/ }));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('d'.repeat(40));
  });

  it('names the search field and exposes the highlighted branch to assistive technology', async () => {
    const user = userEvent.setup();
    renderMenu('a'.repeat(40));
    await user.click(screen.getByRole('button', { name: /3/ }));
    const search = screen.getByRole('combobox', { name: 'Search branches' });
    await user.keyboard('{ArrowDown}');

    const highlighted = screen.getByRole('option', { name: 'develop' });
    expect(search).toHaveAttribute('aria-activedescendant', highlighted.id);
    expect(highlighted).toHaveAttribute('aria-selected', 'true');
  });

  it('announces the popup on the trigger', async () => {
    const user = userEvent.setup();
    renderMenu(null);
    const trigger = screen.getByRole('button', { name: /3/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
  });

  it('returns focus to the trigger when closed with Escape', async () => {
    const user = userEvent.setup();
    renderMenu(null);
    const trigger = screen.getByRole('button', { name: /3/ });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('keeps the number of rendered options bounded for thousands of fork branches', async () => {
    const user = userEvent.setup();
    const manyForks: GraphForkBranches[] = Array.from({ length: 300 }, (_, f) => ({
      owner: `fork-${f}`,
      branches: Array.from({ length: 10 }, (__, b) => ({
        name: `topic/${b}`,
        sha: `${f}-${b}`.padEnd(40, '0'),
      })),
    }));
    renderMenu(null, undefined, manyForks);
    await user.click(screen.getByRole('button', { name: /3003/ }));
    const rendered = screen.getAllByRole('option').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(40);
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-setsize', '3003');
  });

  it('reaches the last branch with the keyboard when the list is virtualized', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    const forks: GraphForkBranches[] = Array.from({ length: 100 }, (_, f) => ({
      owner: `fork-${f}`,
      branches: [{ name: 'main', sha: `${f}`.padEnd(40, '1') }],
    }));
    renderMenu(null, onSelect, forks);
    await user.click(screen.getByRole('button', { name: /103/ }));
    await user.keyboard('{PageUp}{ArrowDown>200/}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('99'.padEnd(40, '1'));
  });

  it('highlights the hovered option without moving the rest of the list', async () => {
    const user = userEvent.setup();
    renderMenu(null);
    await user.click(screen.getByRole('button', { name: /3/ }));
    const search = screen.getByRole('combobox');
    await user.hover(screen.getByRole('option', { name: 'feature/x' }));
    expect(screen.getByRole('option', { name: 'feature/x' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(search).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'feature/x' }).id,
    );
  });
});
