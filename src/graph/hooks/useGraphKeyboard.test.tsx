import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useGraphKeyboard, type UseGraphKeyboardArgs } from './useGraphKeyboard';
import type { ViewCommit } from '../lib/transform.types';

function commit(sha: string, row: number, parents: string[] = []): ViewCommit {
  return {
    sha,
    shortSha: sha,
    row,
    lane: 0,
    time: 0,
    dateLabel: '',
    authorName: '',
    authorLogin: '',
    authorRepo: '',
    isFocus: true,
    message: '',
    subject: '',
    parents,
    refs: [],
  };
}

const COMMITS = [commit('c', 0, ['b']), commit('b', 1, ['a']), commit('a', 2)];

type Handlers = Pick<
  UseGraphKeyboardArgs,
  'onSelect' | 'onFocusDetail' | 'onFocusSearch' | 'onShowShortcuts'
>;

function Harness({ selectedSha, handlers }: { selectedSha: string | null; handlers: Handlers }) {
  useGraphKeyboard({
    commits: COMMITS,
    selectedSha,
    commitBySha: new Map(COMMITS.map((c) => [c.sha, c])),
    childrenBySha: new Map([['b', ['c']]]),
    ...handlers,
  });
  return (
    <div>
      <button type="button">outside</button>
      <input aria-label="field" />
      <dialog open aria-label="dialog">
        <button type="button">in dialog</button>
      </dialog>
      <ul data-commit-list="">
        <li>
          <button type="button" tabIndex={0}>
            row
          </button>
        </li>
      </ul>
      <aside data-commit-detail="" tabIndex={-1}>
        <button type="button">in detail</button>
      </aside>
    </div>
  );
}

function setup(selectedSha: string | null = 'b') {
  const handlers: Handlers = {
    onSelect: vi.fn<(sha: string) => void>(),
    onFocusDetail: vi.fn<() => void>(),
    onFocusSearch: vi.fn<() => void>(),
    onShowShortcuts: vi.fn<() => void>(),
  };
  render(<Harness selectedSha={selectedSha} handlers={handlers} />);
  return handlers;
}

afterEach(() => {
  document.body.focus();
});

describe('useGraphKeyboard', () => {
  it.each([
    ['j', 'a'],
    ['ArrowDown', 'a'],
    ['k', 'c'],
    ['ArrowUp', 'c'],
    ['g', 'c'],
    ['Home', 'c'],
    ['G', 'a'],
    ['End', 'a'],
    ['[', 'a'],
    [']', 'c'],
  ])('%s selects %s', (key, expected) => {
    const handlers = setup('b');
    fireEvent.keyDown(document.body, { key });
    expect(handlers.onSelect).toHaveBeenCalledWith(expected);
  });

  it('does not reselect the commit that is already selected', () => {
    const handlers = setup('c');
    fireEvent.keyDown(document.body, { key: 'k' });
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it('keeps the arrow keys from scrolling the page while navigating', () => {
    setup('b');
    const notPrevented = fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    expect(notPrevented).toBe(false);
  });

  it('opens the shortcuts dialog with ?', () => {
    const handlers = setup();
    fireEvent.keyDown(document.body, { key: '?', shiftKey: true });
    expect(handlers.onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it('focuses the search field with / without typing the slash', () => {
    const handlers = setup();
    const notPrevented = fireEvent.keyDown(document.body, { key: '/' });
    expect(handlers.onFocusSearch).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('moves focus to the details with Enter when a commit is selected', () => {
    const handlers = setup('b');
    fireEvent.keyDown(screen.getByRole('button', { name: 'row' }), { key: 'Enter' });
    expect(handlers.onFocusDetail).toHaveBeenCalledTimes(1);
  });

  it('selects the newest commit with Enter when nothing is selected', () => {
    const handlers = setup(null);
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(handlers.onSelect).toHaveBeenCalledWith('c');
  });

  it('leaves Enter alone on buttons outside the commit list', () => {
    const handlers = setup('b');
    fireEvent.keyDown(screen.getByRole('button', { name: 'outside' }), { key: 'Enter' });
    expect(handlers.onFocusDetail).not.toHaveBeenCalled();
  });

  it('ignores shortcuts while typing in a field', () => {
    const handlers = setup('b');
    const field = screen.getByLabelText('field');
    fireEvent.keyDown(field, { key: 'j' });
    fireEvent.keyDown(field, { key: '?' });
    fireEvent.keyDown(field, { key: '/' });
    expect(handlers.onSelect).not.toHaveBeenCalled();
    expect(handlers.onShowShortcuts).not.toHaveBeenCalled();
    expect(handlers.onFocusSearch).not.toHaveBeenCalled();
  });

  it('ignores shortcuts inside a dialog', () => {
    const handlers = setup('b');
    fireEvent.keyDown(screen.getByRole('button', { name: 'in dialog' }), { key: 'j' });
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it('ignores keys combined with Ctrl or Meta', () => {
    const handlers = setup('b');
    fireEvent.keyDown(document.body, { key: 'j', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'j', metaKey: true });
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it('leaves the arrow keys to the details panel for scrolling', () => {
    const handlers = setup('b');
    fireEvent.keyDown(screen.getByRole('button', { name: 'in detail' }), { key: 'ArrowDown' });
    expect(handlers.onSelect).not.toHaveBeenCalled();
  });

  it('still navigates with letter keys from the details panel', () => {
    const handlers = setup('b');
    screen.getByRole('button', { name: 'in detail' }).focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'j' });
    expect(handlers.onSelect).toHaveBeenCalledWith('a');
  });

  it('returns focus from the details panel to the list with Escape', () => {
    setup('b');
    const inDetail = screen.getByRole('button', { name: 'in detail' });
    inDetail.focus();
    fireEvent.keyDown(inDetail, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'row' })).toHaveFocus();
  });
});
