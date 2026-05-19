import type { GraphView } from './transform.types';

export const ROW_HEIGHT = 26;
export const LANE_WIDTH = 14;
export const NODE_RADIUS = 4;
export const LEFT_PADDING = 14;
export const RIGHT_PADDING = 12;
export const MIN_GRAPH_WIDTH = 36;

export function laneX(lane: number): number {
  return LEFT_PADDING + lane * LANE_WIDTH;
}

export function rowY(row: number): number {
  return row * ROW_HEIGHT + ROW_HEIGHT / 2;
}

export function graphWidth(view: GraphView): number {
  const lanesPx = Math.max(0, view.laneCount - 1) * LANE_WIDTH;
  return Math.max(MIN_GRAPH_WIDTH, LEFT_PADDING + lanesPx + RIGHT_PADDING);
}
