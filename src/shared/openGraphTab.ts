import { focusExistingGraphTab } from './graphTabFocus';
import { recordRecentRepo } from './storage';
import { trackEvent } from './telemetry';

type GraphOpenSource = 'detected' | 'manual' | 'recent';

export async function openGraphTab(
  owner: string,
  repo: string,
  source: GraphOpenSource,
): Promise<void> {
  void recordRecentRepo(owner, repo);
  trackEvent('graph_open', { source });
  if (await focusExistingGraphTab(owner, repo)) return;
  const url = chrome.runtime.getURL(
    `src/graph/index.html?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
  );
  await chrome.tabs.create({ url });
}
