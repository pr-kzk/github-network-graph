import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GraphMode } from '@/shared/storage';
import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('marks the active mode as pressed', () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    expect(screen.getByRole('button', { name: 'Include forks' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Main only' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reports the mode the user picks', async () => {
    const onChange = vi.fn<(mode: GraphMode) => void>();
    render(<ModeToggle mode="network" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Main only' }));
    expect(onChange).toHaveBeenCalledWith('repo-only');
  });

  it('explains each mode on hover', () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    expect(screen.getByRole('button', { name: 'Include forks' })).toHaveAttribute(
      'title',
      expect.stringContaining('large networks can take longer'),
    );
  });

  it('reveals the explanation of both modes from the help button and hides it on Escape', async () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    const help = screen.getByRole('button', { name: 'About display modes' });
    expect(help).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Shows only commits from the repository you entered/)).toBeVisible();

    await userEvent.keyboard('{Escape}');
    expect(help).toHaveAttribute('aria-expanded', 'false');
  });
});
