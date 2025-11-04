/**
 * Battery Optimization Utilities
 * Helps reduce battery consumption by managing background processes
 */

import { AppState, AppStateStatus } from 'react-native';

class BatteryOptimizer {
  private static instance: BatteryOptimizer;
  private appStateSubscription: any = null;
  private backgroundTimers: NodeJS.Timeout[] = [];
  private backgroundIntervals: NodeJS.Timeout[] = [];
  private isInBackground: boolean = false;
  private cleanupCallbacks: Array<() => void> = [];

  private constructor() {
    this.setupAppStateListener();
  }

  public static getInstance(): BatteryOptimizer {
    if (!BatteryOptimizer.instance) {
      BatteryOptimizer.instance = new BatteryOptimizer();
    }
    return BatteryOptimizer.instance;
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this)
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.handleAppGoingToBackground();
    } else if (nextAppState === 'active') {
      this.handleAppBecomingActive();
    }
  }

  private handleAppGoingToBackground(): void {
    this.isInBackground = true;
    console.log('🔋 App going to background - optimizing battery usage');
    
    // Clear all registered timers and intervals to save battery
    this.clearBackgroundTimers();
    
    // Execute cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });
  }

  private handleAppBecomingActive(): void {
    this.isInBackground = false;
    console.log('🔋 App becoming active - resuming normal operation');
  }

  private clearBackgroundTimers(): void {
    // Clear all tracked timers
    this.backgroundTimers.forEach(timer => {
      clearTimeout(timer);
    });
    this.backgroundTimers = [];

    // Clear all tracked intervals
    this.backgroundIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.backgroundIntervals = [];
  }

  // Public methods for components to use

  /**
   * Register a timer that should be cleared when app goes to background
   */
  public registerTimer(timer: NodeJS.Timeout): void {
    this.backgroundTimers.push(timer);
  }

  /**
   * Register an interval that should be cleared when app goes to background
   */
  public registerInterval(interval: NodeJS.Timeout): void {
    this.backgroundIntervals.push(interval);
  }

  /**
   * Register a cleanup callback to be executed when app goes to background
   */
  public registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Unregister a cleanup callback
   */
  public unregisterCleanupCallback(callback: () => void): void {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  /**
   * Check if app is currently in background
   */
  public isAppInBackground(): boolean {
    return this.isInBackground;
  }

  /**
   * Optimized setTimeout that automatically clears when app goes to background
   */
  public optimizedSetTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      // Remove from tracked timers when it executes
      const index = this.backgroundTimers.indexOf(timer);
      if (index > -1) {
        this.backgroundTimers.splice(index, 1);
      }
      callback();
    }, delay);

    this.registerTimer(timer);
    return timer;
  }

  /**
   * Optimized setInterval that automatically clears when app goes to background
   */
  public optimizedSetInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.registerInterval(interval);
    return interval;
  }

  /**
   * Clean up the battery optimizer
   */
  public cleanup(): void {
    this.clearBackgroundTimers();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.cleanupCallbacks = [];
  }
}

export default BatteryOptimizer;

/**
 * Utility hook for React components to use battery optimization
 */
export const useBatteryOptimization = () => {
  const optimizer = BatteryOptimizer.getInstance();

  return {
    optimizedSetTimeout: optimizer.optimizedSetTimeout.bind(optimizer),
    optimizedSetInterval: optimizer.optimizedSetInterval.bind(optimizer),
    registerCleanupCallback: optimizer.registerCleanupCallback.bind(optimizer),
    unregisterCleanupCallback: optimizer.unregisterCleanupCallback.bind(optimizer),
    isAppInBackground: optimizer.isAppInBackground.bind(optimizer),
  };
};