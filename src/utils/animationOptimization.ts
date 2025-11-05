/**
 * Animation Performance Optimization Utilities
 * Provides native driver optimizations and GPU-accelerated animations
 */

import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { Animated, Easing, Platform, LayoutAnimation, InteractionManager } from 'react-native';

// Animation configuration presets
export const ANIMATION_PRESETS = {
  // Quick animations for micro-interactions
  quick: {
    duration: 150,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  },
  // Standard animations for most UI transitions
  standard: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  // Slow animations for emphasis
  slow: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  // Bouncy animations for playful interactions
  bouncy: {
    duration: 400,
    easing: Easing.bounce,
    useNativeDriver: true,
  },
};

// Layout animation presets
export const LAYOUT_ANIMATION_PRESETS = {
  easeInEaseOut: {
    duration: 300,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  },
  spring: {
    duration: 400,
    create: {
      type: LayoutAnimation.Types.spring,
      property: LayoutAnimation.Properties.scaleXY,
      springDamping: 0.7,
    },
    update: {
      type: LayoutAnimation.Types.spring,
      springDamping: 0.7,
    },
  },
};

// Optimized animated value hook with native driver support
export const useOptimizedAnimatedValue = (
  initialValue: number,
  options?: {
    useNativeDriver?: boolean;
    duration?: number;
    easing?: (value: number) => number;
  }
) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const { useNativeDriver = true, duration = 300, easing = Easing.out(Easing.cubic) } = options || {};
  
  const animate = useCallback((toValue: number, animationOptions?: {
    duration?: number;
    easing?: (value: number) => number;
    onComplete?: () => void;
  }) => {
    const finalOptions = {
      duration: animationOptions?.duration || duration,
      easing: animationOptions?.easing || easing,
      useNativeDriver,
    };
    
    Animated.timing(animatedValue, {
      toValue,
      ...finalOptions,
    }).start(animationOptions?.onComplete);
  }, [animatedValue, duration, easing, useNativeDriver]);
  
  const setValue = useCallback((value: number) => {
    animatedValue.setValue(value);
  }, [animatedValue]);
  
  const reset = useCallback(() => {
    animatedValue.setValue(initialValue);
  }, [animatedValue, initialValue]);
  
  return {
    animatedValue,
    animate,
    setValue,
    reset,
  };
};

// Optimized fade animation hook
export const useFadeAnimation = (
  initialOpacity: number = 0,
  options?: { duration?: number; useNativeDriver?: boolean }
) => {
  const { animatedValue: opacity, animate } = useOptimizedAnimatedValue(
    initialOpacity,
    options
  );
  
  const fadeIn = useCallback((onComplete?: () => void) => {
    animate(1, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, options?.duration]);
  
  const fadeOut = useCallback((onComplete?: () => void) => {
    animate(0, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, options?.duration]);
  
  const getOpacityStyle = useCallback(() => ({ opacity }), [opacity]);
  
  return { fadeIn, fadeOut, getOpacityStyle, opacity };
};

// Optimized scale animation hook
export const useScaleAnimation = (
  initialScale: number = 1,
  options?: { duration?: number; useNativeDriver?: boolean }
) => {
  const { animatedValue: scale, animate } = useOptimizedAnimatedValue(
    initialScale,
    options
  );
  
  const scaleIn = useCallback((targetScale: number = 1, onComplete?: () => void) => {
    animate(targetScale, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, options?.duration]);
  
  const scaleOut = useCallback((targetScale: number = 0, onComplete?: () => void) => {
    animate(targetScale, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, options?.duration]);
  
  const pulse = useCallback((onComplete?: () => void) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: (options?.duration || ANIMATION_PRESETS.standard.duration) / 2,
        useNativeDriver: options?.useNativeDriver !== false,
      }),
      Animated.timing(scale, {
        toValue: initialScale,
        duration: (options?.duration || ANIMATION_PRESETS.standard.duration) / 2,
        useNativeDriver: options?.useNativeDriver !== false,
      }),
    ]).start(onComplete);
  }, [scale, initialScale, options?.duration, options?.useNativeDriver]);
  
  const getScaleStyle = useCallback(() => ({ transform: [{ scale }] }), [scale]);
  
  return { scaleIn, scaleOut, pulse, getScaleStyle, scale };
};

// Optimized slide animation hook
export const useSlideAnimation = (
  direction: 'left' | 'right' | 'up' | 'down' = 'left',
  distance: number = 100,
  options?: { duration?: number; useNativeDriver?: boolean }
) => {
  const { animatedValue: translateValue, animate } = useOptimizedAnimatedValue(
    direction === 'left' || direction === 'up' ? -distance : distance,
    options
  );
  
  const slideIn = useCallback((onComplete?: () => void) => {
    animate(0, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, options?.duration]);
  
  const slideOut = useCallback((onComplete?: () => void) => {
    const targetValue = direction === 'left' || direction === 'up' ? -distance : distance;
    animate(targetValue, { 
      duration: options?.duration || ANIMATION_PRESETS.standard.duration,
      onComplete 
    });
  }, [animate, direction, distance, options?.duration]);
  
  const getTransformStyle = useCallback(() => {
    if (direction === 'up' || direction === 'down') {
      return { transform: [{ translateY: translateValue }] };
    } else {
      return { transform: [{ translateX: translateValue }] };
    }
  }, [direction, translateValue]);
  
  return { slideIn, slideOut, getTransformStyle };
};

// Initialize animation optimization
export const initializeAnimationOptimization = (): void => {
  if (__DEV__) {
    console.log('🎬 Animation optimization initialized');
  }
};

export default {
  ANIMATION_PRESETS,
  LAYOUT_ANIMATION_PRESETS,
  useOptimizedAnimatedValue,
  useFadeAnimation,
  useScaleAnimation,
  useSlideAnimation,
};