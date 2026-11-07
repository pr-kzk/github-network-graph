import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { localStore } from '@/shared/storage';
import type { RepoRef } from '../lib/parseUrl';
import { RepoSwitcher } from './RepoSwitcher';

async function renderSwitcher(onSwitch = vi.fn<(target: RepoRef) => void>()) {
  await localStore.set('recentRepos', [
    { owner: 'o', repo: 'r', openedAt: 3 },
    { owner: 'facebook', repo: 'react', openedAt: 2 },
    { owner: 'numpy', repo: 'numpy', openedAt: 1 },
  ]);
  render(<RepoSwitcher owner="o" repo="r" onSwitch={onSwitch} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Switch repository' }));
  return { user, onSwitch, input: screen.getByRole('combobox', { name: 'Repository' }) };
}

function suggestionLabels(): (string | null)[] {
  return within(screen.getByRole('listbox', { name: 'Recent repositories' }))
    .getAllByRole('option')
    .map((item) => item.textContent);
}

describe('RepoSwitcher', () => {
  it('shows the current repository as a chip with a link to GitHub', () => {
    render(<RepoSwitcher owner="o" repo="r" onSwitch={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Switch repository' })).toHaveTextContent('o/r');
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r',
    );
  });

  it('switches to a repository typed as a URL', async () => {
    const { user, onSwitch, input } = await renderSwitcher();
    await user.clear(input);
    await user.type(input, 'https://github.com/numpy/numpy{Enter}');

    expect(onSwitch).toHaveBeenCalledWith({ owner: 'numpy', repo: 'numpy' });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('suggests recent repositories except the current one', async () => {
    const { user, input } = await renderSwitcher();
    await user.clear(input);
    const options = suggestionLabels();
    expect(options).toEqual(['facebook/react', 'numpy/numpy']);
  });

  it('narrows suggestions as the user types', async () => {
    const { user, input } = await renderSwitcher();
    await user.clear(input);
    await user.type(input, 'nump');

    expect(suggestionLabels()).toEqual(['numpy/numpy']);
  });

  it.each([
    ['arrow keys', { owner: 'numpy', repo: 'numpy' }],
    ['mouse', { owner: 'facebook', repo: 'react' }],
  ])('opens a suggestion chosen with the %s', async (device, expected) => {
    const { user, onSwitch, input } = await renderSwitcher();
    await user.clear(input);
    if (device === 'mouse')
      await user.click(screen.getByRole('option', { name: 'facebook/react' }));
    else await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onSwitch).toHaveBeenCalledWith(expected);
  });

  it('explains invalid input and stays open', async () => {
    const { user, onSwitch, input } = await renderSwitcher();
    await user.clear(input);
    await user.type(input, 'not a repo{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a GitHub URL or "owner/repo".');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('clears the validation message once the user edits again', async () => {
    const { user, input } = await renderSwitcher();
    await user.clear(input);
    await user.type(input, 'bad{Enter}');
    await user.type(input, 'x');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels with Escape and returns focus to the chip', async () => {
    const { user, onSwitch } = await renderSwitcher();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch repository' })).toHaveFocus();
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('does nothing when the current repository is submitted again', async () => {
    const { user, onSwitch } = await renderSwitcher();
    await user.keyboard('{Enter}');

    expect(onSwitch).not.toHaveBeenCalled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('closes when the user clicks elsewhere', async () => {
    const { user } = await renderSwitcher();
    await user.click(document.body);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('exposes the highlighted suggestion to assistive technology', async () => {
    const { user, input } = await renderSwitcher();
    await user.clear(input);
    await user.keyboard('{ArrowDown}');

    const highlighted = screen.getByRole('option', { name: 'facebook/react' });
    expect(input).toHaveAttribute('aria-activedescendant', highlighted.id);
    expect(highlighted).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });
});
