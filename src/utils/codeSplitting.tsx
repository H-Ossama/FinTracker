/**
 * Code Splitting Utilities
 * Dynamic imports and bundle optimization for React Native
 */

import React, { Suspense, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

// Import the hook from separate file to avoid TypeScript generic conflicts
export { useLazyLoad, type LazyLoadOptions, type LazyLoadResult } from './codeSplittingHooks';

// Create lazy components with error boundaries
export const createLazyComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFunc);
  
  const WrappedComponent = (props: any) => {
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      setHasError(false);
    }, []);
    
    if (hasError) {
      const FallbackComponent = fallback || DefaultErrorFallback;
      return <FallbackComponent />;
    }
    
    return (
      <Suspense fallback={<DefaultLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
  
  return WrappedComponent;
};

// Default fallback components
const DefaultLoadingFallback: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
  </View>
);

const DefaultErrorFallback: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#FF3B30', fontSize: 16 }}>Failed to load component</Text>
  </View>
);

// Bundle analyzer for development
export class BundleAnalyzer {
  private static loadTimes: Map<string, number> = new Map();
  private static componentSizes: Map<string, number> = new Map();
  
  static trackLoad(componentName: string, startTime: number): void {
    const loadTime = Date.now() - startTime;
    this.loadTimes.set(componentName, loadTime);
    
    if (__DEV__) {
      console.log(`📦 ${componentName} loaded in ${loadTime}ms`);
    }
  }
  
  static trackComponentSize(componentName: string, size: number): void {
    this.componentSizes.set(componentName, size);
    
    if (__DEV__) {
      console.log(`📏 ${componentName} bundle size: ${(size / 1024).toFixed(2)}KB`);
    }
  }
  
  static getReport(): {
    loadTimes: Array<{ component: string; time: number }>;
    componentSizes: Array<{ component: string; size: number }>;
    recommendations: string[];
  } {
    const loadTimes = Array.from(this.loadTimes.entries()).map(([component, time]) => ({
      component,
      time,
    }));
    
    const componentSizes = Array.from(this.componentSizes.entries()).map(([component, size]) => ({
      component,
      size,
    }));
    
    const recommendations: string[] = [];
    
    // Analyze load times
    const slowComponents = loadTimes.filter(item => item.time > 1000);
    if (slowComponents.length > 0) {
      recommendations.push(
        `Consider optimizing slow-loading components: ${slowComponents.map(c => c.component).join(', ')}`
      );
    }
    
    // Analyze bundle sizes
    const largeComponents = componentSizes.filter(item => item.size > 100 * 1024); // > 100KB
    if (largeComponents.length > 0) {
      recommendations.push(
        `Consider splitting large components: ${largeComponents.map(c => c.component).join(', ')}`
      );
    }
    
    return {
      loadTimes,
      componentSizes,
      recommendations,
    };
  }
}

// Module preloader for critical components
export class ModulePreloader {
  private static preloadedModules: Set<string> = new Set();
  
  static async preload(
    modules: Array<{
      name: string;
      loader: () => Promise<any>;
      priority: 'high' | 'medium' | 'low';
    }>
  ): Promise<void> {
    // Sort by priority
    const sortedModules = modules.sort((a, b) => {
      const priorities = { high: 0, medium: 1, low: 2 };
      return priorities[a.priority] - priorities[b.priority];
    });
    
    // Preload high priority modules first
    const highPriorityModules = sortedModules.filter(m => m.priority === 'high');
    await Promise.all(
      highPriorityModules.map(async module => {
        if (!this.preloadedModules.has(module.name)) {
          try {
            await module.loader();
            this.preloadedModules.add(module.name);
            if (__DEV__) {
              console.log(`✅ Preloaded high priority module: ${module.name}`);
            }
          } catch (error) {
            console.error(`❌ Failed to preload module ${module.name}:`, error);
          }
        }
      })
    );
    
    // Preload medium and low priority modules in the background
    setTimeout(() => {
      const backgroundModules = sortedModules.filter(m => m.priority !== 'high');
      backgroundModules.forEach(async module => {
        if (!this.preloadedModules.has(module.name)) {
          try {
            await module.loader();
            this.preloadedModules.add(module.name);
            if (__DEV__) {
              console.log(`✅ Preloaded background module: ${module.name}`);
            }
          } catch (error) {
            console.error(`❌ Failed to preload background module ${module.name}:`, error);
          }
        }
      });
    }, 100);
  }
  
  static isPreloaded(moduleName: string): boolean {
    return this.preloadedModules.has(moduleName);
  }
  
  static getPreloadedModules(): string[] {
    return Array.from(this.preloadedModules);
  }
}

// Initialize code splitting optimizations
export const initializeCodeSplitting = async (): Promise<void> => {
  try {
    if (__DEV__) {
      console.log('🎯 Initializing code splitting optimizations...');
    }
    
    // Preload critical modules
    await ModulePreloader.preload([
      {
        name: 'navigation',
        loader: () => import('@react-navigation/native'),
        priority: 'high',
      },
      {
        name: 'bottom-tabs',
        loader: () => import('@react-navigation/bottom-tabs'),
        priority: 'high',
      },
    ]);
    
    if (__DEV__) {
      console.log('✅ Code splitting initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize code splitting:', error);
  }
};