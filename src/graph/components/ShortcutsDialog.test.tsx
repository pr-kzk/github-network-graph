import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ShortcutsDialog } from './ShortcutsDialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      {open ? <ShortcutsDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

describe('ShortcutsDialog', () => {
  it('is a labelled modal dialog listing the shortcuts', () => {
    render(<ShortcutsDialog onClose={vi.fn<() => void>()} />);
    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Select the next (older) commit')).toBeInTheDocument();
    expect(screen.getByText('Focus the search field')).toBeInTheDocument();
  });

  it('moves focus to the close button on open', () => {
    render(<ShortcutsDialog onClose={vi.fn<() => void>()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn<() => void>();
    render(<ShortcutsDialog onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is pressed', () => {
    const onClose = vi.fn<() => void>();
    const { container } = render(<ShortcutsDialog onClose={onClose} />);
    const backdrop = container.firstElementChild;
    if (!backdrop) throw new Error('backdrop not found');
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<ShortcutsDialog onClose={vi.fn<() => void>()} />);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('returns focus to the opener when closed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'open' })).toHaveFocus();
  });
});
