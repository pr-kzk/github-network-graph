import type { ViewCommit } from './transform.types';

export type NavigationContext = {
  commits: readonly ViewCommit[];
  selectedSha: string | null;
  childrenBySha: ReadonlyMap<string, readonly string[]>;
  commitBySha: ReadonlyMap<string, ViewCommit>;
};

function neighbour(ctx: NavigationContext, delta: 1 | -1): string | null {
  const current = ctx.selectedSha ? ctx.commitBySha.get(ctx.selectedSha) : undefined;
  if (!current) return ctx.commits[0]?.sha ?? null;
  return ctx.commits[current.row + delta]?.sha ?? null;
}

export function navigationTarget(key: string, ctx: NavigationContext): string | null {
  switch (key) {
    case 'j':
    case 'ArrowDown':
      return neighbour(ctx, 1);
    case 'k':
    case 'ArrowUp':
      return neighbour(ctx, -1);
    case 'g':
    case 'Home':
      return ctx.commits[0]?.sha ?? null;
    case 'G':
    case 'End':
      return ctx.commits[ctx.commits.length - 1]?.sha ?? null;
    case '[':
      return (ctx.selectedSha && ctx.commitBySha.get(ctx.selectedSha)?.parents[0]) || null;
    case ']':
      return (ctx.selectedSha && ctx.childrenBySha.get(ctx.selectedSha)?.[0]) || null;
    default:
      return null;
  }
}

export const NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  'j',
  'k',
  'g',
  'G',
  '[',
  ']',
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
]);
