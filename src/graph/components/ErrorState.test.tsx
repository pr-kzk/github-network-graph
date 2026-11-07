import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import jaMessages from '../../../public/_locales/ja/messages.json' with { type: 'json' };
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

  it('renders a dedicated heading for rate limiting without a sign-in link', () => {
    renderError('rateLimit', 'slow down');
    expect(screen.getByText('Too many requests', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Sign in/ })).not.toBeInTheDocument();
  });

  it('renders the shape heading with the upstream message', () => {
    renderError('shape', 'unexpected schema');
    expect(screen.getByText(/GitHub may have changed/)).toBeInTheDocument();
    expect(screen.getByText('unexpected schema')).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn<() => void>();
    const user = (await import('@testing-library/user-event')).default;
    renderError('network', 'fail', onRetry);
    await user.setup().click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('tells a throttled user to wait and offers to open the repository on GitHub', () => {
    renderError('rateLimit', 'GitHub is limiting requests');
    expect(screen.getByText(/Wait a few minutes, then press Retry/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r',
    );
  });

  it('suggests checking the connection or VPN after a network failure', () => {
    renderError('network', 'Could not reach GitHub');
    expect(screen.getByText('Network error', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/Check your internet connection or VPN/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says GitHub may be having problems after a server error', () => {
    renderError('server', 'HTTP 503');
    expect(screen.getByText('GitHub is having problems', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/GitHub may be having problems/)).toBeInTheDocument();
  });

  it.each<[GraphErrorKind, string, string]>([
    ['rateLimit', 'リクエストが多すぎます', '数分待ってから'],
    ['network', '通信エラー', 'インターネット接続や VPN'],
    ['server', 'GitHub 側で問題が発生しています', 'GitHub 側で問題が起きている可能性'],
  ])('explains a %s failure in Japanese with a heading and advice', (kind, heading, advice) => {
    const catalog: Record<string, { message: string }> = jaMessages;
    vi.stubGlobal('chrome', {
      i18n: { getMessage: (key: string) => catalog[key]?.message ?? '' },
    });
    renderError(kind, 'm');
    expect(screen.getByText(heading, { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(advice))).toBeInTheDocument();
  });
});
