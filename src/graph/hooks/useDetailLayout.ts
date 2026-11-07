import { useCallback, useState } from 'react';
import { clampDetailWidth, localStore } from '@/shared/storage';
import { useLocalValue } from '@/shared/useLocalValue';
import { autoDetailCollapsed, autoDetailWidth } from '../lib/detailLayout';
import { useWindowWidth } from './useWindowWidth';

export type DetailLayout = {
  width: number;
  collapsed: boolean;
  previewWidth: (width: number) => void;
  commitWidth: (width: number) => void;
  setCollapsed: (collapsed: boolean) => void;
  reveal: () => void;
};

export function useDetailLayout(): DetailLayout {
  const saved = useLocalValue('graphLayout');
  const windowWidth = useWindowWidth();
  const [preview, setPreview] = useState<number | null>(null);
  const [revealedAtWidth, setRevealedAtWidth] = useState<number | null>(null);

  const previewWidth = useCallback((width: number) => setPreview(clampDetailWidth(width)), []);

  const commitWidth = useCallback((width: number) => {
    setPreview(null);
    void localStore.update('graphLayout', { detailWidth: clampDetailWidth(width) });
  }, []);

  const setCollapsed = useCallback((detailCollapsed: boolean) => {
    setRevealedAtWidth(null);
    void localStore.update('graphLayout', { detailCollapsed });
  }, []);

  const reveal = useCallback(() => setRevealedAtWidth(windowWidth), [windowWidth]);

  const revealed = revealedAtWidth === windowWidth;

  return {
    width: preview ?? saved.detailWidth ?? autoDetailWidth(windowWidth),
    collapsed: !revealed && (saved.detailCollapsed ?? autoDetailCollapsed(windowWidth)),
    previewWidth,
    commitWidth,
    setCollapsed,
    reveal,
  };
}
