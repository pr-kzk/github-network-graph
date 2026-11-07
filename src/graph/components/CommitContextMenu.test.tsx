import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommitContextMenu, type ContextMenuItem } from './CommitContextMenu';

function items(onFirst: () => void = vi.fn<() => void>()): ContextMenuItem[] {
  return [
    { kind: 'item', id: 'one', label: 'One', onClick: onFirst },
    { kind: 'separator', id: 'sep' },
    { kind: 'item', id: 'two', label: 'Two', onClick: vi.fn<() => void>(), disabled: true },
    { kind: 'item', id: 'three', label: 'Three', onClick: vi.fn<() => void>() },
  ];
}

function Harness({ onFirst }: { onFirst?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        opener
      </button>
      {open ? (
        <CommitContextMenu x={0} y={0} items={items(onFirst)} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'opener' }));
  return user;
}

describe('CommitContextMenu keyboard support', () => {
  it('moves focus to the first enabled item on open', async () => {
    render(<Harness />);
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus();
  });

  it('moves down and skips disabled items', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
  });

  it('wraps from the last item to the first', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus();
  });

  it('wraps upward from the first item to the last', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
  });

  it('jumps to the ends with End and Home', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Three' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus();
  });

  it('activates the focused item with Enter and closes', async () => {
    const onFirst = vi.fn<() => void>();
    render(<Harness onFirst={onFirst} />);
    const user = await openMenu();
    await user.keyboard('{Enter}');
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes with Escape and restores focus to the opener', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'opener' })).toHaveFocus();
  });

  it('closes with Tab instead of leaving focus behind', async () => {
    render(<Harness />);
    const user = await openMenu();
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
