import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aptabase/web', () => ({
  init: vi.fn(),
  trackEvent: vi.fn(() => Promise.resolve()),
}));

import { init, trackEvent as aptabaseTrackEvent } from '@aptabase/web';
import { localStore } from './storage';
import {
  __resetTelemetryForTest,
  declineTelemetry,
  initTelemetry,
  isTelemetryConfigured,
  markTelemetryPromptSeen,
  setTelemetryEnabled,
  trackEvent,
} from './telemetry';

const initMock = vi.mocked(init);
const trackMock = vi.mocked(aptabaseTrackEvent);

const APP_KEY = 'A-US-0000000000';

afterEach(() => {
  __resetTelemetryForTest();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('no-op invariants', () => {
  it('never initializes or tracks when the app key is unset', async () => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', '');
    await initTelemetry();
    trackEvent('graph_open', { source: 'manual' });
    expect(isTelemetryConfigured()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('initializes but never tracks while disabled', async () => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', APP_KEY);
    await localStore.set('telemetry', { enabled: false, promptSeen: true });
    await initTelemetry();
    trackEvent('graph_open');
    expect(initMock).toHaveBeenCalledTimes(1);
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe('when configured and enabled', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APTABASE_APP_KEY', APP_KEY);
  });

  it('tracks events with their props (enabled by default)', async () => {
    await initTelemetry();
    trackEvent('graph_open', { source: 'manual' });
    expect(trackMock).toHaveBeenCalledWith('graph_open', { source: 'manual' });
  });

  it('stops tracking after setTelemetryEnabled(false)', async () => {
    await initTelemetry();
    await setTelemetryEnabled({ enabled: true, promptSeen: true }, false);
    trackEvent('graph_open');
    expect(trackMock).not.toHaveBeenCalled();
    expect((await localStore.get('telemetry')).enabled).toBe(false);
  });

  it('reacts to enabled changes from another context via storage.onChanged', async () => {
    await initTelemetry();
    await chrome.storage.local.set({ telemetry: { enabled: false, promptSeen: true } });
    trackEvent('graph_open');
    expect(trackMock).not.toHaveBeenCalled();
  });

  it('records that the consent prompt has been seen', async () => {
    await markTelemetryPromptSeen({ enabled: true, promptSeen: false });
    expect((await localStore.get('telemetry')).promptSeen).toBe(true);
  });

  it('declineTelemetry disables tracking and marks the prompt seen at once', async () => {
    await initTelemetry();
    await declineTelemetry({ enabled: true, promptSeen: false });
    trackEvent('graph_open');
    expect(trackMock).not.toHaveBeenCalled();
    expect(await localStore.get('telemetry')).toEqual({ enabled: false, promptSeen: true });
  });
});
