import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeekBanner } from './SeekBanner';

describe('SeekBanner', () => {
  it('names what is being searched for and how far the scan has come', () => {
    render(
      <SeekBanner
        target="release/1.x"
        scanned={3100}
        total={8000}
        onCancel={vi.fn<() => void>()}
      />,
    );
    const banner = screen.getByText(/Looking for release\/1\.x/).closest('output');
    expect(banner).toHaveTextContent('3,100 of 8,000 commits scanned');
  });

  it('only reports the scanned count when the total is unknown', () => {
    render(<SeekBanner target="abc1234" scanned={300} total={0} onCancel={vi.fn<() => void>()} />);
    expect(screen.getByText('300 commits scanned')).toBeInTheDocument();
  });

  it('lets the user cancel the search', async () => {
    const onCancel = vi.fn<() => void>();
    render(<SeekBanner target="abc1234" scanned={300} total={800} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
