import type { ViewCommit } from './transform.types';

export type ContainingRef = {
  name: string;
  ownerName: string;
  isFocus: boolean;
  sha: string;
};

export function findContainingRefs(
  startSha: string,
  commitBySha: ReadonlyMap<string, ViewCommit>,
  childrenBySha: ReadonlyMap<string, string[]>,
): ContainingRef[] {
  const seen = new Set<string>();
  const stack = [startSha];
  const found: ContainingRef[] = [];
  while (stack.length > 0) {
    const sha = stack.pop()!;
    if (seen.has(sha)) continue;
    seen.add(sha);
    for (const ref of commitBySha.get(sha)?.refs ?? []) {
      found.push({ name: ref.name, ownerName: ref.ownerName, isFocus: ref.isFocus, sha });
    }
    for (const child of childrenBySha.get(sha) ?? []) stack.push(child);
  }
  return found.sort(
    (a, b) =>
      Number(b.isFocus) - Number(a.isFocus) ||
      a.ownerName.localeCompare(b.ownerName) ||
      a.name.localeCompare(b.name),
  );
}
