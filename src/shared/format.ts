import { t, tWith } from './i18n';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

type RelativeStyle = 'short' | 'long';

type RelativeOptions = {
  now?: number;
  style?: RelativeStyle;
};

export function formatRelativeFromMs(ms: number, opts: RelativeOptions = {}): string {
  const now = opts.now ?? Date.now();
  const style = opts.style ?? 'short';
  const diff = Math.max(0, now - ms);
  if (style === 'short') {
    if (diff < ONE_MINUTE) return t('relative_now_short');
    if (diff < ONE_HOUR) return `${Math.floor(diff / ONE_MINUTE)}m`;
    if (diff < ONE_DAY) return `${Math.floor(diff / ONE_HOUR)}h`;
    if (diff < ONE_MONTH) return `${Math.floor(diff / ONE_DAY)}d`;
    if (diff < ONE_YEAR) return `${Math.floor(diff / ONE_MONTH)}mo`;
    return `${Math.floor(diff / ONE_YEAR)}y`;
  }
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
    return value.slice(0, 7);
  }
  return formatRelativeFromMs(ms, opts);
}

export function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatFullDate(value: string | undefined | null): string {
  if (!value) return '';
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toLocaleString();
}
