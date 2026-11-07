import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContainingRefsSection } from './ContainingRefsSection';

describe('ContainingRefsSection', () => {
  it('jumps to the tip of the chosen branch', async () => {
    const onClick = vi.fn<(sha: string) => void>();
    render(
      <ContainingRefsSection
        refs={[
          { name: 'main', ownerName: 'o', isFocus: true, sha: 'tip-main' },
          { name: 'feature', ownerName: 'fork', isFocus: false, sha: 'tip-feature' },
        ]}
        onClick={onClick}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'fork:feature' }));

    expect(onClick).toHaveBeenCalledWith('tip-feature');
    expect(screen.getByRole('button', { name: 'main' })).toBeInTheDocument();
  });

  it('explains when no loaded branch contains the commit', () => {
    render(<ContainingRefsSection refs={[]} onClick={() => undefined} />);
    expect(screen.getByText('(no branch tip among loaded commits)')).toBeInTheDocument();
  });

  describe('with a very long list', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      name: `branch-${String(i).padStart(3, '0')}`,
      ownerName: 'o',
      isFocus: true,
      sha: `tip-${i}`,
    }));

    it('lists only the first branches until asked for all of them', async () => {
      render(<ContainingRefsSection refs={many} onClick={() => undefined} />);
      expect(screen.getByRole('button', { name: 'branch-000' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'branch-499' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Show all 500' }));

      expect(screen.getByRole('button', { name: 'branch-499' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Show all 500' })).not.toBeInTheDocument();
    });

    it('offers no expander when every branch is already listed', () => {
      render(<ContainingRefsSection refs={many.slice(0, 5)} onClick={() => undefined} />);
      expect(screen.queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();
    });
  });
});
