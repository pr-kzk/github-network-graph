// 相対時間と絶対日時の整形ヘルパ。
//   - 'short': CommitRow など、グラフセルで使うコンパクト表記 ('now', '5m', '3h', ...)
//   - 'long' : RecentRepos など、自然言語表記 (ロケール依存)。chrome.i18n 経由で
//             en では "5 min ago"、ja では "5 分前" を返す。

import { t, tWith } from './i18n';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

export type RelativeStyle = 'short' | 'long';

export type RelativeOptions = {
  now?: number;
  style?: RelativeStyle;
};

export function formatRelativeFromMs(ms: number, opts: RelativeOptions = {}): string {
  const now = opts.now ?? Date.now();
  const style = opts.style ?? 'short';
  const diff = Math.max(0, now - ms);
  if (style === 'short') {
    if (diff < ONE_MINUTE) return 'now';
    if (diff < ONE_HOUR) return `${Math.floor(diff / ONE_MINUTE)}m`;
    if (diff < ONE_DAY) return `${Math.floor(diff / ONE_HOUR)}h`;
    if (diff < ONE_MONTH) return `${Math.floor(diff / ONE_DAY)}d`;
    if (diff < ONE_YEAR) return `${Math.floor(diff / ONE_MONTH)}mo`;
    return `${Math.floor(diff / ONE_YEAR)}y`;
  }
  // style === 'long'
  // 既存 RecentRepos.tsx の境界を完全踏襲: 月境界は持たず、4 週間以上は toLocaleDateString
  // に fallback。文言は chrome.i18n の relative_* キーで提供される。
  const min = Math.floor(diff / ONE_MINUTE);
  if (min < 1) return t('relative_now');
  if (min < 60) return tWith('relative_minutes', { n: String(min) });
  const hour = Math.floor(min / 60);
  if (hour < 24) return tWith('relative_hours', { n: String(hour) });
  const day = Math.floor(hour / 24);
  if (day < 7) return tWith('relative_days', { n: String(day) });
  const week = Math.floor(day / 7);
  if (week < 4) return tWith('relative_weeks', { n: String(week) });
  return new Date(ms).toLocaleDateString();
}

export function formatRelativeFromDateString(
  value: string | undefined | null,
  opts: RelativeOptions = {},
): string {
  if (!value) return '';
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    // CommitRow の既存挙動: parse 失敗時は ISO 文字列の先頭 7 文字を返す
    // (e.g. "2024-01" のような大雑把なヒント)。
    return value.slice(0, 7);
  }
  return formatRelativeFromMs(ms, opts);
}

export function formatFullDate(value: string | undefined | null): string {
  if (!value) return '';
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toLocaleString();
}
