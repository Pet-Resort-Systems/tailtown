/**
 * Shared Logger Module
 * 
 * This module provides a standardized logging interface for all services.
 * It supports different log levels and formats based on the environment.
 */

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  SUCCESS = 'success'
}

/**
 * Interface for log context
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Logger configuration options
 */
export interface LoggerOptions {
  serviceName: string;
  environment?: string;
  minLevel?: LogLevel;
}

/**
 * Default logger options
 */
const defaultOptions: LoggerOptions = {
  serviceName: 'tailtown-service',
  environment: process.env.NODE_ENV || 'development',
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
};

/**
 * Logger class
 */
export class Logger {
  private options: LoggerOptions;
  
  /**
   * Create a new logger
   * 
   * @param options - Logger options
   */
  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }
  
  /**
   * Format a log message
   * 
   * @param level - Log level
   * @param message - Log message
   * @param context - Log context
   * @returns Formatted log message
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | context: ${JSON.stringify(context)}` : '';
    
    return `[${timestamp}] [${this.options.serviceName}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
  
  /**
   * Check if a log level should be displayed
   * 
   * @param level - Log level to check
   * @returns Whether the log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.SUCCESS, LogLevel.DEBUG];
    const minLevelIndex = levels.indexOf(this.options.minLevel || LogLevel.INFO);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex <= minLevelIndex;
  }
  
  /**
   * Log an error message
   * 
   * @param message - Error message
   * @param context - Error context
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatLog(LogLevel.ERROR, message, context));
    }
  }
  
  /**
   * Log a warning message
   * 
   * @param message - Warning message
   * @param context - Warning context
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, context));
    }
  }
  
  /**
   * Log an info message
   * 
   * @param message - Info message
   * @param context - Info context
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(LogLevel.INFO, message, context));
    }
  }
  
  /**
   * Log a success message
   * 
   * @param message - Success message
   * @param context - Success context
   */
  success(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.SUCCESS)) {
      console.info(this.formatLog(LogLevel.SUCCESS, message, context));
    }
  }
  
  /**
   * Log a debug message
   * 
   * @param message - Debug message
   * @param context - Debug context
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }
}

/**
 * Create a default logger instance
 */
export const logger = new Logger();
