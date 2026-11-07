import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SearchBox, type SearchBoxProps } from './SearchBox';

function setup(overrides: Partial<SearchBoxProps> = {}) {
  const props: SearchBoxProps = {
    query: '',
    matchCount: 0,
    loadedCount: 120,
    hasMore: false,
    loadingMore: false,
    inputRef: createRef<HTMLInputElement>(),
    onQueryChange: vi.fn<(query: string) => void>(),
    onStep: vi.fn<(direction: 1 | -1) => void>(),
    onLoadOlder: vi.fn<() => void>(),
    ...overrides,
  };
  render(<SearchBox {...props} />);
  return props;
}

const input = () => screen.getByRole('textbox', { name: 'Search loaded commits' });

describe('SearchBox', () => {
  it('reports typed text', () => {
    const props = setup();
    fireEvent.change(input(), { target: { value: 'fix' } });
    expect(props.onQueryChange).toHaveBeenCalledWith('fix');
  });

  it('steps to the next match with Enter', () => {
    const props = setup({ query: 'fix', matchCount: 3 });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(props.onStep).toHaveBeenCalledWith(1);
  });

  it('steps to the previous match with Shift+Enter', () => {
    const props = setup({ query: 'fix', matchCount: 3 });
    fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(props.onStep).toHaveBeenCalledWith(-1);
  });

  it('clears the query with Escape', () => {
    const props = setup({ query: 'fix', matchCount: 3 });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(props.onQueryChange).toHaveBeenCalledWith('');
  });

  it('leaves the field with Escape when the query is already empty', () => {
    setup();
    input().focus();
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input()).not.toHaveFocus();
  });

  it('shows how many of the loaded commits match', () => {
    setup({ query: 'fix', matchCount: 3 });
    expect(screen.getByText('3 of 120 loaded')).toBeInTheDocument();
  });

  it('says so when nothing matches', () => {
    setup({ query: 'zzz', matchCount: 0 });
    expect(screen.getByText('No matches in 120 loaded commits')).toBeInTheDocument();
  });

  it('stays quiet until the user starts searching', () => {
    setup({ hasMore: true });
    expect(screen.queryByText(/commits loaded/)).not.toBeInTheDocument();
  });

  it('warns that older commits are not searched and offers to load them', () => {
    const props = setup({ query: 'fix', matchCount: 3, hasMore: true });
    expect(screen.getByText('Older commits are not searched yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load older commits' }));
    expect(props.onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('does not offer to load older commits once the whole history is loaded', () => {
    setup({ query: 'fix', matchCount: 3, hasMore: false });
    expect(screen.queryByRole('button', { name: 'Load older commits' })).not.toBeInTheDocument();
  });

  it('disables loading while older commits are being fetched', () => {
    setup({ query: 'fix', matchCount: 3, hasMore: true, loadingMore: true });
    expect(screen.getByRole('button', { name: 'Loading older commits…' })).toBeDisabled();
  });

  it('disables match stepping when there are no matches', () => {
    setup({ query: 'zzz', matchCount: 0 });
    expect(screen.getByRole('button', { name: 'Next match (Enter)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous match (Shift+Enter)' })).toBeDisabled();
  });

  it('steps with the arrow buttons', () => {
    const props = setup({ query: 'fix', matchCount: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'Next match (Enter)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous match (Shift+Enter)' }));
    expect(props.onStep).toHaveBeenNthCalledWith(1, 1);
    expect(props.onStep).toHaveBeenNthCalledWith(2, -1);
  });
});
