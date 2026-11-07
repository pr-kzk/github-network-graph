import type { RepoRef } from '@/graph/lib/parseUrl';
import { isObject } from './errors';
import { isSameRepo } from './storage';

const FOCUS_GRAPH_TAB = 'focus-graph-tab';

type FocusGraphTabMessage = RepoRef & { type: typeof FOCUS_GRAPH_TAB };

function isFocusGraphTabMessage(message: unknown): message is FocusGraphTabMessage {
  return (
    isObject(message) &&
    message.type === FOCUS_GRAPH_TAB &&
    typeof message.owner === 'string' &&
    typeof message.repo === 'string'
  );
}

// tabs.query with a url filter would find the tab directly, but matching extension URLs there
// is gated by the "tabs" permission, which adds a browsing-history warning at install time.
export async function focusExistingGraphTab(owner: string, repo: string): Promise<boolean> {
  const message: FocusGraphTabMessage = { type: FOCUS_GRAPH_TAB, owner, repo };
  try {
    return (await chrome.runtime.sendMessage(message)) === true;
  } catch {
    return false;
  }
}

async function bringOwnTabToFront(): Promise<void> {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { active: true });
  if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
}

export function answerFocusRequests(current: () => RepoRef): () => void {
  const listener = (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: boolean) => void,
  ): boolean => {
    if (sender.id !== chrome.runtime.id) return false;
    if (!isFocusGraphTabMessage(message) || !isSameRepo(message, current())) return false;
    bringOwnTabToFront().then(
      () => sendResponse(true),
      () => sendResponse(false),
    );
    return true;
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}
