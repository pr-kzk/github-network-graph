import { describe, expect, it } from 'vitest';
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
