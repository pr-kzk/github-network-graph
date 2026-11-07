import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { localStore } from '@/shared/storage';
import { GraphPage } from './GraphPage';
import type * as NetworkApi from './lib/networkApi';
import type { FetchedInitialPage } from './lib/networkApi.types';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const F = 'f'.repeat(40);

function pageFor(subject: string): FetchedInitialPage {
  return {
    meta: {
      nethash: 'h',
      focus: 0,
      dates: [],
      name: 'r',
      users: [
        { name: 'o', repo: 'r', heads: [{ name: 'main', id: C }] },
        { name: 'alice', repo: 'r', heads: [{ name: 'experiment', id: F }] },
      ],
    },
    commits: [
      {
        id: C,
        author: 0,
        time: 4,
        space: 0,
        parents: [{ sha: B, space: 0 }],
        message: subject,
        authorName: 'Carol',
      },
      {
        id: F,
        author: 1,
        time: 3,
        space: 1,
        parents: [{ sha: B, space: 0 }],
        message: 'Try idea',
        authorName: 'Alice',
      },
      {
        id: B,
        author: 0,
        time: 2,
        space: 0,
        parents: [{ sha: A, space: 0 }],
        message: 'Add docs',
        authorName: 'Bob',
      },
      { id: A, author: 0, time: 1, space: 0, parents: [], message: 'Initial', authorName: 'Al' },
    ],
    nextEnd: 0,
    totalCount: 4,
  };
}

const fetchInitialPage = vi.hoisted(() => vi.fn<(owner: string, repo: string) => unknown>());

vi.mock('./lib/networkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkApi>()),
  createGithubNetworkClient: () => ({
    fetchInitialPage,
    fetchOlderPage: async () => ({ commits: [], nextEnd: 0, exhausted: true }),
  }),
}));

vi.mock('./hooks/useCommitDetailExtra', () => ({
  useCommitDetailExtra: () => ({ state: { status: 'idle' }, retry: () => undefined }),
}));

beforeAll(() => {
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(600);
});

afterAll(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  window.history.replaceState(null, '', '/?owner=o&repo=r');
  fetchInitialPage.mockReset();
  fetchInitialPage.mockImplementation(async () => pageFor('Fix crash'));
});

async function renderPage(sha: string | null = null) {
  render(<GraphPage initialOwner="o" initialRepo="r" initialUrlState={{ sha, mode: 'network' }} />);
  await screen.findByRole('list', { name: 'Commits' });
}

describe('GraphPage flow', () => {
  it('switches repository from the header chip and resets the selection', async () => {
    await renderPage(B);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Switch repository' }));
    await user.keyboard('numpy/numpy{Enter}');

    await waitFor(() =>
      expect(fetchInitialPage).toHaveBeenLastCalledWith('numpy', 'numpy', expect.anything()),
    );
    const params = new URLSearchParams(window.location.search);
    expect(params.get('owner')).toBe('numpy');
    expect(params.get('repo')).toBe('numpy');
    expect(params.has('sha')).toBe(false);
    expect(document.title).toBe('numpy/numpy - Git Graph');
    await waitFor(async () =>
      expect((await localStore.get('recentRepos')).map((e) => e.owner)).toContain('numpy'),
    );
  });

  it('keeps the list on screen while refreshing and shows an indicator', async () => {
    await renderPage();
    let finish: (page: FetchedInitialPage) => void = () => undefined;
    fetchInitialPage.mockImplementation(
      () => new Promise<FetchedInitialPage>((resolve) => (finish = resolve)),
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));

    expect(screen.getByRole('list', { name: 'Commits' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();

    await act(async () => finish(pageFor('Brand new subject')));

    expect(await screen.findByText('Brand new subject')).toBeInTheDocument();
    expect(screen.queryByText('Refreshing…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  });

  it('keeps the selected commit selected across a refresh', async () => {
    await renderPage(B);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(fetchInitialPage).toHaveBeenCalledTimes(2));
    expect(document.querySelector(`[data-sha="${B}"]`)).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the old data and tells the user when a refresh fails', async () => {
    await renderPage();
    fetchInitialPage.mockImplementation(async () => {
      throw new Error('offline');
    });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));

    expect(
      await screen.findByText("Couldn't refresh. Showing the previous data."),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Commits' })).toBeInTheDocument();
  });

  it('lists fork branches in the branch menu and jumps to one', async () => {
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /^Branches/ }));
    await user.click(screen.getByRole('option', { name: 'experiment' }));

    expect(document.querySelector(`[data-sha="${F}"]`)).toHaveAttribute('aria-current', 'true');
  });

  it('shows which branches contain the selected commit', async () => {
    await renderPage(B);

    const detail = screen.getByRole('complementary', { name: 'Commit details' });
    expect(within(detail).getByRole('button', { name: 'main' })).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: 'alice:experiment' })).toBeInTheDocument();
  });

  it('collapses the details panel to give the list the full width', async () => {
    await renderPage(B);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Hide details panel' }));

    expect(screen.queryByRole('button', { name: 'main' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show details panel' })).toBeInTheDocument();
  });
});
