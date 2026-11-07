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

  it('hides the explanation when the user clicks elsewhere', async () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    const help = screen.getByRole('button', { name: 'About display modes' });
    await userEvent.click(help);

    await userEvent.click(document.body);
    expect(help).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the explanation open when the user clicks inside the toggle', async () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    const help = screen.getByRole('button', { name: 'About display modes' });
    await userEvent.click(help);

    await userEvent.click(screen.getByRole('button', { name: 'Main only' }));
    expect(help).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides the explanation when focus moves on with Tab', async () => {
    render(<ModeToggle mode="network" onChange={vi.fn<(mode: GraphMode) => void>()} />);
    const help = screen.getByRole('button', { name: 'About display modes' });
    await userEvent.click(help);

    await userEvent.tab();
    expect(help).toHaveAttribute('aria-expanded', 'false');
  });
});
