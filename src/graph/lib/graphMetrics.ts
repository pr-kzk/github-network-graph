import { chooseVisibleLanes } from './laneBudget';

export const ROW_HEIGHT = 26;
export const NODE_RADIUS = 4;
const MAX_LANE_STEP = 14;
const MIN_LANE_STEP = 7;
const LEFT_PADDING = 14;
const RIGHT_PADDING = 12;
const MIN_GRAPH_WIDTH = 36;
const MAX_GRAPH_WIDTH = 360;
const LIST_WIDTH_SHARE = 0.3;

export type GraphLayout = {
  width: number;
  laneX: (lane: number) => number;
  isFolded: (lane: number) => boolean;
  isPriority: (lane: number) => boolean;
  foldedCount: number;
  gutterX: number;
  crowded: boolean;
};

export function rowY(row: number): number {
  return row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// Reusing a lane once its line ends would keep the column narrower, but which lane is free
// depends on rows that older pages have not loaded yet, so loading more would shift rows sideways.
// Squeezing every lane below the readable spacing was dropped too: past that point lanes land on
// the same x and the picture turns into a bundle, so the surplus goes into one explicit gutter.
export function createGraphLayout(
  laneCount: number,
  listWidth: number,
  priorityLanes: readonly number[] = [],
): GraphLayout {
  const maxWidth =
    listWidth > 0
      ? Math.min(MAX_GRAPH_WIDTH, Math.max(MIN_GRAPH_WIDTH, listWidth * LIST_WIDTH_SHARE))
      : MAX_GRAPH_WIDTH;
  const maxTrack = maxWidth - LEFT_PADDING - RIGHT_PADDING;
  const slotLimit = Math.floor(maxTrack / MIN_LANE_STEP) + 1;
  const prioritySet = new Set(priorityLanes);
  const isPriority = (lane: number) => prioritySet.has(lane);

  if (laneCount > slotLimit) {
    const slots = slotLimit - 1;
    const visible = chooseVisibleLanes(laneCount, slots, priorityLanes);
    const slotOfLane = new Map(visible.map((lane, slot) => [lane, slot]));
    const step = maxTrack / slots;
    const gutterX = LEFT_PADDING + slots * step;
    return {
      width: maxWidth,
      laneX: (lane) => {
        const slot = slotOfLane.get(lane);
        return slot === undefined ? gutterX : LEFT_PADDING + slot * step;
      },
      isFolded: (lane) => !slotOfLane.has(lane),
      isPriority,
      foldedCount: laneCount - visible.length,
      gutterX,
      crowded: true,
    };
  }

  const gaps = Math.max(0, laneCount - 1);
  const naturalWidth = LEFT_PADDING + gaps * MAX_LANE_STEP + RIGHT_PADDING;
  const width = Math.max(MIN_GRAPH_WIDTH, Math.min(naturalWidth, maxWidth));
  const step =
    gaps === 0
      ? MAX_LANE_STEP
      : Math.min(
          MAX_LANE_STEP,
          Math.max(MIN_LANE_STEP, (width - LEFT_PADDING - RIGHT_PADDING) / gaps),
        );
  return {
    width,
    laneX: (lane) => LEFT_PADDING + lane * step,
    isFolded: () => false,
    isPriority,
    foldedCount: 0,
    gutterX: width - RIGHT_PADDING,
    crowded: false,
  };
}
