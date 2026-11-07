import { describe, expect, it } from 'vitest';
import { describeJumpTarget } from './jumpTarget';

const view = {
  branches: [{ name: 'release/1.x', sha: 'aaaaaaaaaaaa' }],
  forkBranches: [{ owner: 'alice', branches: [{ name: 'wip', sha: 'bbbbbbbbbbbb' }] }],
};

describe('describeJumpTarget', () => {
  it('names a branch of the repository', () => {
    expect(describeJumpTarget(view, 'aaaaaaaaaaaa')).toBe('release/1.x');
  });

  it('names a fork branch with its owner', () => {
    expect(describeJumpTarget(view, 'bbbbbbbbbbbb')).toBe('alice:wip');
  });

  it('falls back to the short commit hash', () => {
    expect(describeJumpTarget(view, '0123456789abcdef')).toBe('0123456');
  });
});
