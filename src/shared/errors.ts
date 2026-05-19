// 小さな型ガード / coercion ヘルパ群。
// "本物の Error 以外を吸収しない" 方針で predictable に。
// errorMessage は Error instance のみアンラップし、それ以外は fallback を返す。

export function isObject(value: unknown): value is Record<string, unknown> {
  // 注意: Array や Date も typeof 'object' && !== null を満たすため、
  // この narrow では Record として扱える。呼び出し側が必要なら追加判定すること。
  return typeof value === 'object' && value !== null;
}

export function asString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' ? value : fallback;
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}
