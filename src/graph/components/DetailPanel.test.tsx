import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { localStore } from '@/shared/storage';
import { useDetailLayout } from '../hooks/useDetailLayout';
import { DetailPanel } from './DetailPanel';

function Harness({ hasSelection = false }: { hasSelection?: boolean }) {
  const layout = useDetailLayout();
  return (
    <DetailPanel layout={layout} panelRef={null} hasSelection={hasSelection}>
      <p>detail content</p>
    </DetailPanel>
  );
}

function handle(): HTMLElement {
  return screen.getByRole('button', { name: 'Resize details panel' });
}

function panelWidth(): string {
  return screen.getByRole('complementary', { name: 'Commit details' }).style.width;
}

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('DetailPanel', () => {
  const originalWidth = window.innerWidth;
  beforeEach(() => setWindowWidth(1400));
  afterEach(() => setWindowWidth(originalWidth));

  it('shows its content at the default width', () => {
    render(<Harness />);
    expect(screen.getByText('detail content')).toBeInTheDocument();
    expect(panelWidth()).toBe('420px');
  });

  it('collapses to a rail and remembers the choice', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide details panel' }));

    expect(screen.queryByText('detail content')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resize details panel' })).not.toBeInTheDocument();
    expect((await localStore.get('graphLayout')).detailCollapsed).toBe(true);
  });

  it('expands again from the rail', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Hide details panel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show details panel' }));

    expect(screen.getByText('detail content')).toBeInTheDocument();
  });

  it('widens with the left arrow and narrows with the right arrow on the handle', async () => {
    render(<Harness />);

    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(panelWidth()).toBe('444px');
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(panelWidth()).toBe('396px');
    expect((await localStore.get('graphLayout')).detailWidth).toBe(396);
  });

  it('never narrows below the minimum width', () => {
    render(<Harness />);
    for (let i = 0; i < 20; i++) fireEvent.keyDown(handle(), { key: 'ArrowRight' });

    expect(panelWidth()).toBe('280px');
  });

  it('resizes while dragging the handle and saves on release', async () => {
    render(<Harness />);

    fireEvent.pointerDown(handle(), { clientX: 600, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientX: 500, pointerId: 1 });
    expect(panelWidth()).toBe('520px');
    fireEvent.pointerUp(handle(), { clientX: 500, pointerId: 1 });

    expect((await localStore.get('graphLayout')).detailWidth).toBe(520);
  });

  it('sizes the default width as a share of the window within sensible limits', () => {
    setWindowWidth(1100);
    const { unmount } = render(<Harness />);
    expect(panelWidth()).toBe('330px');
    unmount();
    setWindowWidth(2400);
    render(<Harness />);
    expect(panelWidth()).toBe('480px');
  });

  it('starts collapsed in a narrow window and keeps the selection reachable from the rail', () => {
    setWindowWidth(900);
    render(<Harness hasSelection />);
    expect(screen.queryByText('detail content')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show details panel' })).toHaveTextContent('Details');
  });

  it('opens from the rail in a narrow window and remembers that choice', async () => {
    setWindowWidth(900);
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Show details panel' }));
    expect(screen.getByText('detail content')).toBeInTheDocument();
    expect((await localStore.get('graphLayout')).detailCollapsed).toBe(false);
  });

  it('keeps a width the user chose however wide the window is', async () => {
    await localStore.set('graphLayout', { detailWidth: 600, detailCollapsed: false });
    setWindowWidth(1000);
    render(<Harness />);
    await waitFor(() => expect(panelWidth()).toBe('600px'));
  });

  it('stays expanded in a narrow window when the user expanded it before', async () => {
    await localStore.set('graphLayout', { detailWidth: null, detailCollapsed: false });
    setWindowWidth(800);
    render(<Harness />);
    expect(await screen.findByText('detail content')).toBeInTheDocument();
  });
});
