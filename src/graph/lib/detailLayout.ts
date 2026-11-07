import { DETAIL_WIDTH_MIN } from '@/shared/storage';

const AUTO_WIDTH_SHARE = 0.3;
const AUTO_WIDTH_MAX = 480;
export const NARROW_WINDOW_BELOW = 1000;

export function autoDetailWidth(windowWidth: number): number {
  return Math.min(
    AUTO_WIDTH_MAX,
    Math.max(DETAIL_WIDTH_MIN, Math.round(windowWidth * AUTO_WIDTH_SHARE)),
  );
}

export function autoDetailCollapsed(windowWidth: number): boolean {
  return windowWidth < NARROW_WINDOW_BELOW;
}
