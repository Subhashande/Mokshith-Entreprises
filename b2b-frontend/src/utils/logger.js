/**
 * Production-safe logger
 * Only logs in development mode
 * Prevents console logs from appearing in production builds
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

class Logger {
  log(...args) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  info(...args) {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  warn(...args) {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args) {
    // Always log errors, even in production (for debugging critical issues)
    console.error(...args);
  }

  debug(...args) {
    if (isDevelopment) {
      console.debug(...args);
    }
  }

  table(data) {
    if (isDevelopment && console.table) {
      console.table(data);
    }
  }
}

export const logger = new Logger();
export default logger;
