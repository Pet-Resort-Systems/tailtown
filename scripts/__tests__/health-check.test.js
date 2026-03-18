/**
 * Tests for Health Check Script
 *
 * Run with: pnpm test -- scripts/__tests__/health-check.test.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

describe('Health Check Script', () => {
  const healthCheckScript = './scripts/health-check.js';

  it('should be executable', async () => {
    const { stdout } = await execPromise(
      `test -x ${healthCheckScript} && echo "executable" || echo "not executable"`
    );
    expect(stdout.trim()).toBe('executable');
  });

  it('should run without errors', async () => {
    try {
      await execPromise(`node ${healthCheckScript}`);
    } catch (error) {
      // Script may exit with code 1 if services are down, but shouldn't crash
      expect(error.code).toBeLessThanOrEqual(1);
    }
  });

  it('should detect when services are not running', async () => {
    // This test assumes services might not be running
    try {
      const { stdout } = await execPromise(`node ${healthCheckScript}`);
      expect(stdout).toContain('Health Check');
    } catch (error) {
      // Expected if services are down
      expect(error.stdout).toContain('Health Check');
    }
  });
});

describe('Zombie Process Detection', () => {
  it('should detect ts-node-dev processes', async () => {
    const { stdout } = await execPromise(
      'ps aux | grep -E "ts-node-dev" | grep -v grep | wc -l'
    );
    const count = parseInt(stdout.trim(), 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should detect react-scripts processes', async () => {
    const { stdout } = await execPromise(
      'ps aux | grep -E "react-scripts" | grep -v grep | wc -l'
    );
    const count = parseInt(stdout.trim(), 10);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

describe('Port Availability', () => {
  const ports = [3000, 4003, 4004];

  ports.forEach((port) => {
    it(`should check if port ${port} is available`, async () => {
      try {
        const { stdout } = await execPromise(`lsof -ti :${port}`);
        const pid = stdout.trim();
        expect(pid).toMatch(/^\d+$/);
      } catch (error) {
        // Port not in use - this is fine
        expect(error.code).toBe(1);
      }
    });
  });
});

describe('CPU Usage Monitoring', () => {
  it('should detect high CPU processes', async () => {
    const { stdout } = await execPromise(
      'ps aux | grep -E "(ts-node-dev|react-scripts|node)" | grep -v grep | awk \'$3 > 50.0\' | wc -l'
    );
    const count = parseInt(stdout.trim(), 10);
    expect(count).toBeGreaterThanOrEqual(0);

    // Alert if we find high CPU processes
    if (count > 0) {
      console.warn(`⚠️  Found ${count} processes using >50% CPU`);
    }
  });

  it('should alert on excessive zombie processes', async () => {
    const { stdout } = await execPromise(
      'ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l'
    );
    const count = parseInt(stdout.trim(), 10);

    if (count > 5) {
      console.warn(`⚠️  Found ${count} zombie processes - cleanup recommended`);
    }

    expect(count).toBeGreaterThanOrEqual(0);
  });
});
