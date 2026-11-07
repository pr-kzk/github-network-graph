import { describe, expect, it } from 'vitest';
import { answerFocusRequests, focusExistingGraphTab } from './graphTabFocus';
import { openGraphTab } from './openGraphTab';

describe('focusExistingGraphTab', () => {
  it('reports no tab when no graph page is listening', async () => {
    expect(await focusExistingGraphTab('numpy', 'numpy')).toBe(false);
  });

  it('brings the graph tab showing the same repository to the front', async () => {
    answerFocusRequests(() => ({ owner: 'numpy', repo: 'numpy' }));

    expect(await focusExistingGraphTab('NumPy', 'numpy')).toBe(true);
    expect(chrome.tabs.update).toHaveBeenCalledWith(1, { active: true });
    expect(chrome.windows.update).toHaveBeenCalledWith(1, { focused: true });
  });

  it('ignores graph tabs showing a different repository', async () => {
    answerFocusRequests(() => ({ owner: 'facebook', repo: 'react' }));

    expect(await focusExistingGraphTab('numpy', 'numpy')).toBe(false);
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('answers with the repository the tab shows at request time', async () => {
    let shown = { owner: 'facebook', repo: 'react' };
    answerFocusRequests(() => shown);
    shown = { owner: 'numpy', repo: 'numpy' };

    expect(await focusExistingGraphTab('numpy', 'numpy')).toBe(true);
  });

  it('stops answering once the listener is removed', async () => {
    const stop = answerFocusRequests(() => ({ owner: 'numpy', repo: 'numpy' }));
    stop();

    expect(await focusExistingGraphTab('numpy', 'numpy')).toBe(false);
  });
});

describe('openGraphTab', () => {
  it('creates a tab when the repository is not open yet', async () => {
    await openGraphTab('numpy', 'numpy', 'manual');

    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringContaining('owner=numpy&repo=numpy'),
    });
  });

  it('reuses the open tab instead of creating another', async () => {
    answerFocusRequests(() => ({ owner: 'numpy', repo: 'numpy' }));

    await openGraphTab('numpy', 'numpy', 'recent');

    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });
});
