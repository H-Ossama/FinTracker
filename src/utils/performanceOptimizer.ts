import { InteractionManager, Platform } from 'react-native';

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private pendingTasks = new Set<() => void>();
  private isRunning = false;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Schedule a task to run after interactions are complete
   */
  scheduleTask(task: () => void): { cancel: () => void } {
    this.pendingTasks.add(task);
    
    if (!this.isRunning) {
      this.runTasks();
    }

    return {
      cancel: () => {
        this.pendingTasks.delete(task);
      }
    };
  }

  private async runTasks() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    await new Promise(resolve => {
      InteractionManager.runAfterInteractions(() => {
        resolve(true);
      });
    });

    // Execute all pending tasks
    for (const task of this.pendingTasks) {
      try {
        task();
      } catch (error) {
        console.error('Performance optimizer task failed:', error);
      }
    }
    
    this.pendingTasks.clear();
    this.isRunning = false;
  }

  /**
   * Debounced function execution
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttled function execution
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Optimize image loading for better performance
   */
  optimizeImage(uri: string, width?: number, height?: number): string {
    if (Platform.OS === 'web') {
      // Add query parameters for web optimization
      const separator = uri.includes('?') ? '&' : '?';
      let optimizedUri = uri;
      
      if (width) {
        optimizedUri += `${separator}w=${width}`;
      }
      
      if (height) {
        optimizedUri += `${optimizedUri.includes('?') ? '&' : '?'}h=${height}`;
      }
      
      return optimizedUri;
    }
    
    return uri;
  }

  /**
   * Preload critical resources
   */
  preloadResources(resources: string[]): Promise<void[]> {
    const preloadPromises = resources.map(resource => {
      return new Promise<void>((resolve, reject) => {
        // For images
        if (resource.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error(`Failed to load image: ${resource}`));
          image.src = resource;
        } else {
          // For other resources, just resolve immediately
          resolve();
        }
      });
    });

    return Promise.all(preloadPromises);
  }

  /**
   * Memory cleanup utility
   */
  cleanup(): void {
    this.pendingTasks.clear();
    this.isRunning = false;
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();

/**
 * Hook for better screen transition performance
 */
export const useScreenTransition = () => {
  return {
    scheduleTask: performanceOptimizer.scheduleTask.bind(performanceOptimizer),
    debounce: performanceOptimizer.debounce.bind(performanceOptimizer),
    throttle: performanceOptimizer.throttle.bind(performanceOptimizer),
  };
};

/**
 * Higher-order component for performance optimization
 * @deprecated - Use ScreenWrapper.tsx instead for React components
 */
export const withPerformanceOptimization = <P extends object>(
  componentName: string,
  options?: {
    preloadDelay?: number;
    enableMemoryCleanup?: boolean;
  }
) => {
  console.warn(`withPerformanceOptimization is deprecated for ${componentName}. Use ScreenWrapper.tsx instead.`);
  
  return (Component: any) => Component;
};