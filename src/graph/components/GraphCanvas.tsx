import { laneColor } from '../lib/colors';
import { NODE_RADIUS, ROW_HEIGHT, laneX, rowY } from '../lib/graphMetrics';
import type { GraphView } from '../lib/transform.types';

const STROKE_WIDTH = 2;
// ノードのヒット領域。視覚円より少し大きめにしてホバー/クリックを取りやすくする。
const HIT_RADIUS_PAD = 4;

export type GraphCanvasProps = {
  view: GraphView;
  selectedSha: string | null;
  width: number;
  // 描画範囲 (row index)。[rangeStart, rangeEnd) を覆う commit/edge のみ描画する。
  // 仮想化リストと組み合わせて使用する想定で、未指定なら全範囲。
  rangeStart?: number;
  rangeEnd?: number;
  // rangeStart/End の上下に追加で描画するマージン行数 (overscan)。デフォルト 20。
  rangeOverscan?: number;
  onSelectCommit?: (sha: string) => void;
  onHoverCommit?: (sha: string, clientX: number, clientY: number) => void;
  onLeaveCommit?: (sha: string) => void;
  onContextMenu?: (sha: string, clientX: number, clientY: number) => void;
};

export function GraphCanvas({
  view,
  selectedSha,
  width,
  rangeStart,
  rangeEnd,
  rangeOverscan = 20,
  onSelectCommit,
  onHoverCommit,
  onLeaveCommit,
  onContextMenu,
}: GraphCanvasProps) {
  const height = view.commits.length * ROW_HEIGHT;
  const interactive = Boolean(
    onSelectCommit || onHoverCommit || onLeaveCommit || onContextMenu,
  );

  // rangeStart/End 未指定なら全範囲。指定時は overscan を加味して描画範囲を決める。
  const hasRange = rangeStart !== undefined && rangeEnd !== undefined;
  const drawStart = hasRange ? Math.max(0, rangeStart - rangeOverscan) : 0;
  const drawEnd = hasRange
    ? Math.min(view.commits.length, rangeEnd + rangeOverscan)
    : view.commits.length;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
      className="absolute top-0 left-0 z-10"
      style={{ pointerEvents: 'none' }}
    >
      <g>
        {view.edges.map((edge) => {
          // 可視レンジを跨ぐエッジは描く必要があるため AABB 判定。
          // (両端が画面外 = 片方が drawStart より上 かつ もう片方が drawEnd より下、
          //  という稀ケースも含めて、min/max で判定する)
          const eMin = Math.min(edge.fromRow, edge.toRow);
          const eMax = Math.max(edge.fromRow, edge.toRow);
          if (eMax < drawStart || eMin >= drawEnd) return null;
          const x1 = laneX(edge.fromLane);
          const y1 = rowY(edge.fromRow);
          const x2 = laneX(edge.toLane);
          const y2 = rowY(edge.toRow);
          const stroke = laneColor(edge.isMerge ? edge.fromLane : edge.toLane);
          if (x1 === x2) {
            return (
              <line
                key={`${edge.fromSha}-${edge.toSha}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
              />
            );
          }
          // VSCode Git Graph 流: 大部分は縦線で進み、最後の 1 行分だけで lane を横移動する。
          // (始点が常に上、終点が下にある前提。transform は子→親の順で row が増えていく。)
          const curveSpan = ROW_HEIGHT;
          const goingDown = y2 > y1;
          const curveStart = goingDown
            ? Math.max(y1, y2 - curveSpan)
            : Math.min(y1, y2 + curveSpan);
          // 縦線部分 (始点 → カーブ開始)
          // カーブ部分: 制御点を (x1, y2) と (x2, curveStart) に置いて S 字を描く
          const d =
            `M ${x1} ${y1} ` +
            `L ${x1} ${curveStart} ` +
            `C ${x1} ${y2}, ${x2} ${curveStart}, ${x2} ${y2}`;
          return (
            <path
              key={`${edge.fromSha}-${edge.toSha}`}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      <g>
        {view.commits.map((c) => {
          if (c.row < drawStart || c.row >= drawEnd) return null;
          const cx = laneX(c.lane);
          const cy = rowY(c.row);
          const isSelected = c.sha === selectedSha;
          const r = isSelected ? NODE_RADIUS + 1.5 : NODE_RADIUS;
          return (
            <g key={c.sha}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={laneColor(c.lane)}
                stroke={isSelected ? 'var(--graph-node-stroke-selected)' : 'var(--graph-node-stroke)'}
                strokeWidth={isSelected ? 2.5 : 2}
              />
              {interactive ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + HIT_RADIUS_PAD}
                  fill="transparent"
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCommit?.(c.sha);
                  }}
                  onMouseEnter={(e) => onHoverCommit?.(c.sha, e.clientX, e.clientY)}
                  onMouseMove={(e) => onHoverCommit?.(c.sha, e.clientX, e.clientY)}
                  onMouseLeave={() => onLeaveCommit?.(c.sha)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu?.(c.sha, e.clientX, e.clientY);
                  }}
                />
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
