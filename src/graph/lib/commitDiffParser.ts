import type { CommitDetailFile } from './commitDetailTypes';

const DIFF_HEADER = 'diff --git ';
const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/;
const SIMPLE_ESCAPES: Record<string, number[]> = {
  a: [7],
  b: [8],
  t: [9],
  n: [10],
  v: [11],
  f: [12],
  r: [13],
  '"': [34],
  '\\': [92],
};

type DraftFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  previousFilename?: string;
};

export function parseUnifiedDiff(diff: string): CommitDetailFile[] {
  const files: CommitDetailFile[] = [];
  let draft: DraftFile | null = null;
  let oldLeft = 0;
  let newLeft = 0;

  const flush = () => {
    if (!draft) return;
    files.push({ ...draft, changes: draft.additions + draft.deletions });
    draft = null;
  };

  for (const line of diff.split('\n')) {
    if (draft && (oldLeft > 0 || newLeft > 0)) {
      const marker = line[0];
      if (marker === '+') {
        draft.additions += 1;
        newLeft -= 1;
      } else if (marker === '-') {
        draft.deletions += 1;
        oldLeft -= 1;
      } else if (marker !== '\\') {
        oldLeft -= 1;
        newLeft -= 1;
      }
      continue;
    }

    if (line.startsWith(DIFF_HEADER)) {
      flush();
      draft = {
        filename: pathFromHeader(line.slice(DIFF_HEADER.length)),
        status: 'modified',
        additions: 0,
        deletions: 0,
      };
      continue;
    }
    if (!draft) continue;

    const hunk = HUNK_HEADER.exec(line);
    if (hunk) {
      oldLeft = Number(hunk[1] ?? 1);
      newLeft = Number(hunk[2] ?? 1);
    } else if (line.startsWith('new file mode')) {
      draft.status = 'added';
    } else if (line.startsWith('deleted file mode')) {
      draft.status = 'removed';
    } else if (line.startsWith('rename from ') || line.startsWith('copy from ')) {
      draft.previousFilename = unquote(line.slice(line.indexOf('from ') + 5));
    } else if (line.startsWith('rename to ') || line.startsWith('copy to ')) {
      draft.status = line.startsWith('rename') ? 'renamed' : 'copied';
      draft.filename = unquote(line.slice(line.indexOf('to ') + 3));
    }
  }
  flush();
  return files;
}

// Searching for ` b/` with a greedy regex is avoided: a path that itself contains ` b/` would be split wrongly.
function pathFromHeader(rest: string): string {
  if (rest.startsWith('"')) {
    const bSide = rest.slice(quotedEnd(rest) + 1);
    return stripPrefix(bSide.startsWith('"') ? unquote(bSide) : bSide);
  }
  const pathLength = (rest.length - 5) / 2;
  if (Number.isInteger(pathLength) && rest.slice(pathLength + 2, pathLength + 5) === ' b/') {
    return rest.slice(pathLength + 5);
  }
  return stripPrefix(rest.slice(rest.lastIndexOf(' b/') + 1));
}

function stripPrefix(path: string): string {
  return path.slice(2);
}

function quotedEnd(text: string): number {
  for (let i = 1; i < text.length; i += 1) {
    if (text[i] === '\\') i += 1;
    else if (text[i] === '"') return i + 1;
  }
  return text.length;
}

function unquote(value: string): string {
  if (!value.startsWith('"')) return value;
  const inner = value.slice(1, quotedEnd(value) - 1);
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  for (const [token, escaped] of inner.matchAll(/\\([0-7]{3}|.)|[^\\]/gsu)) {
    if (escaped === undefined) bytes.push(...encoder.encode(token));
    else if (escaped.length === 3) bytes.push(parseInt(escaped, 8));
    else bytes.push(...(SIMPLE_ESCAPES[escaped] ?? encoder.encode(escaped)));
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}
