import {
  errorFromResponse,
  makeError,
  summarize,
  type CommitDetailExtra,
} from './commitDetailTypes';
import { parseUnifiedDiff } from './commitDiffParser';

const MAX_DIFF_BYTES = 4 * 1024 * 1024;

// The JSON variant (Accept: application/json) is not used: it is internal to GitHub's frontend
// and its shape changes often.
export async function fetchCommitDetailViaWeb(
  owner: string,
  repo: string,
  sha: string,
): Promise<CommitDetailExtra> {
  const url = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/commit/${encodeURIComponent(sha)}.diff`;

  let response: Response;
  try {
    response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  } catch {
    throw makeError('network');
  }

  if (response.redirected && new URL(response.url).pathname.startsWith('/login')) {
    throw makeError('auth', response.status);
  }
  const failure = errorFromResponse(response);
  if (failure) throw failure;
  if (!response.headers.get('content-type')?.startsWith('text/plain')) throw makeError('shape');

  let body: { text: string; clipped: boolean };
  try {
    body = await readTextUpTo(response, MAX_DIFF_BYTES);
  } catch {
    throw makeError('network');
  }
  return summarize(parseUnifiedDiff(body.text), body.clipped);
}

async function readTextUpTo(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; clipped: boolean }> {
  if (!response.body) return { text: await response.text(), clipped: false };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return { text: text + decoder.decode(), clipped: false };
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      await reader.cancel();
      return { text, clipped: true };
    }
  }
}
