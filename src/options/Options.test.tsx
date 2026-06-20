import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Options telemetry toggle', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', 'A-US-0000000000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is on by default and persists opt-out on change', async () => {
    render(<Options />);

    const toggle = await screen.findByLabelText(/Send anonymous usage statistics/i);
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect((await localStore.get('telemetry')).enabled).toBe(false);
  });

  it('is hidden when no telemetry key is configured', async () => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', '');
    render(<Options />);
    expect(await screen.findByLabelText(/Include forks/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Send anonymous usage statistics/i)).not.toBeInTheDocument();
  });
});
