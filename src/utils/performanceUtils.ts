/**
 * Performance Optimization Utilities
 * Optimizes performance by preventing unnecessary re-renders and calculations
 */

import { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react';

// Higher-order component for memoizing expensive components
export const withMemoization = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, propsAreEqual);
};

// Custom hook for memoizing expensive calculations
export const useExpensiveMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

// Custom hook for memoizing callbacks
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

// Memoized styles helper to prevent style recalculation
export const useStyles = <T>(
  styleFactory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(styleFactory, deps);
};

// Performance monitoring hook (development only)
export const usePerformanceMonitor = (componentName: string) => {
  if (__DEV__) {
    useEffect(() => {
      const startTime = performance.now();
      return () => {
        const endTime = performance.now();
        console.log(`${componentName} render time: ${endTime - startTime}ms`);
      };
    });
  }
};

// Image optimization utilities
export const getOptimizedImageUri = (
  uri: string,
  width?: number,
  height?: number,
  quality = 80
): string => {
  if (!uri) return '';
  
  // For development/local images, return as-is
  if (uri.startsWith('file://') || uri.startsWith('./') || uri.startsWith('../')) {
    return uri;
  }
  
  // Add query parameters for image optimization (works with CDNs)
  try {
    const url = new URL(uri);
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('f', 'webp'); // Use WebP format for better compression
    
    return url.toString();
  } catch {
    return uri; // Return original if URL parsing fails
  }
};

// Memory leak prevention utilities
export const useCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Debounced value hook for performance optimization
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttled callback hook
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// Memoized array utilities
export const useMemoizedArray = <T>(array: T[], equalityFn?: (a: T, b: T) => boolean): T[] => {
  return useMemo(() => {
    return array;
  }, equalityFn ? [array.length, ...array] : [array]);
};

// Stable reference for objects
export const useStableObject = <T extends Record<string, any>>(obj: T): T => {
  return useMemo(() => obj, Object.values(obj));
};

// Performance timing utilities
export const measurePerformance = (name: string, fn: () => void) => {
  if (__DEV__) {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`⏱️ ${name}: ${end - start}ms`);
  } else {
    fn();
  }
};

// Component render optimization helpers
export const shouldComponentUpdate = <P extends Record<string, any>>(
  prevProps: P,
  nextProps: P,
  keys?: (keyof P)[]
): boolean => {
  if (keys) {
    return keys.some(key => prevProps[key] !== nextProps[key]);
  }
  
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return true;
  }
  
  return prevKeys.some(key => prevProps[key] !== nextProps[key]);
};