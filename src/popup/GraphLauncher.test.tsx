import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphLauncher } from './GraphLauncher';

describe('GraphLauncher', () => {
  it('opens the repository of the current GitHub tab', async () => {
    vi.mocked(chrome.tabs.query).mockImplementationOnce(() =>
      Promise.resolve([{ url: 'https://github.com/numpy/numpy/issues' }]),
    );
    render(<GraphLauncher />);

    await userEvent.click(await screen.findByRole('button', { name: /numpy\/numpy/ }));

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('owner=numpy&repo=numpy'),
    });
  });

  it('opens a repository typed as owner/repo', async () => {
    render(<GraphLauncher />);

    await userEvent.type(screen.getByRole('textbox'), 'facebook/react{Enter}');

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('owner=facebook&repo=react'),
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains invalid input and opens nothing', async () => {
    render(<GraphLauncher />);

    await userEvent.type(screen.getByRole('textbox'), 'not a repo{Enter}');

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});
