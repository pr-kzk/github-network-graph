import { useEffect, useRef, useState } from 'react';

const FLASH_MS = 1600;

type UseJumpFeedbackArgs = {
  seeking: boolean;
  selectedSha: string | null;
  isLoaded: boolean;
  onJumped: (sha: string) => void;
};

export function useJumpFeedback({
  seeking,
  selectedSha,
  isLoaded,
  onJumped,
}: UseJumpFeedbackArgs): string | null {
  const [awaitedSha, setAwaitedSha] = useState<string | null>(null);
  const [flashSha, setFlashSha] = useState<string | null>(null);
  const onJumpedRef = useRef(onJumped);

  useEffect(() => {
    onJumpedRef.current = onJumped;
  }, [onJumped]);

  if (seeking && selectedSha !== null && awaitedSha !== selectedSha) {
    setAwaitedSha(selectedSha);
  } else if (!seeking && awaitedSha !== null) {
    setAwaitedSha(null);
    if (awaitedSha === selectedSha && isLoaded) setFlashSha(selectedSha);
  }

  useEffect(() => {
    if (flashSha === null) return undefined;
    onJumpedRef.current(flashSha);
    const timer = setTimeout(() => setFlashSha(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashSha]);

  return flashSha;
}
