import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('copyToClipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports success when the async clipboard accepts the text', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
  });

  it('falls back to the legacy copy command when the async clipboard is rejected', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    const execCommand = vi.fn<typeof document.execCommand>().mockReturnValue(true);
    document.execCommand = execCommand;
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('reports failure when both strategies are refused', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    document.execCommand = vi.fn<typeof document.execCommand>().mockReturnValue(false);
    await expect(copyToClipboard('abc')).resolves.toBe(false);
  });

  it('reports failure when the legacy command throws', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    document.execCommand = vi.fn<typeof document.execCommand>(() => {
      throw new Error('unsupported');
    });
    await expect(copyToClipboard('abc')).resolves.toBe(false);
  });
});
