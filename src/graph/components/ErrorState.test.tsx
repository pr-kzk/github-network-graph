import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import jaMessages from '../../../public/_locales/ja/messages.json' with { type: 'json' };
import type { GraphErrorKind } from '../lib/networkApi';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the auth heading and a sign-in link', () => {
    render(
      <ErrorState
        kind="auth"
        message="Need login"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText('Sign in to GitHub', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in to GitHub/ })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com/login'),
    );
  });

  it('offers sign-in when the repository is not found, since it may be private', () => {
    render(
      <ErrorState
        kind="notFound"
        message="gone"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByRole('link', { name: /Sign in to GitHub/ })).toBeInTheDocument();
  });

  it('renders a dedicated heading for rate limiting without a sign-in link', () => {
    render(
      <ErrorState
        kind="rateLimit"
        message="slow down"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText('Too many requests', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Sign in/ })).not.toBeInTheDocument();
  });

  it('renders the shape heading with the upstream message', () => {
    render(
      <ErrorState
        kind="shape"
        message="unexpected schema"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText(/GitHub may have changed/)).toBeInTheDocument();
    expect(screen.getByText('unexpected schema')).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn<() => void>();
    const user = (await import('@testing-library/user-event')).default;
    render(<ErrorState kind="network" message="fail" owner="o" repo="r" onRetry={onRetry} />);
    await user.setup().click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('tells a throttled user to wait and offers to open the repository on GitHub', () => {
    render(
      <ErrorState
        kind="rateLimit"
        message="GitHub is limiting requests"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText(/Wait a few minutes, then press Retry/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/o/r',
    );
  });

  it('suggests checking the connection or VPN after a network failure', () => {
    render(
      <ErrorState
        kind="network"
        message="Could not reach GitHub"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
    expect(screen.getByText('Network error', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(/Check your internet connection or VPN/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says GitHub may be having problems after a server error', () => {
    render(
      <ErrorState
        kind="server"
        message="HTTP 503"
        owner="o"
        repo="r"
        onRetry={vi.fn<() => void>()}
      />,
    );
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
    render(<ErrorState kind={kind} message="m" owner="o" repo="r" onRetry={vi.fn<() => void>()} />);
    expect(screen.getByText(heading, { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(advice))).toBeInTheDocument();
  });
});
