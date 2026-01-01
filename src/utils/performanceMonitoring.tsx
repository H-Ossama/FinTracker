/**
 * Performance Monitoring Utilities
 * Real-time performance metrics and monitoring for React Native
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { BundleAnalyzer } from './codeSplitting';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'render' | 'network' | 'memory' | 'animation' | 'custom' | 'benchmark';
  details?: Record<string, any>;
}

export interface PerformanceReport {
  summary: {
    totalMetrics: number;
    averageRenderTime: number;
    memoryUsage: number;
    slowRenders: number;
    slowAnimations: any[];
  };
  metrics: PerformanceMetric[];
  recommendations: string[];
}

// Performance data collector
export class PerformanceCollector {
  private static metrics: PerformanceMetric[] = [];
  private static maxMetrics = 1000; // Prevent memory bloat
  private static listeners: Array<(metric: PerformanceMetric) => void> = [];

  static addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Performance listener error:', error);
      }
    });
    
    if (__DEV__) {
      console.log(`📊 Performance: ${metric.name} = ${metric.value.toFixed(2)}ms`);
    }
  }

  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  static clearMetrics(): void {
    this.metrics = [];
  }

  static subscribe(listener: (metric: PerformanceMetric) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static generateReport(): PerformanceReport {
    const metrics = this.getMetrics();
    const renderMetrics = metrics.filter(m => m.category === 'render');
    const animationMetrics = metrics.filter(m => m.category === 'animation');
    
    const summary = {
      totalMetrics: metrics.length,
      averageRenderTime: renderMetrics.length > 0 
        ? renderMetrics.reduce((sum, m) => sum + m.value, 0) / renderMetrics.length 
        : 0,
      memoryUsage: this.getCurrentMemoryUsage(),
      slowRenders: renderMetrics.filter(m => m.value > 16.67).length, // Slower than 60fps
      slowAnimations: animationMetrics.filter((m: any) => m.duration > 16.67), // Slower than 60fps
    };

    const recommendations: string[] = [];
    
    if (summary.averageRenderTime > 16.67) {
      recommendations.push('Consider optimizing render performance - average render time exceeds 60fps target');
    }
    
    if (summary.slowRenders > 5) {
      recommendations.push('Multiple slow renders detected - check for expensive operations in render methods');
    }
    
    if (summary.memoryUsage > 100) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }

    return {
      summary,
      metrics,
      recommendations,
    };
  }

  private static getCurrentMemoryUsage(): number {
    try {
      // This is a simplified memory check - in real apps you'd use more sophisticated monitoring
      return (global as any).performance?.memory?.usedJSHeapSize / 1024 / 1024 || 0;
    } catch {
      return 0;
    }
  }
}

// React hook for performance monitoring
export const usePerformanceMonitoring = (componentName: string) => {
  const renderStartTime = useRef<number | null>(null);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (renderStartTime.current != null) {
      const renderTime = performance.now() - renderStartTime.current;
      
      PerformanceCollector.addMetric({
        name: `${componentName}_render`,
        value: renderTime,
        timestamp: Date.now(),
        category: 'render',
        details: { 
          componentName,
          renderCount: renderCount + 1,
        },
      });
    }
    
    setRenderCount(prev => prev + 1);
  });

  return {
    renderCount,
    addCustomMetric: (name: string, value: number, details?: Record<string, any>) => {
      PerformanceCollector.addMetric({
        name: `${componentName}_${name}`,
        value,
        timestamp: Date.now(),
        category: 'custom',
        details: { componentName, ...details },
      });
    },
  };
};

// Performance debugging utilities
export const PerformanceDebugger = {
  logCurrentState: () => {
    if (!__DEV__) return;
    
    const report = PerformanceCollector.generateReport();
    console.log('📊 Performance Report:', {
      totalMetrics: report.summary.totalMetrics,
      averageRender: `${report.summary.averageRenderTime.toFixed(2)}ms`,
      slowRenders: report.summary.slowRenders,
      memoryUsage: `${report.summary.memoryUsage.toFixed(2)}MB`,
    });
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:', report.recommendations);
    }
  },

  startMonitoring: (interval = 10000) => {
    if (!__DEV__) return () => {};
    
    console.log('🔍 Starting performance monitoring...');
    return setInterval(() => {
      PerformanceDebugger.logCurrentState();
    }, interval);
  },

  takeMemorySnapshot: () => {
    if (!__DEV__) return null;
    
    const snapshot = {
      timestamp: Date.now(),
      metrics: PerformanceCollector.getMetrics().length,
      memoryUsage: PerformanceCollector.generateReport().summary.memoryUsage,
      bundleInfo: BundleAnalyzer.getReport(),
    };
    
    console.log('📸 Memory Snapshot:', snapshot);
    return snapshot;
  },

  exportReport: () => {
    const report = PerformanceCollector.generateReport();
    const exportData = {
      timestamp: new Date().toISOString(),
      device: {
        platform: 'react-native',
        // Add more device info as needed
      },
      ...report,
    };
    
    if (__DEV__) {
      console.log('📤 Performance Export:', exportData);
    }
    
    return exportData;
  },
};

// Performance monitoring component for development
export const PerformanceMonitor: React.FC = () => {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [isVisible, setIsVisible] = useState(__DEV__);

  useEffect(() => {
    if (!__DEV__) return;

    const updateReport = () => {
      setReport(PerformanceCollector.generateReport());
    };

    const interval = setInterval(updateReport, 5000);
    updateReport(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !report) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 50,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: 10,
      borderRadius: 5,
      zIndex: 9999,
    }}>
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
        Performance Monitor
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Avg Render: {report.summary.averageRenderTime.toFixed(1)}ms
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Slow Renders: {report.summary.slowRenders}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Memory: {report.summary.memoryUsage.toFixed(1)}MB
      </Text>
    </View>
  );
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = async (): Promise<void> => {
  try {
    if (__DEV__) {
      console.log('🎯 Initializing performance monitoring...');
      
      // Start automatic monitoring
      PerformanceDebugger.startMonitoring(15000); // Every 15 seconds
      
      console.log('✅ Performance monitoring initialized');
    }
  } catch (error) {
    console.error('❌ Failed to initialize performance monitoring:', error);
  }
};