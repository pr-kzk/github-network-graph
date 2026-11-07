const HUE_STEP = 47;
const BASE_HUE = 210;

export function laneColor(lane: number): string {
  const hue = (BASE_HUE + lane * HUE_STEP) % 360;
  return `hsl(${hue} 70% 55%)`;
}
