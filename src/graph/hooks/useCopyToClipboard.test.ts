import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCopyToClipboard } from './useCopyToClipboard';
import { copyToClipboard } from '../lib/clipboard';
import type { ToastKind } from './useToast';

vi.mock('../lib/clipboard', () => ({
  copyToClipboard: vi.fn<(text: string) => Promise<boolean>>(),
}));

describe('useCopyToClipboard', () => {
  const showToast = vi.fn<(kind: ToastKind, message: string) => void>();

  beforeEach(() => {
    showToast.mockReset();
  });

  it('confirms a successful copy', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(true);
    const { result } = renderHook(() => useCopyToClipboard(showToast));
    await act(() => result.current('abc'));
    expect(copyToClipboard).toHaveBeenCalledWith('abc');
    expect(showToast).toHaveBeenCalledWith('success', 'Copied');
  });

  it('reports a failed copy as an error', async () => {
    vi.mocked(copyToClipboard).mockResolvedValue(false);
    const { result } = renderHook(() => useCopyToClipboard(showToast));
    await act(() => result.current('abc'));
    expect(showToast).toHaveBeenCalledWith('error', 'Copy failed');
  });
});
