import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphPage } from './GraphPage';
import { copyToClipboard } from './lib/clipboard';
import type * as NetworkApi from './lib/networkApi';
import type { FetchedInitialPage } from './lib/networkApi.types';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const MISSING = 'd'.repeat(40);

const PAGE: FetchedInitialPage = {
  meta: {
    nethash: 'h',
    focus: 0,
    dates: [],
    name: 'r',
    users: [{ name: 'o', repo: 'r', heads: [{ name: 'main', id: C }] }],
  },
  commits: [
    {
      id: C,
      author: 0,
      time: 3,
      space: 0,
      parents: [{ sha: B, space: 0 }],
      message: 'Fix crash',
      authorName: 'Carol',
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
    { id: A, author: 0, time: 1, space: 0, parents: [], message: 'Initial', authorName: 'Alice' },
  ],
  nextEnd: 0,
  totalCount: 3,
};

vi.mock('./lib/networkApi', async (importOriginal) => ({
  ...(await importOriginal<typeof NetworkApi>()),
  createGithubNetworkClient: () => ({
    fetchInitialPage: async () => PAGE,
    fetchOlderPage: async () => ({ commits: [], nextEnd: 0, exhausted: true }),
  }),
}));

vi.mock('./hooks/useCommitDetailExtra', () => ({
  useCommitDetailExtra: () => ({ state: { status: 'idle' }, retry: () => undefined }),
}));

vi.mock('./lib/clipboard', () => ({
  copyToClipboard: vi.fn<(text: string) => Promise<boolean>>(async () => true),
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
});

type UrlState = { sha: string | null; mode: 'repo-only' | 'network' | null };

async function renderPage(initialUrlState: UrlState = { sha: null, mode: 'repo-only' }) {
  render(<GraphPage initialOwner="o" initialRepo="r" initialUrlState={initialUrlState} />);
  await screen.findByRole('list', { name: 'Commits' });
}

function row(sha: string): Element {
  const element = document.querySelector(`[data-sha="${sha}"]`);
  if (!element) throw new Error(`row ${sha} not rendered`);
  return element;
}

describe('GraphPage', () => {
  it('shows how many commits are loaded once the graph is ready', async () => {
    await renderPage();
    expect(screen.getByText('3 commits loaded · full history loaded')).toBeVisible();
  });

  it('selects the commit named in the URL once the graph has loaded', async () => {
    await renderPage({ sha: B, mode: 'repo-only' });
    expect(row(B)).toHaveAttribute('aria-current', 'true');
  });

  it('reflects the selected commit and mode in the address bar', async () => {
    await renderPage();
    await userEvent.setup().click(row(C));
    const params = new URLSearchParams(window.location.search);
    expect(params.get('sha')).toBe(C);
    expect(params.get('mode')).toBe('repo-only');
  });

  it('tells the user when the commit in the URL does not exist', async () => {
    await renderPage({ sha: MISSING, mode: 'repo-only' });
    expect(
      await screen.findByText(/That commit was not found in the repository history. .*Refresh/),
    ).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).has('sha')).toBe(false);
  });

  it('copies a link to the selected commit view', async () => {
    await renderPage({ sha: B, mode: 'repo-only' });
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Copy link to this commit view' }));
    const copied = vi.mocked(copyToClipboard).mock.calls.at(-1)?.[0] ?? '';
    const params = new URL(copied).searchParams;
    expect(params.get('sha')).toBe(B);
    expect(params.get('mode')).toBe('repo-only');
  });

  it('moves the selection with j and k', async () => {
    await renderPage({ sha: C, mode: 'repo-only' });
    fireEvent.keyDown(document.body, { key: 'j' });
    expect(row(B)).toHaveAttribute('aria-current', 'true');
    fireEvent.keyDown(document.body, { key: 'k' });
    expect(row(C)).toHaveAttribute('aria-current', 'true');
  });

  it('counts matches among the loaded commits and selects them with Enter', async () => {
    await renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Search loaded commits' }), 'docs');
    expect(screen.getByText('1 of 3 loaded')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(row(B)).toHaveAttribute('aria-current', 'true');
    expect(row(B)).toHaveAttribute('data-match', 'true');
  });

  it('focuses the search field with the slash key', async () => {
    await renderPage();
    fireEvent.keyDown(document.body, { key: '/' });
    expect(screen.getByRole('textbox', { name: 'Search loaded commits' })).toHaveFocus();
  });

  it('opens the shortcuts dialog with ? and closes it with Escape', async () => {
    await renderPage();
    fireEvent.keyDown(document.body, { key: '?' });
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not treat shortcut keys as navigation while typing in the search field', async () => {
    await renderPage({ sha: C, mode: 'repo-only' });
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Search loaded commits' }), 'jk');
    expect(row(C)).toHaveAttribute('aria-current', 'true');
  });
});
