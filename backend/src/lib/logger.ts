/**
 * Simple logger service
 * Replaces console.log with structured logging
 */
class Logger {
  private isDev = process.env.NODE_ENV !== 'production';
  private isTest = process.env.NODE_ENV === 'test';

  info(message: string, ...args: any[]) {
    if (this.isDev && !this.isTest) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  error(message: string, error?: Error | unknown) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }

  warn(message: string, ...args: any[]) {
    if (this.isDev) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.isDev && !this.isTest) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Log performance metrics
   */
  perf(label: string, startTime: number) {
    const duration = Date.now() - startTime;
    if (this.isDev) {
      console.log(`[PERF] ${label}: ${duration}ms`);
    }
    return duration;
  }
}

export const logger = new Logger();
