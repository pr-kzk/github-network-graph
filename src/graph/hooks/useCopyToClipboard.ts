import { useCallback } from 'react';
import { t } from '@/shared/i18n';
import { copyToClipboard } from '../lib/clipboard';
import type { UseToastResult } from './useToast';

export function useCopyToClipboard(showToast: UseToastResult['showToast']) {
  return useCallback(
    async (text: string) => {
      const copied = await copyToClipboard(text);
      if (copied) showToast('success', t('toast_copied'));
      else showToast('error', t('toast_copy_failed'));
    },
    [showToast],
  );
}
