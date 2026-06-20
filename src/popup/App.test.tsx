import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { localStore } from '@/shared/storage';

describe('Popup App', () => {
  it('renders Graph launcher and Options link', async () => {
    render(<App />);
    expect(await screen.findByText('Git Graph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open options/i })).toBeInTheDocument();
  });

  it('hides recent repos section when storage is empty', async () => {
    render(<App />);
    expect(await screen.findByText('Git Graph')).toBeInTheDocument();
    expect(screen.queryByLabelText('Recent repositories')).not.toBeInTheDocument();
  });

  it('shows stored recent repos and opens a new tab on click', async () => {
    await localStore.set('recentRepos', [
      { owner: 'numpy', repo: 'numpy', openedAt: Date.now() - 5 * 60_000 },
      { owner: 'facebook', repo: 'react', openedAt: Date.now() - 3 * 60 * 60_000 },
    ]);
    render(<App />);

    const region = await screen.findByLabelText('Recent repositories');
    expect(region).toBeInTheDocument();

    const item = screen.getByRole('button', { name: /numpy\/numpy/ });
    await userEvent.click(item);
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('owner=numpy&repo=numpy'),
    });
  });
});

describe('Popup telemetry consent banner', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', 'A-US-0000000000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the banner on first run and marks it seen when dismissed', async () => {
    render(<App />);

    expect(await screen.findByText(/anonymous usage stats/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Got it/i }));

    expect((await localStore.get('telemetry')).promptSeen).toBe(true);
  });

  it('opts out and marks the prompt seen when declined', async () => {
    render(<App />);

    await userEvent.click(await screen.findByRole('button', { name: /Turn off/i }));

    expect(await localStore.get('telemetry')).toEqual({ enabled: false, promptSeen: true });
  });

  it('hides the banner once the prompt has been seen', async () => {
    await localStore.set('telemetry', { enabled: true, promptSeen: true });
    render(<App />);

    expect(await screen.findByText('Git Graph')).toBeInTheDocument();
    expect(screen.queryByText(/anonymous usage stats/i)).not.toBeInTheDocument();
  });
});
