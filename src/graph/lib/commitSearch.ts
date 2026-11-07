import type { ViewCommit } from './transform.types';

// SHA prefix matching from 1-3 characters is avoided: a short hex word matches most commits and narrows nothing.
const SHA_PREFIX_MIN_LENGTH = 4;

type CommitSearchResult = {
  rows: readonly number[];
  shas: ReadonlySet<string>;
};

export const NO_MATCHES: CommitSearchResult = { rows: [], shas: new Set() };

function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function matchesCommit(commit: ViewCommit, query: string): boolean {
  if (query.length >= SHA_PREFIX_MIN_LENGTH && commit.sha.startsWith(query)) return true;
  if (commit.subject.toLowerCase().includes(query)) return true;
  if (commit.authorName.toLowerCase().includes(query)) return true;
  if (commit.authorLogin.toLowerCase().includes(query)) return true;
  return commit.refs.some(
    (ref) =>
      ref.name.toLowerCase().includes(query) ||
      `${ref.ownerName}:${ref.name}`.toLowerCase().includes(query),
  );
}

export function searchCommits(
  commits: readonly ViewCommit[],
  rawQuery: string,
): CommitSearchResult {
  const query = normalizeQuery(rawQuery);
  if (query === '') return NO_MATCHES;
  const rows: number[] = [];
  const shas = new Set<string>();
  commits.forEach((commit, row) => {
    if (!matchesCommit(commit, query)) return;
    rows.push(row);
    shas.add(commit.sha);
  });
  return { rows, shas };
}

export function stepMatchRow(
  rows: readonly number[],
  fromRow: number | null,
  direction: 1 | -1,
): number | null {
  if (rows.length === 0) return null;
  if (fromRow === null) return direction === 1 ? rows[0] : rows[rows.length - 1];
  if (direction === 1) return rows.find((row) => row > fromRow) ?? rows[0];
  return rows.findLast((row) => row < fromRow) ?? rows[rows.length - 1];
}

type TextSegment = { text: string; match: boolean; start: number };

export function highlightSegments(text: string, rawQuery: string): TextSegment[] {
  const query = normalizeQuery(rawQuery);
  const lower = text.toLowerCase();
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (let at = query ? lower.indexOf(query) : -1; at !== -1; at = lower.indexOf(query, cursor)) {
    if (at > cursor) segments.push({ text: text.slice(cursor, at), match: false, start: cursor });
    segments.push({ text: text.slice(at, at + query.length), match: true, start: at });
    cursor = at + query.length;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ text: text.slice(cursor), match: false, start: cursor });
  }
  return segments;
}
