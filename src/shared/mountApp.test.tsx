import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { mountApp } from './mountApp';
import { useLocalValue } from './useLocalValue';

function ModeProbe() {
  return <p>mode:{useLocalValue('graphPrefs').mode}</p>;
}

describe('mountApp', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.lang = '';
  });

  it('renders with the saved preferences on the very first paint', async () => {
    await chrome.storage.local.set({ graphPrefs: { mode: 'repo-only', theme: 'light' } });

    await mountApp(<ModeProbe />);

    expect(await screen.findByText('mode:repo-only')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('theme-light');
  });

  it('paints dark on the first frame when no preferences were saved', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));

    await mountApp(<ModeProbe />);

    expect(document.documentElement).toHaveClass('theme-dark');
  });

  it('sets the document language from the UI language', async () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('ja');

    await mountApp(<ModeProbe />);

    await waitFor(() => expect(document.documentElement.lang).toBe('ja'));
  });

  it('still renders with defaults when storage cannot be read', async () => {
    let prefsReadFailed = false;
    const get = vi.fn<(keys: Record<string, unknown>) => Promise<Record<string, unknown>>>(
      (keys) => {
        if ('graphPrefs' in keys && !prefsReadFailed) {
          prefsReadFailed = true;
          return Promise.reject(new Error('unavailable'));
        }
        return Promise.resolve({ ...keys });
      },
    );
    vi.stubGlobal('chrome', {
      ...chrome,
      storage: { ...chrome.storage, local: { ...chrome.storage.local, get } },
    });

    await mountApp(<ModeProbe />);

    expect(await screen.findByText('mode:network')).toBeInTheDocument();
  });
});
