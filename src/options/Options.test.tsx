import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Options } from './Options';
import { DEFAULT_GRAPH_PREFS, localStore } from '@/shared/storage';

describe('Options', () => {
  it('reflects the stored graph mode as the initial selection', async () => {
    await localStore.set('graphPrefs', { ...DEFAULT_GRAPH_PREFS, mode: 'repo-only' });
    render(<Options />);

    const repoOnly = await screen.findByLabelText(/Main repository only/i);
    expect(repoOnly).toBeChecked();
  });

  it('persists the selected mode on change', async () => {
    render(<Options />);

    const network = await screen.findByLabelText(/Include forks/i);
    expect(network).toBeChecked();

    await userEvent.click(screen.getByLabelText(/Main repository only/i));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(await localStore.get('graphPrefs')).toEqual({
      ...DEFAULT_GRAPH_PREFS,
      mode: 'repo-only',
    });
  });

  it('falls back to default when storage is empty', async () => {
    render(<Options />);
    const defaultLabel =
      DEFAULT_GRAPH_PREFS.mode === 'network' ? /Include forks/i : /Main repository only/i;
    expect(await screen.findByLabelText(defaultLabel)).toBeChecked();
  });

  it('persists the selected theme on change', async () => {
    render(<Options />);

    const dark = await screen.findByLabelText(/Mid-grey background/i);
    expect(dark).toBeChecked();

    await userEvent.click(screen.getByLabelText(/White background with high contrast/i));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect((await localStore.get('graphPrefs')).theme).toBe('light');
  });
});
