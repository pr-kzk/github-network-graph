import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GraphErrorKind } from '../lib/networkApi';
import { ErrorState } from './ErrorState';

function renderError(
  kind: GraphErrorKind,
  message: string,
  onRetry: () => void = vi.fn<() => void>(),
) {
  render(<ErrorState kind={kind} message={message} owner="o" repo="r" onRetry={onRetry} />);
}

describe('ErrorState', () => {
  it('renders the auth heading and a sign-in link', () => {
    renderError('auth', 'Need login');
    expect(screen.getByText('Sign in to GitHub', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in to GitHub/ })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/login'),
    );
  });

  it('offers sign-in when the repository is not found, since it may be private', () => {
    renderError('notFound', 'gone');
    expect(screen.getByRole('link', { name: /Sign in to GitHub/ })).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn<() => void>();
    renderError('network', 'fail', onRetry);
    await userEvent.setup().click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('tells a throttled user to wait and offers to open the repository on GitHub', () => {
    renderError('rateLimit', 'GitHub is limiting requests');
    expect(screen.getByText('Too many requests', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/Wait a few minutes, then press Retry/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r',
    );
    expect(screen.queryByRole('link', { name: /Sign in/ })).not.toBeInTheDocument();
  });

  it.each<[GraphErrorKind, string, string, RegExp]>([
    ['shape', 'unexpected schema', 'GitHub may have changed its response format', /unexpected/],
    ['network', 'Could not reach GitHub', 'Network error', /Check your internet connection or VPN/],
    ['server', 'HTTP 503', 'GitHub is having problems', /GitHub may be having problems/],
  ])(
    'explains a %s failure with a heading and the upstream message',
    (kind, msg, heading, advice) => {
      renderError(kind, msg);
      expect(screen.getByText(heading, { selector: 'h2' })).toBeInTheDocument();
      expect(screen.getByText(msg)).toBeInTheDocument();
      expect(screen.getByText(advice)).toBeInTheDocument();
    },
  );
});
