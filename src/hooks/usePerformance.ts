import { useEffect, useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Hook to optimize screen rendering performance
 * Delays expensive operations until after the screen transition is complete
 */
export const useScreenPerformance = (options?: {
  delayMs?: number;
  enableInteractionDelay?: boolean;
}) => {
  const [isReady, setIsReady] = useState(false);
  const [isInteractionComplete, setIsInteractionComplete] = useState(false);

  const { delayMs = 0, enableInteractionDelay = true } = options || {};

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let interactionTask: { cancel: () => void } | null = null;

    if (enableInteractionDelay) {
      interactionTask = InteractionManager.runAfterInteractions(() => {
        setIsInteractionComplete(true);
        if (delayMs > 0) {
          timeoutId = setTimeout(() => {
            setIsReady(true);
          }, delayMs);
        } else {
          setIsReady(true);
        }
      });
    } else {
      if (delayMs > 0) {
        timeoutId = setTimeout(() => {
          setIsReady(true);
        }, delayMs);
      } else {
        setIsReady(true);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (interactionTask) {
        interactionTask.cancel();
      }
    };
  }, [delayMs, enableInteractionDelay]);

  const runAfterInteractions = useCallback((callback: () => void) => {
    if (isInteractionComplete) {
      callback();
    } else {
      InteractionManager.runAfterInteractions(callback);
    }
  }, [isInteractionComplete]);

  return {
    isReady,
    isInteractionComplete,
    runAfterInteractions,
  };
};

/**
 * Hook for throttling state updates to improve performance
 */
export const useThrottledState = <T>(
  initialValue: T,
  delay: number = 100
): [T, (value: T) => void] => {
  const [state, setState] = useState(initialValue);
  const [lastUpdate, setLastUpdate] = useState(0);

  const throttledSetState = useCallback((newValue: T) => {
    const now = Date.now();
    if (now - lastUpdate >= delay) {
      setState(newValue);
      setLastUpdate(now);
    }
  }, [delay, lastUpdate]);

  return [state, throttledSetState];
};

/**
 * Hook for debouncing state updates
 */
export const useDebouncedState = <T>(
  initialValue: T,
  delay: number = 300
): [T, (value: T) => void, T] => {
  const [state, setState] = useState(initialValue);
  const [debouncedState, setDebouncedState] = useState(initialValue);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedState(state);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [state, delay]);

  return [state, setState, debouncedState];
};

/**
 * Hook for lazy loading data after screen is ready
 */
export const useLazyData = <T>(
  dataLoader: () => Promise<T> | T,
  deps: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isReady } = useScreenPerformance();

  const loadData = useCallback(async () => {
    if (!isReady) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await dataLoader();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dataLoader, isReady]);

  useEffect(() => {
    loadData();
  }, [loadData, ...deps]);

  return { data, loading, error, refetch: loadData };
};