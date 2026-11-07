const SHORT_SHA_LENGTH = 7;

export function shortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}
