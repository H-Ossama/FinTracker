/**
 * Component Optimization Hooks
 * Separated from JSX file to avoid TypeScript generic conflicts
 */

import { useMemo, useCallback, useState } from 'react';
import { ComponentType } from 'react';

export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

export const useOptimizedStyles = <T>(
  styleFactory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(styleFactory, deps);
};

export const useOptimizedState = <T>(
  initialState: T | (() => T)
) => {
  const [state, setState] = useState(initialState);

  const optimizedSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(prevState)
        : newState;
      
      // Simple deep comparison for objects/arrays
      if (typeof nextState === 'object' && nextState !== null) {
        if (JSON.stringify(prevState) === JSON.stringify(nextState)) {
          return prevState; // No change
        }
      } else if (prevState === nextState) {
        return prevState; // No change
      }
      
      return nextState;
    });
  }, []);

  return [state, optimizedSetState] as const;
};

export const withPerformanceOptimization = <P extends object>(
  Component: ComponentType<P>
) => {
  const componentName = Component.displayName || Component.name || 'Component';
  
  const OptimizedComponent = (props: P) => {
    // Performance tracking in development
    if (__DEV__) {
      const renderStart = performance.now();
      
      // Track render time after component mounts
      setTimeout(() => {
        const renderEnd = performance.now();
        if (renderEnd - renderStart > 16) { // Longer than 1 frame at 60fps
          console.warn(`⚠️ Slow render detected in ${componentName}: ${(renderEnd - renderStart).toFixed(2)}ms`);
        }
      }, 0);
    }

    return <Component {...props} />;
  };

  OptimizedComponent.displayName = `Optimized(${componentName})`;
  return OptimizedComponent;
};