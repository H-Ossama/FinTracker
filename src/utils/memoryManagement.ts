/**
 * Memory Management and Leak Prevention Utilities
 * Provides tools to prevent memory leaks and optimize memory usage
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Memory leak detector for development
class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private trackedComponents = new Map<string, { count: number; timestamps: number[] }>();
  private trackedTimers = new Set<NodeJS.Timeout>();
  private trackedIntervals = new Set<NodeJS.Timeout>();
  private trackedListeners = new Map<string, any[]>();
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    if (__DEV__) {
      this.startMemoryMonitoring();
    }
  }

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  // Track component mounts/unmounts
  trackComponent(componentName: string, action: 'mount' | 'unmount'): void {
    if (!__DEV__) return;

    const existing = this.trackedComponents.get(componentName) || { count: 0, timestamps: [] };
    
    if (action === 'mount') {
      existing.count++;
      existing.timestamps.push(Date.now());
    } else {
      existing.count--;
      if (existing.count < 0) {
        console.warn(`⚠️ Memory Leak Warning: ${componentName} unmounted more times than mounted`);
        existing.count = 0;
      }
    }
    
    this.trackedComponents.set(componentName, existing);
    
    // Check for potential memory leaks
    if (existing.count > 10) {
      console.warn(`🚨 Potential Memory Leak: ${componentName} has ${existing.count} active instances`);
    }
  }

  // Track timers
  trackTimer(timer: NodeJS.Timeout): NodeJS.Timeout {
    this.trackedTimers.add(timer);
    return timer;
  }

  // Track intervals
  trackInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.trackedIntervals.add(interval);
    return interval;
  }

  // Clean up tracked timer
  cleanupTimer(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.trackedTimers.delete(timer);
  }

  // Clean up tracked interval
  cleanupInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.trackedIntervals.delete(interval);
  }

  // Track event listeners
  trackListener(eventName: string, listener: any): void {
    const listeners = this.trackedListeners.get(eventName) || [];
    listeners.push(listener);
    this.trackedListeners.set(eventName, listeners);
  }

  // Remove tracked listener
  removeListener(eventName: string, listener: any): void {
    const listeners = this.trackedListeners.get(eventName) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.trackedListeners.set(eventName, listeners);
    }
  }

  // Start memory monitoring
  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
  }

  // Check memory usage
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    
    if (stats.activeComponents > 20) {
      console.warn('🧠 High memory usage detected:', stats);
    }
    
    // Log memory stats in development
    if (__DEV__ && stats.totalActiveInstances > 0) {
      console.log('📊 Memory Stats:', stats);
    }
  }

  // Get memory statistics
  getMemoryStats(): {
    activeComponents: number;
    totalActiveInstances: number;
    activeTimers: number;
    activeIntervals: number;
    activeListeners: number;
    componentBreakdown: Array<{ name: string; count: number }>;
  } {
    let totalActiveInstances = 0;
    const componentBreakdown: Array<{ name: string; count: number }> = [];
    
    for (const [name, data] of this.trackedComponents.entries()) {
      if (data.count > 0) {
        totalActiveInstances += data.count;
        componentBreakdown.push({ name, count: data.count });
      }
    }
    
    let totalActiveListeners = 0;
    for (const listeners of this.trackedListeners.values()) {
      totalActiveListeners += listeners.length;
    }
    
    return {
      activeComponents: componentBreakdown.length,
      totalActiveInstances,
      activeTimers: this.trackedTimers.size,
      activeIntervals: this.trackedIntervals.size,
      activeListeners: totalActiveListeners,
      componentBreakdown: componentBreakdown.sort((a, b) => b.count - a.count),
    };
  }

  // Force cleanup all tracked resources
  forceCleanup(): void {
    // Clear all timers
    for (const timer of this.trackedTimers) {
      clearTimeout(timer);
    }
    this.trackedTimers.clear();
    
    // Clear all intervals
    for (const interval of this.trackedIntervals) {
      clearInterval(interval);
    }
    this.trackedIntervals.clear();
    
    // Clear component tracking
    this.trackedComponents.clear();
    
    // Clear listener tracking
    this.trackedListeners.clear();
    
    // Stop monitoring
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

// Global memory leak detector instance
const memoryLeakDetector = MemoryLeakDetector.getInstance();

// React hook for component lifecycle tracking
export const useMemoryTracker = (componentName: string): void => {
  useEffect(() => {
    memoryLeakDetector.trackComponent(componentName, 'mount');
    
    return () => {
      memoryLeakDetector.trackComponent(componentName, 'unmount');
    };
  }, [componentName]);
};

// Hook for safe timer management
export const useSafeTimeout = (): {
  setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearTimeout: (timer: NodeJS.Timeout) => void;
} => {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      for (const timer of timersRef.current) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);
  
  const safeSetTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    
    timersRef.current.add(timer);
    memoryLeakDetector.trackTimer(timer);
    
    return timer;
  }, []);
  
  const safeClearTimeout = useCallback((timer: NodeJS.Timeout): void => {
    clearTimeout(timer);
    timersRef.current.delete(timer);
    memoryLeakDetector.cleanupTimer(timer);
  }, []);
  
  return { setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout };
};

// Hook for safe interval management
export const useSafeInterval = (): {
  setInterval: (callback: () => void, delay: number) => NodeJS.Timeout;
  clearInterval: (interval: NodeJS.Timeout) => void;
} => {
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  useEffect(() => {
    return () => {
      // Cleanup all intervals on unmount
      for (const interval of intervalsRef.current) {
        clearInterval(interval);
      }
      intervalsRef.current.clear();
    };
  }, []);
  
  const safeSetInterval = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const interval = setInterval(callback, delay);
    
    intervalsRef.current.add(interval);
    memoryLeakDetector.trackInterval(interval);
    
    return interval;
  }, []);
  
  const safeClearInterval = useCallback((interval: NodeJS.Timeout): void => {
    clearInterval(interval);
    intervalsRef.current.delete(interval);
    memoryLeakDetector.cleanupInterval(interval);
  }, []);
  
  return { setInterval: safeSetInterval, clearInterval: safeClearInterval };
};

// Hook for safe event listener management
export const useSafeEventListener = (
  eventTarget: any,
  eventName: string,
  listener: (...args: any[]) => void,
  deps: React.DependencyList = []
): void => {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  
  useEffect(() => {
    const safeListener = (...args: any[]) => {
      listenerRef.current(...args);
    };
    
    if (eventTarget && eventTarget.addEventListener) {
      eventTarget.addEventListener(eventName, safeListener);
      memoryLeakDetector.trackListener(eventName, safeListener);
    } else if (eventTarget && eventTarget.addListener) {
      eventTarget.addListener(eventName, safeListener);
      memoryLeakDetector.trackListener(eventName, safeListener);
    }
    
    return () => {
      if (eventTarget && eventTarget.removeEventListener) {
        eventTarget.removeEventListener(eventName, safeListener);
      } else if (eventTarget && eventTarget.removeListener) {
        eventTarget.removeListener(eventName, safeListener);
      }
      memoryLeakDetector.removeListener(eventName, safeListener);
    };
  }, [eventTarget, eventName, ...deps]);
};

// Hook for cleanup functions
export const useCleanupEffect = (cleanupFn: () => void): void => {
  const cleanupRef = useRef(cleanupFn);
  cleanupRef.current = cleanupFn;
  
  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
};

// Memory-efficient state management
export const useMemoryEfficientState = <T>(
  initialState: T
): [T, (newState: T | ((prevState: T) => T)) => void] => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  
  const setStateOptimized = useCallback((newState: T | ((prevState: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prevState: T) => T)(prevState)
        : newState;
      
      // Only update if the state actually changed
      if (nextState !== prevState) {
        stateRef.current = nextState;
        return nextState;
      }
      
      return prevState;
    });
  }, []);
  
  return [state, setStateOptimized];
};

// WeakMap-based component cache to prevent memory leaks
const componentCache = new WeakMap();

export const useWeakCache = <T extends object, R>(
  key: T,
  factory: () => R
): R => {
  if (componentCache.has(key)) {
    return componentCache.get(key);
  }
  
  const value = factory();
  componentCache.set(key, value);
  return value;
};

// Memory pressure monitoring
class MemoryPressureMonitor {
  private static instance: MemoryPressureMonitor;
  private listeners: Array<(level: 'low' | 'medium' | 'high') => void> = [];
  private appStateListener: any = null;
  
  private constructor() {
    this.setupAppStateListener();
  }
  
  static getInstance(): MemoryPressureMonitor {
    if (!MemoryPressureMonitor.instance) {
      MemoryPressureMonitor.instance = new MemoryPressureMonitor();
    }
    return MemoryPressureMonitor.instance;
  }
  
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }
  
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // Trigger memory cleanup when app goes to background
      this.notifyListeners('medium');
    }
  }
  
  addListener(listener: (level: 'low' | 'medium' | 'high') => void): void {
    this.listeners.push(listener);
  }
  
  removeListener(listener: (level: 'low' | 'medium' | 'high') => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  private notifyListeners(level: 'low' | 'medium' | 'high'): void {
    this.listeners.forEach(listener => {
      try {
        listener(level);
      } catch (error) {
        console.error('Error in memory pressure listener:', error);
      }
    });
  }
  
  cleanup(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    this.listeners = [];
  }
}

// Hook for memory pressure handling
export const useMemoryPressure = (
  onPressure: (level: 'low' | 'medium' | 'high') => void
): void => {
  const callbackRef = useRef(onPressure);
  callbackRef.current = onPressure;
  
  useEffect(() => {
    const monitor = MemoryPressureMonitor.getInstance();
    
    const listener = (level: 'low' | 'medium' | 'high') => {
      callbackRef.current(level);
    };
    
    monitor.addListener(listener);
    
    return () => {
      monitor.removeListener(listener);
    };
  }, []);
};

// Memory management utilities
export const MemoryManager = {
  // Force garbage collection (development only)
  forceGC: (): void => {
    if (__DEV__ && global.gc) {
      global.gc();
      console.log('🗑️ Forced garbage collection');
    }
  },
  
  // Get memory statistics
  getStats: (): any => {
    return memoryLeakDetector.getMemoryStats();
  },
  
  // Force cleanup all tracked resources
  cleanup: (): void => {
    memoryLeakDetector.forceCleanup();
    MemoryPressureMonitor.getInstance().cleanup();
  },
  
  // Log memory report
  logReport: (): void => {
    if (__DEV__) {
      const stats = memoryLeakDetector.getMemoryStats();
      console.log('📊 Memory Report:', stats);
      
      if (stats.componentBreakdown.length > 0) {
        console.log('🏗️ Component Breakdown:');
        stats.componentBreakdown.forEach(({ name, count }) => {
          console.log(`  ${name}: ${count} instances`);
        });
      }
    }
  },
};

// Initialize memory management
export const initializeMemoryManagement = (): void => {
  if (__DEV__) {
    console.log('🧠 Memory management initialized');
    
    // Log memory report every 2 minutes in development
    setInterval(() => {
      MemoryManager.logReport();
    }, 120000);
  }
};

export { memoryLeakDetector };