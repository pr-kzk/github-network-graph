export type RepoRef = { owner: string; repo: string };

const RESERVED_OWNERS = new Set([
  'orgs',
  'organizations',
  'settings',
  'marketplace',
  'pricing',
  'about',
  'features',
  'topics',
  'collections',
  'trending',
  'enterprise',
  'sponsors',
  'login',
  'logout',
  'join',
  'new',
  'notifications',
  'issues',
  'pulls',
  'codespaces',
  'discussions',
  'explore',
  'search',
]);

function sanitizeSegment(value: string): string {
  return value.replace(/\.git$/i, '').trim();
}

export function parseRepoFromUrl(input: string | null | undefined): RepoRef | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') return null;

  const segments = url.pathname.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) return null;

  const owner = sanitizeSegment(segments[0] ?? '');
  const repo = sanitizeSegment(segments[1] ?? '');
  if (!owner || !repo) return null;
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;

  return { owner, repo };
}

export function parseRepoFromInput(input: string): RepoRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const viaUrl = parseRepoFromUrl(trimmed);
  if (viaUrl) return viaUrl;

  const match = /^([\w.-]+)\s*\/\s*([\w.-]+)$/.exec(trimmed);
  if (!match) return null;
  const owner = sanitizeSegment(match[1]!);
  const repo = sanitizeSegment(match[2]!);
  if (!owner || !repo) return null;
  if (RESERVED_OWNERS.has(owner.toLowerCase())) return null;
  return { owner, repo };
}
