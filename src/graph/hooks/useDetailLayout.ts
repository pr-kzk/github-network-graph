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
};

export function useDetailLayout(): DetailLayout {
  const saved = useLocalValue('graphLayout');
  const windowWidth = useWindowWidth();
  const [preview, setPreview] = useState<number | null>(null);

  const previewWidth = useCallback((width: number) => setPreview(clampDetailWidth(width)), []);

  const commitWidth = useCallback(
    (width: number) => {
      setPreview(null);
      void localStore.set('graphLayout', { ...saved, detailWidth: clampDetailWidth(width) });
    },
    [saved],
  );

  const setCollapsed = useCallback(
    (detailCollapsed: boolean) => {
      void localStore.set('graphLayout', { ...saved, detailCollapsed });
    },
    [saved],
  );

  return {
    width: preview ?? saved.detailWidth ?? autoDetailWidth(windowWidth),
    collapsed: saved.detailCollapsed ?? autoDetailCollapsed(windowWidth),
    previewWidth,
    commitWidth,
    setCollapsed,
  };
}
