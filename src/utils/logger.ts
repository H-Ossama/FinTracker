/**
 * Logging utility that provides conditional logging based on environment
 * This helps reduce console spam in production builds
 */

interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

class ConditionalLogger implements Logger {
  private enabled: boolean;

  constructor() {
    // Only enable logging in development mode
    this.enabled = __DEV__;
  }

  log(...args: any[]): void {
    if (this.enabled) {
      console.log(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    // Always log errors, even in production
    console.error(...args);
  }

  info(...args: any[]): void {
    if (this.enabled) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.enabled) {
      console.debug(...args);
    }
  }

  // Method to temporarily enable/disable logging
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // Method to check if logging is enabled
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export a singleton instance
export const logger = new ConditionalLogger();

// Export logger methods for easy importing
export const { log, warn, error, info, debug } = logger;