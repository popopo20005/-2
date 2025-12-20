/**
 * Debug Utility
 * Console logging that respects the environment
 */

const IS_DEVELOPMENT = import.meta.env.DEV;

/**
 * Development-only console.log
 * Automatically suppressed in production builds
 */
export const debugLog = (...args: any[]): void => {
  if (IS_DEVELOPMENT) {
    console.log(...args);
  }
};

/**
 * Development-only console.warn
 */
export const debugWarn = (...args: any[]): void => {
  if (IS_DEVELOPMENT) {
    console.warn(...args);
  }
};

/**
 * Development-only console.error
 * Note: Errors should still be logged in production for monitoring
 */
export const debugError = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Development-only console.table
 */
export const debugTable = (data: any): void => {
  if (IS_DEVELOPMENT) {
    console.table(data);
  }
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => IS_DEVELOPMENT;
