import { init, trackEvent as aptabaseTrackEvent } from '@aptabase/web';
import { localStore, parseLocalValue, type GraphMode } from './storage';

export type GraphOpenSource = 'detected' | 'manual' | 'recent';

type TelemetryEvents = {
  graph_open: { source: GraphOpenSource };
  graph_refresh: undefined;
  graph_error: { phase: 'init' | 'older'; kind: string };
  commit_select: undefined;
  commit_detail_error: { kind: string };
  repo_switch: undefined;
  link_copy: undefined;
  shortcuts_open: undefined;
  search_used: undefined;
  mode_change: { mode: GraphMode };
};

type EventArgs<E extends keyof TelemetryEvents> = TelemetryEvents[E] extends undefined
  ? []
  : [props: TelemetryEvents[E]];

function appKey(): string | undefined {
  return import.meta.env.VITE_APTABASE_APP_KEY;
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
  enabled = prefs.enabled;
  if (initialized) return;
  initialized = true;
  init(key, { isDebug: import.meta.env.DEV });
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes.telemetry;
    if (!change) return;
    enabled = parseLocalValue('telemetry', change.newValue).enabled;
  });
}

export function trackEvent<E extends keyof TelemetryEvents>(name: E, ...args: EventArgs<E>): void {
  if (!enabled || !isTelemetryConfigured()) return;
  void aptabaseTrackEvent(name, args[0]).catch(() => {});
}

export function setTelemetryEnabled(value: boolean): Promise<void> {
  enabled = value;
  return localStore.update('telemetry', { enabled: value });
}

export function markTelemetryPromptSeen(): Promise<void> {
  return localStore.update('telemetry', { promptSeen: true });
}

export function declineTelemetry(): Promise<void> {
  enabled = false;
  return localStore.update('telemetry', { enabled: false, promptSeen: true });
}

export function resetTelemetryForTest(): void {
  enabled = false;
  initialized = false;
}
