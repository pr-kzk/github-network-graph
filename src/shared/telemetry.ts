import { init, trackEvent as aptabaseTrackEvent } from '@aptabase/web';
import { type TelemetryPrefs, localStore } from './storage';

type EventProps = Record<string, string | number | boolean>;

function appKey(): string | undefined {
  return import.meta.env.VITE_APTABASE_APP_KEY as string | undefined;
}

let enabled = false;
let initialized = false;

export function isTelemetryConfigured(): boolean {
  const key = appKey();
  return typeof key === 'string' && key.length > 0;
}

export async function initTelemetry(): Promise<void> {
  const key = appKey();
  if (!key) return;
  const prefs = await localStore.get('telemetry');
  enabled = prefs.enabled === true;
  if (initialized) return;
  initialized = true;
  init(key, { isDebug: import.meta.env.DEV });
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes.telemetry;
    if (!change) return;
    const next = change.newValue as Partial<TelemetryPrefs> | undefined;
    enabled = next?.enabled === true;
  });
}

export function trackEvent(name: string, props?: EventProps): void {
  if (!enabled || !isTelemetryConfigured()) return;
  void aptabaseTrackEvent(name, props).catch(() => {});
}

export function setTelemetryEnabled(prefs: TelemetryPrefs, value: boolean): Promise<void> {
  enabled = value === true;
  return localStore.set('telemetry', { ...prefs, enabled: value });
}

export function markTelemetryPromptSeen(prefs: TelemetryPrefs): Promise<void> {
  return localStore.set('telemetry', { ...prefs, promptSeen: true });
}

export function declineTelemetry(prefs: TelemetryPrefs): Promise<void> {
  enabled = false;
  return localStore.set('telemetry', { ...prefs, enabled: false, promptSeen: true });
}

// テスト環境でモジュール状態を初期化する。プロダクションコードからは呼ばないこと。
export function __resetTelemetryForTest(): void {
  enabled = false;
  initialized = false;
}
