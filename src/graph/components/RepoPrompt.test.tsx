import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoPrompt } from './RepoPrompt';

function setup() {
  const onSubmit = vi.fn<(owner: string, repo: string) => void>();
  render(<RepoPrompt onSubmit={onSubmit} />);
  return { onSubmit, input: screen.getByRole('textbox', { name: 'Repository' }) };
}

describe('RepoPrompt', () => {
  it.each([
    ['owner/repo', 'facebook/react'],
    ['a GitHub URL', 'https://github.com/facebook/react'],
  ])('opens the graph for %s', async (_, text) => {
    const { onSubmit, input } = setup();

    await userEvent.type(input, `${text}{Enter}`);

    expect(onSubmit).toHaveBeenCalledWith('facebook', 'react');
  });

  it('explains invalid input, opens nothing, and accepts a corrected entry', async () => {
    const { onSubmit, input } = setup();
    const user = userEvent.setup();

    await user.type(input, 'not a repo');
    await user.click(screen.getByRole('button', { name: 'Show graph' }));
    expect(screen.getByText('Enter a GitHub URL or "owner/repo".')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, 'numpy/numpy{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('numpy', 'numpy');
    expect(screen.queryByText('Enter a GitHub URL or "owner/repo".')).not.toBeInTheDocument();
  });
});
