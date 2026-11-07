import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from './commitDiffParser';

describe('parseUnifiedDiff', () => {
  it('counts added and removed lines per modified file', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 111..222 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1,3 +1,4 @@',
      ' keep',
      '-old',
      '+new',
      '+extra',
      ' tail',
      '',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual([
      { filename: 'src/a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
    ]);
  });

  it('does not mistake content lines that look like file headers for changes', () => {
    const diff = [
      'diff --git a/n.md b/n.md',
      '--- a/n.md',
      '+++ b/n.md',
      '@@ -1 +1 @@',
      '--- not a header',
      '+++ not a header either',
    ].join('\n');
    expect(parseUnifiedDiff(diff)[0]).toMatchObject({
      filename: 'n.md',
      additions: 1,
      deletions: 1,
    });
  });

  it('reports added, removed and renamed files with their previous names', () => {
    const diff = [
      'diff --git a/new.txt b/new.txt',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1 @@',
      '+hello',
      'diff --git a/gone.txt b/gone.txt',
      'deleted file mode 100644',
      '--- a/gone.txt',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-bye',
      'diff --git a/before.txt b/after.txt',
      'similarity index 100%',
      'rename from before.txt',
      'rename to after.txt',
    ].join('\n');
    expect(parseUnifiedDiff(diff).map((f) => [f.filename, f.status, f.previousFilename])).toEqual([
      ['new.txt', 'added', undefined],
      ['gone.txt', 'removed', undefined],
      ['after.txt', 'renamed', 'before.txt'],
    ]);
  });

  it('lists binary files without line counts', () => {
    const diff = [
      'diff --git a/img.png b/img.png',
      'index 1..2 100644',
      'Binary files a/img.png and b/img.png differ',
    ].join('\n');
    expect(parseUnifiedDiff(diff)).toEqual([
      { filename: 'img.png', status: 'modified', additions: 0, deletions: 0, changes: 0 },
    ]);
  });

  it('keeps file names that contain spaces', () => {
    const diff = 'diff --git a/my notes/a b.txt b/my notes/a b.txt\nindex 1..2 100644';
    expect(parseUnifiedDiff(diff)[0]?.filename).toBe('my notes/a b.txt');
  });

  it('decodes git-quoted non-ASCII file names', () => {
    const diff = 'diff --git "a/caf\\303\\251.txt" "b/caf\\303\\251.txt"\nindex 1..2 100644';
    expect(parseUnifiedDiff(diff)[0]?.filename).toBe('café.txt');
  });

  it('returns no files for an empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });
});
