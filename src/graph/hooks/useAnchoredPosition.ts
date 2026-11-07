import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

type Position = { left: number; top: number };
type Size = { width: number; height: number };
type Point = { x: number; y: number };

export type Placement = (anchor: Point, size: Size, viewport: Size) => Position;

const VIEWPORT_MARGIN = 8;
const TOOLTIP_OFFSET = 14;

function keepInViewport({ left, top }: Position, size: Size, viewport: Size): Position {
  return {
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, viewport.width - size.width - VIEWPORT_MARGIN)),
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, viewport.height - size.height - VIEWPORT_MARGIN)),
  };
}

export const clampToViewport: Placement = (anchor, size, viewport) =>
  keepInViewport({ left: anchor.x, top: anchor.y }, size, viewport);

export const flipAroundPointer: Placement = (anchor, size, viewport) => {
  const flipX = anchor.x + TOOLTIP_OFFSET + size.width + VIEWPORT_MARGIN > viewport.width;
  const flipY = anchor.y + TOOLTIP_OFFSET + size.height + VIEWPORT_MARGIN > viewport.height;
  return keepInViewport(
    {
      left: flipX ? anchor.x - TOOLTIP_OFFSET - size.width : anchor.x + TOOLTIP_OFFSET,
      top: flipY ? anchor.y - TOOLTIP_OFFSET - size.height : anchor.y + TOOLTIP_OFFSET,
    },
    size,
    viewport,
  );
};

export function useAnchoredPosition<T extends HTMLElement>(
  x: number,
  y: number,
  placement: Placement,
): { ref: RefObject<T | null>; position: Position } {
  const ref = useRef<T | null>(null);
  const [position, setPosition] = useState<Position>(() =>
    placement({ x, y }, { width: 0, height: 0 }, { width: Infinity, height: Infinity }),
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    function place(target: HTMLElement) {
      const { width, height } = target.getBoundingClientRect();
      const next = placement(
        { x, y },
        { width, height },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPosition((prev) => (prev.left === next.left && prev.top === next.top ? prev : next));
    }
    place(el);
    const observer = new ResizeObserver(() => place(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, [x, y, placement]);

  return { ref, position };
}
