/**
 * Frontend Logger Utility
 * 
 * Provides consistent logging across the frontend with different log levels,
 * context support, and environment-based filtering.
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('API call failed', { endpoint: '/api/users', error });
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
  prefix?: string;
}

// Color codes for browser console
const colors = {
  ERROR: '#f44336',
  WARN: '#ff9800',
  INFO: '#2196f3',
  SUCCESS: '#4caf50',
  DEBUG: '#9e9e9e'
};

// Default configuration based on environment
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' 
    ? LogLevel.WARN  // Only warnings and errors in production
    : LogLevel.DEBUG, // All logs in development
  enableColors: true,
  includeTimestamps: process.env.NODE_ENV !== 'production'
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
    const parts: string[] = [];
    
    if (this.config.includeTimestamps) {
      parts.push(new Date().toISOString());
    }
    
    if (this.config.prefix) {
      parts.push(`[${this.config.prefix}]`);
    }
    
    parts.push(`[${level}]`);
    parts.push(message);
    
    return parts.join(' ');
  }
  
  /**
   * Log with color in browser console
   */
  private logWithColor(level: keyof typeof colors, message: string, context?: any): void {
    if (this.config.enableColors && typeof window !== 'undefined') {
      console.log(
        `%c${message}`,
        `color: ${colors[level]}; font-weight: bold`,
        context !== undefined ? context : ''
      );
    } else {
      console.log(message, context !== undefined ? context : '');
    }
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    if (this.config.level >= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, context);
      if (this.config.enableColors) {
        console.error(
          `%c${formattedMessage}`,
          `color: ${colors.ERROR}; font-weight: bold`,
          context !== undefined ? context : ''
        );
      } else {
        console.error(formattedMessage, context !== undefined ? context : '');
      }
    }
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    if (this.config.level >= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, context);
      if (this.config.enableColors) {
        console.warn(
          `%c${formattedMessage}`,
          `color: ${colors.WARN}; font-weight: bold`,
          context !== undefined ? context : ''
        );
      } else {
        console.warn(formattedMessage, context !== undefined ? context : '');
      }
    }
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    if (this.config.level >= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, context);
      this.logWithColor('INFO', formattedMessage, context);
    }
  }
  
  /**
   * Log a success message
   */
  success(message: string, context?: any): void {
    if (this.config.level >= LogLevel.SUCCESS) {
      const formattedMessage = this.formatMessage('SUCCESS', message, context);
      this.logWithColor('SUCCESS', formattedMessage, context);
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    if (this.config.level >= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, context);
      this.logWithColor('DEBUG', formattedMessage, context);
    }
  }
  
  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix
    });
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for creating custom loggers
export default Logger;

// Convenience exports for common use cases
export const createLogger = (prefix: string) => logger.child(prefix);
