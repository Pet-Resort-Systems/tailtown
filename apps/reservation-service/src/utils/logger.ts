/**
 * Shared Logger Module
 * 
 * Provides consistent logging across the application with different log levels,
 * context support, and environment-based filtering.
 * 
 * ⚠️ IMPORTANT: This file is duplicated in:
 * - services/customer/src/utils/logger.ts
 * - services/reservation-service/src/utils/logger.ts
 * 
 * Keep both files synchronized! Run `npm run check:logger-sync` to verify.
 */

// Log levels in order of verbosity
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  SUCCESS = 3,
  DEBUG = 4
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  includeTimestamps: boolean;
}

// Default configuration based on environment
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' 
    ? LogLevel.INFO 
    : LogLevel.DEBUG,
  enableColors: process.env.NODE_ENV !== 'production',
  includeTimestamps: true
};

/**
 * Logger class with multiple log levels and context support
 */
class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }
  
  /**
   * Format a log message with optional context
   */
  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = this.config.includeTimestamps 
      ? `[${new Date().toISOString()}] `
      : '';
      
    const contextStr = context 
      ? ` ${typeof context === 'object' ? JSON.stringify(context) : context}`
      : '';
      
    return `${timestamp}[${level}] ${message}${contextStr}`;
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    if (this.config.level >= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, context));
    }
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    if (this.config.level >= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    if (this.config.level >= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }
  
  /**
   * Log a success message
   */
  success(message: string, context?: any): void {
    if (this.config.level >= LogLevel.SUCCESS) {
      console.info(this.formatMessage('SUCCESS', message, context));
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    if (this.config.level >= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }
  
  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

// Export a singleton instance
export const logger = new Logger();

// Also export the class for extensibility
export default Logger;
