import { useRef, useCallback } from 'react';
import { SAVE_DEBOUNCE_MS } from '@/lib/constants';

export function useDebouncedSave<T>(saveFn: (item: T) => Promise<void>) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  return useCallback(
    (item: T) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveFn(item);
      }, SAVE_DEBOUNCE_MS);
    },
    [saveFn],
  );
}
