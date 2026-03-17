// @ts-nocheck
/**
 * Tests for logger.ts
 *
 * Tests the shared logger module with different log levels and context support.
 */

import Logger, { logger, LogLevel } from '../../utils/logger';

describe('Logger utilities', () => {
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      debug: jest.spyOn(console, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('LogLevel enum', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.SUCCESS).toBe(3);
      expect(LogLevel.DEBUG).toBe(4);
    });

    it('should have levels in order of verbosity', () => {
      expect(LogLevel.ERROR).toBeLessThan(LogLevel.WARN);
      expect(LogLevel.WARN).toBeLessThan(LogLevel.INFO);
      expect(LogLevel.INFO).toBeLessThan(LogLevel.SUCCESS);
      expect(LogLevel.SUCCESS).toBeLessThan(LogLevel.DEBUG);
    });
  });

  describe('Logger class', () => {
    describe('constructor', () => {
      it('should create logger with default config', () => {
        const testLogger = new Logger();
        expect(testLogger).toBeDefined();
      });

      it('should accept custom config', () => {
        const testLogger = new Logger({
          level: LogLevel.ERROR,
          enableColors: false,
          includeTimestamps: false,
        });
        expect(testLogger).toBeDefined();
      });
    });

    describe('error', () => {
      it('should log error messages', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.error('Test error');

        expect(consoleSpy.error).toHaveBeenCalled();
        expect(consoleSpy.error.mock.calls[0][0]).toContain('[ERROR]');
        expect(consoleSpy.error.mock.calls[0][0]).toContain('Test error');
      });

      it('should include context when provided', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.error('Test error', { userId: '123' });

        expect(consoleSpy.error.mock.calls[0][0]).toContain('userId');
        expect(consoleSpy.error.mock.calls[0][0]).toContain('123');
      });

      it('should always log errors regardless of level', () => {
        const testLogger = new Logger({ level: LogLevel.ERROR });
        testLogger.error('Critical error');

        expect(consoleSpy.error).toHaveBeenCalled();
      });
    });

    describe('warn', () => {
      it('should log warning messages', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.warn('Test warning');

        expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.warn.mock.calls[0][0]).toContain('[WARN]');
      });

      it('should not log warnings when level is ERROR', () => {
        const testLogger = new Logger({ level: LogLevel.ERROR });
        testLogger.warn('Test warning');

        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });

    describe('info', () => {
      it('should log info messages', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.info('Test info');

        expect(consoleSpy.info).toHaveBeenCalled();
        expect(consoleSpy.info.mock.calls[0][0]).toContain('[INFO]');
      });

      it('should not log info when level is WARN', () => {
        const testLogger = new Logger({ level: LogLevel.WARN });
        testLogger.info('Test info');

        expect(consoleSpy.info).not.toHaveBeenCalled();
      });
    });

    describe('success', () => {
      it('should log success messages', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.success('Test success');

        expect(consoleSpy.info).toHaveBeenCalled();
        expect(consoleSpy.info.mock.calls[0][0]).toContain('[SUCCESS]');
      });

      it('should not log success when level is INFO', () => {
        const testLogger = new Logger({ level: LogLevel.INFO });
        testLogger.success('Test success');

        expect(consoleSpy.info).not.toHaveBeenCalledWith(
          expect.stringContaining('[SUCCESS]')
        );
      });
    });

    describe('debug', () => {
      it('should log debug messages when level is DEBUG', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.debug('Test debug');

        expect(consoleSpy.debug).toHaveBeenCalled();
        expect(consoleSpy.debug.mock.calls[0][0]).toContain('[DEBUG]');
      });

      it('should not log debug when level is INFO', () => {
        const testLogger = new Logger({ level: LogLevel.INFO });
        testLogger.debug('Test debug');

        expect(consoleSpy.debug).not.toHaveBeenCalled();
      });
    });

    describe('setLevel', () => {
      it('should change the log level', () => {
        const testLogger = new Logger({ level: LogLevel.ERROR });

        // Debug should not log at ERROR level
        testLogger.debug('Before level change');
        expect(consoleSpy.debug).not.toHaveBeenCalled();

        // Change level to DEBUG
        testLogger.setLevel(LogLevel.DEBUG);

        // Now debug should log
        testLogger.debug('After level change');
        expect(consoleSpy.debug).toHaveBeenCalled();
      });
    });

    describe('message formatting', () => {
      it('should include timestamp by default', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.info('Test message');

        // Check for ISO timestamp format
        expect(consoleSpy.info.mock.calls[0][0]).toMatch(
          /\[\d{4}-\d{2}-\d{2}T/
        );
      });

      it('should exclude timestamp when disabled', () => {
        const testLogger = new Logger({
          level: LogLevel.DEBUG,
          includeTimestamps: false,
        });
        testLogger.info('Test message');

        // Should not have timestamp format
        expect(consoleSpy.info.mock.calls[0][0]).not.toMatch(
          /\[\d{4}-\d{2}-\d{2}T/
        );
      });

      it('should stringify object context', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.info('Test', { key: 'value', nested: { a: 1 } });

        expect(consoleSpy.info.mock.calls[0][0]).toContain('"key":"value"');
        expect(consoleSpy.info.mock.calls[0][0]).toContain('"nested"');
      });

      it('should handle string context', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.info('Test', 'string context');

        expect(consoleSpy.info.mock.calls[0][0]).toContain('string context');
      });

      it('should handle undefined context', () => {
        const testLogger = new Logger({ level: LogLevel.DEBUG });
        testLogger.info('Test message');

        expect(consoleSpy.info).toHaveBeenCalled();
        expect(consoleSpy.info.mock.calls[0][0]).toContain('Test message');
      });
    });
  });

  describe('singleton logger instance', () => {
    it('should export a singleton logger', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should have all log methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.setLevel).toBe('function');
    });
  });
});
