import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchMenu } from './BranchMenu';
import type { GraphBranch } from '../lib/transform.types';

const BRANCHES: GraphBranch[] = [
  { name: 'main', sha: 'a'.repeat(40) },
  { name: 'develop', sha: 'b'.repeat(40) },
  { name: 'feature/x', sha: 'c'.repeat(40) },
];

function renderMenu(selectedSha: string | null, onSelect = vi.fn<(sha: string) => void>()) {
  return render(<BranchMenu branches={BRANCHES} selectedSha={selectedSha} onSelect={onSelect} />);
}

describe('BranchMenu', () => {
  it('marks the currently selected branch when opened', async () => {
    const user = userEvent.setup();
    renderMenu('b'.repeat(40));
    await user.click(screen.getByRole('button', { name: /3/ }));
    const current = screen.getAllByRole('button').filter((b) => b.ariaCurrent === 'true');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('develop');
  });

  it('reports the chosen branch and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(sha: string) => void>();
    renderMenu(null, onSelect);
    await user.click(screen.getByRole('button', { name: /3/ }));
    await user.click(screen.getByRole('button', { name: /feature\/x/ }));
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
});
