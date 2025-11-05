/**
 * Main Optimization Initialization
 * Centralizes all performance optimization initializations
 */

import { initializeStorageOptimization } from './storageOptimization';
import { initializeMemoryManagement } from './memoryManagement';
import { initializeNetworkOptimization } from './networkOptimization';

// Async imports for .tsx files to avoid TypeScript module resolution issues
const initializeCodeSplitting = async () => {
  try {
    const module = await import('./codeSplitting');
    return module.initializeCodeSplitting();
  } catch (error) {
    console.error('Failed to initialize code splitting:', error);
  }
};

const initializePerformanceMonitoring = async () => {
  try {
    const module = await import('./performanceMonitoring');
    return module.initializePerformanceMonitoring();
  } catch (error) {
    console.error('Failed to initialize performance monitoring:', error);
  }
};

export interface OptimizationConfig {
  enableStorageOptimization?: boolean;
  enableMemoryManagement?: boolean;
  enableNetworkOptimization?: boolean;
  enableCodeSplitting?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export class AppOptimizer {
  private config: OptimizationConfig;

  constructor(config: OptimizationConfig = {}) {
    this.config = {
      enableStorageOptimization: true,
      enableMemoryManagement: true,
      enableNetworkOptimization: true,
      enableCodeSplitting: true,
      enablePerformanceMonitoring: true,
      ...config,
    };
  }

  async initializeAll(): Promise<void> {
    try {
      console.log('🚀 Starting app optimization initialization...');

      if (this.config.enableStorageOptimization) {
        await initializeStorageOptimization();
        console.log('✅ Storage optimization initialized');
      }

      if (this.config.enableMemoryManagement) {
        await initializeMemoryManagement();
        console.log('✅ Memory management initialized');
      }

      if (this.config.enableNetworkOptimization) {
        await initializeNetworkOptimization();
        console.log('✅ Network optimization initialized');
      }

      if (this.config.enableCodeSplitting) {
        await initializeCodeSplitting();
        console.log('✅ Code splitting initialized');
      }

      if (this.config.enablePerformanceMonitoring) {
        await initializePerformanceMonitoring();
        console.log('✅ Performance monitoring initialized');
      }

      console.log('🎉 All optimizations initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing optimizations:', error);
      throw error;
    }
  }

  getOptimizationStatus(): OptimizationConfig {
    return { ...this.config };
  }
}

// Global optimizer instance
let globalOptimizer: AppOptimizer | null = null;

export const initializeAppOptimizations = async (config?: OptimizationConfig): Promise<AppOptimizer> => {
  if (!globalOptimizer) {
    globalOptimizer = new AppOptimizer(config);
    await globalOptimizer.initializeAll();
  }
  return globalOptimizer;
};

export const getAppOptimizer = (): AppOptimizer | null => {
  return globalOptimizer;
};

// Export optimization utilities (async imports for .tsx files)
export * from './storageOptimization';
export * from './memoryManagement';
export * from './animationOptimization';
export * from './networkOptimization';

// Re-export from .tsx files through dynamic imports when needed
export const getComponentOptimizations = () => import('./componentOptimization');
export const getImageOptimizations = () => import('./imageOptimization');
export const getCodeSplittingUtils = () => import('./codeSplitting');
export const getPerformanceMonitoring = () => import('./performanceMonitoring');