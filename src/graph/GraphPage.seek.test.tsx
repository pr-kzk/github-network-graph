import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphPage } from './GraphPage';
import type * as NetworkApi from './lib/networkApi';
import type { FetchedInitialPage, FetchedOlderPage } from './lib/networkApi.types';

const NEWEST = 'c'.repeat(40);
const OLDER = 'b'.repeat(40);
const TARGET = 'd'.repeat(40);

const initialPage: FetchedInitialPage = {
  meta: {
    nethash: 'h',
    focus: 0,
    dates: Array.from({ length: 8 }, () => '2024-01-01T00:00:00Z'),
    users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: NEWEST }] }],
  },
  commits: [
    {
      id: NEWEST,
      author: 0,
      time: 4,
      space: 0,
      parents: [{ sha: OLDER, space: 0 }],
      message: 'Newest change',
    },
    { id: OLDER, author: 0, time: 3, space: 0, parents: [], message: 'Older change' },
  ],
  nextEnd: 4,
};

const olderPage: FetchedOlderPage = {
  commits: [{ id: TARGET, author: 0, time: 1, space: 0, parents: [], message: 'Deep history' }],
  nextEnd: 0,
};

const fetchOlderPage = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

vi.mock('./lib/networkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkApi>()),
  createGithubNetworkClient: () => ({
    fetchInitialPage: async () => initialPage,
    fetchOlderPage,
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

let finishSearch: (page: FetchedOlderPage) => void = () => undefined;

beforeEach(() => {
  window.history.replaceState(null, '', '/?owner=o&repo=r');
  fetchOlderPage.mockReset();
  fetchOlderPage.mockImplementation(
    () => new Promise<FetchedOlderPage>((resolve) => (finishSearch = resolve)),
  );
});

async function renderSeekingPage() {
  render(
    <GraphPage
      initialOwner="o"
      initialRepo="r"
      initialUrlState={{ sha: TARGET, mode: 'network' }}
    />,
  );
  await screen.findByRole('list', { name: 'Commits' });
}

describe('GraphPage seeking an older commit', () => {
  it('announces the search where the list is with its progress and a way to cancel', async () => {
    await renderSeekingPage();

    const banner = (await screen.findByText(/Looking for ddddddd/)).closest('output');
    expect(banner).toHaveTextContent('Looking for ddddddd in older history…');
    expect(banner).toHaveTextContent('2 of 8 commits scanned');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows the branches button as busy while searching', async () => {
    await renderSeekingPage();
    expect(await screen.findByRole('button', { name: /Branches/ })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('stops the search and clears the selection when cancelled', async () => {
    await renderSeekingPage();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/Looking for/)).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has('sha')).toBe(false);
    await act(async () => finishSearch(olderPage));
    expect(screen.queryByText('Deep history')).not.toBeInTheDocument();
  });

  it('highlights the commit and confirms with a toast once the search reaches it', async () => {
    await renderSeekingPage();
    await screen.findByText(/Looking for/);

    await act(async () => finishSearch(olderPage));

    expect(await screen.findByText('Jumped to ddddddd')).toBeInTheDocument();
    expect(screen.queryByText(/Looking for/)).not.toBeInTheDocument();
    const row = screen
      .getByRole('list', { name: 'Commits' })
      .querySelector(`[data-sha="${TARGET}"]`);
    expect(row).toHaveClass('row-flash');
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('tells the user what to do when the commit does not exist', async () => {
    await renderSeekingPage();
    await screen.findByText(/Looking for/);

    await act(async () => finishSearch({ commits: [], nextEnd: 0 } satisfies FetchedOlderPage));

    expect(await screen.findByText(/Try Refresh, or pick a branch/)).toBeInTheDocument();
  });
});
