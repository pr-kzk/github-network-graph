import { afterAll, beforeAll, vi } from 'vitest';

export const idleCommitDetailExtra = {
  useCommitDetailExtra: () => ({ state: { status: 'idle' }, retry: () => undefined }),
};

export function stubClientSize(width = 800, height = 600): void {
  beforeAll(() => {
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(width);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(height);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });
}
