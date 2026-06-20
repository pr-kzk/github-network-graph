import { recordRecentRepo } from './storage';
import { trackEvent } from './telemetry';

export type GraphOpenSource = 'detected' | 'manual' | 'recent';

// owner / repo を受け取り、グラフタブを開く共通エントリポイント。
// recordRecentRepo は fire-and-forget。
// 返り値は chrome.tabs.create の Promise を素通しする (popup 側は await 不要だが
// テストや別タブ起動後の処理から参照したいケースのために残す)。
export function openGraphTab(
  owner: string,
  repo: string,
  source: GraphOpenSource,
): Promise<chrome.tabs.Tab> {
  void recordRecentRepo(owner, repo);
  trackEvent('graph_open', { source });
  const url = chrome.runtime.getURL(
    `src/graph/index.html?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
  );
  return chrome.tabs.create({ url });
}
