import { useCallback, useState } from 'react';

export function useActiveIndex(count: number, floor: number) {
  const [activeIndex, setActiveIndex] = useState(floor);
  const move = useCallback(
    (delta: number) => setActiveIndex((i) => Math.min(Math.max(i + delta, floor), count - 1)),
    [count, floor],
  );
  const reset = useCallback(() => setActiveIndex(floor), [floor]);
  return { activeIndex, setActiveIndex, move, reset };
}
