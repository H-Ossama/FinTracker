/**
 * Console override for production builds
 * This will silence all console.log statements in production while preserving errors
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  debug: console.debug,
  error: console.error,
};

// List of log patterns to filter out even in development (to reduce spam)
const spamPatterns = [
  '📋 Getting all bills',
  '💰 Getting all budgets', 
  '📂 Getting bill categories',
  '💾 Bills raw data',
  '💾 Budgets raw data',
  '💾 Categories raw data',
  '📊 Parsed bills count',
  '📊 Parsed budgets count',
  '📊 Parsed categories count',
  '✅ Bills loaded and statuses updated',
  '✅ Budgets loaded successfully',
  '✅ Categories initialized',
  '✅ Budget categories initialized',
  '✅ AsyncStorage test',
  '✅ Budget AsyncStorage test',
];

// Function to check if a log message should be filtered
const shouldFilterLog = (args: any[]): boolean => {
  const message = args.join(' ');
  return spamPatterns.some(pattern => message.includes(pattern));
};

// Override console methods
if (!__DEV__) {
  // Production: silence most logs
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    if (message.includes('error') || message.includes('failed') || message.includes('warning')) {
      originalConsole.warn(...args);
    }
  };
} else {
  // Development: filter spam logs but keep others
  console.log = (...args: any[]) => {
    if (!shouldFilterLog(args)) {
      originalConsole.log(...args);
    }
  };
  
  console.info = (...args: any[]) => {
    if (!shouldFilterLog(args)) {
      originalConsole.info(...args);
    }
  };
}

// Always keep console.error active for debugging
console.error = originalConsole.error;

export { originalConsole };