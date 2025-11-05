/**
 * Component Optimization Utilities
 * React Native performance optimizations for components
 */

import React, { memo, useMemo, useCallback, ComponentType } from 'react';
import { Image } from 'react-native';

// Import hooks from separate file to avoid TypeScript generic conflicts  
export { 
  useOptimizedMemo, 
  useOptimizedStyles, 
  useOptimizedState, 
  withPerformanceOptimization 
} from './componentOptimizationHooks';

// Fast component creation with automatic memoization
export const createOptimizedComponent = <P extends object>(
  renderFunc: (props: P) => React.ReactElement,
  displayName?: string
): React.FC<P> => {
  const MemoizedComponent = memo(renderFunc);
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }
  return MemoizedComponent;
};

// Optimized memo wrapper with custom comparison
export const withOptimizedMemo = <P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.FC<P> => {
  return memo(Component, propsAreEqual);
};

// Hook for optimized image source processing
export const useOptimizedImageSource = (
  source: string | { uri: string },
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  } = {}
) => {
  return useMemo(() => {
    if (typeof source === 'string') {
      return { uri: source };
    }
    return source;
  }, [source, options.width, options.height, options.quality, options.format]);
};

// React component creator for optimized images
export const createOptimizedImage = () => {
  const OptimizedImageComponent: React.FC<{
    source: string | { uri: string };
    style?: any;
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center' | 'repeat';
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png';
  }> = memo((props) => {
    const optimizedSource = useOptimizedImageSource(props.source, {
      width: props.width,
      height: props.height,
      quality: props.quality,
      format: props.format,
    });

    return (
      <Image
        source={optimizedSource}
        style={props.style}
        resizeMode={props.resizeMode || 'cover'}
      />
    );
  });

  return OptimizedImageComponent;
};