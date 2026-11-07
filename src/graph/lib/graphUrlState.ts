import { type GraphMode, isGraphMode } from '@/shared/storage';

const FULL_SHA = /^[0-9a-f]{40}$/;

export type GraphUrlState = {
  sha: string | null;
  mode: GraphMode | null;
};

type GraphUrlTarget = {
  owner: string;
  repo: string;
  sha: string | null;
  mode: GraphMode;
};

export function parseGraphUrlState(search: string): GraphUrlState {
  const params = new URLSearchParams(search);
  const sha = params.get('sha')?.trim().toLowerCase() ?? '';
  const mode = params.get('mode');
  return {
    sha: FULL_SHA.test(sha) ? sha : null,
    mode: isGraphMode(mode) ? mode : null,
  };
}

export function buildGraphUrl(href: string, { owner, repo, sha, mode }: GraphUrlTarget): string {
  const url = new URL(href);
  const hasRepo = owner !== '' && repo !== '';
  setOrDelete(url.searchParams, 'owner', owner);
  setOrDelete(url.searchParams, 'repo', repo);
  setOrDelete(url.searchParams, 'sha', hasRepo ? sha : null);
  setOrDelete(url.searchParams, 'mode', hasRepo ? mode : null);
  return url.toString();
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null): void {
  if (value) params.set(key, value);
  else params.delete(key);
}
