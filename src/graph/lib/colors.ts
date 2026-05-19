// VSCode Git Graph 風のレーン色。レーン index 0..N に対して決定的に HSL を返す。
const HUE_STEP = 47;
const BASE_HUE = 210;

export function laneColor(lane: number): string {
  const hue = (BASE_HUE + lane * HUE_STEP) % 360;
  return `hsl(${hue} 70% 55%)`;
}

export function laneColorMuted(lane: number): string {
  const hue = (BASE_HUE + lane * HUE_STEP) % 360;
  return `hsl(${hue} 35% 45%)`;
}
