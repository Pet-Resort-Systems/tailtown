#!/usr/bin/env node

/**
 * Health Check Script for Tailtown Development Servers
 *
 * This script checks:
 * 1. If required services are running on expected ports
 * 2. If there are zombie processes consuming resources
 * 3. If services are responding to health checks
 *
 * Can be run as a cron job or manually to monitor server health
 */

const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const SERVICES = [
  { name: 'Customer Service', port: 4004, healthPath: '/health' },
  { name: 'Reservation Service', port: 4003, healthPath: '/health' },
  { name: 'Frontend', port: 3000, healthPath: '/' },
];

const ZOMBIE_THRESHOLD = 5; // Alert if more than 5 zombie processes

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Check if a port is in use
 */
async function checkPort(port) {
  try {
    const { stdout } = await execPromise(`lsof -ti :${port}`);
    return stdout.trim() !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Check if service responds to HTTP request
 */
function checkHttpHealth(port, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Count zombie processes
 */
async function countZombieProcesses() {
  try {
    const { stdout } = await execPromise(
      'ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep | wc -l'
    );
    return parseInt(stdout.trim(), 10);
  } catch (error) {
    return 0;
  }
}

/**
 * Get process details for zombies
 */
async function getZombieDetails() {
  try {
    const { stdout } = await execPromise(
      'ps aux | grep -E "(ts-node-dev|react-scripts)" | grep -v grep'
    );
    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Check CPU usage of processes
 */
async function checkHighCpuProcesses() {
  try {
    const { stdout } = await execPromise(
      'ps aux | grep -E "(ts-node-dev|react-scripts|node)" | grep -v grep | awk \'$3 > 50.0\''
    );
    const lines = stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
    return lines.map((line) => {
      const parts = line.split(/\s+/);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        command: parts.slice(10).join(' ').substring(0, 80),
      };
    });
  } catch (error) {
    return [];
  }
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  log('\n=== Tailtown Server Health Check ===\n', 'blue');

  let allHealthy = true;
  const issues = [];

  // Check each service
  log('Checking Services:', 'blue');
  for (const service of SERVICES) {
    const portInUse = await checkPort(service.port);
    const httpHealthy = portInUse
      ? await checkHttpHealth(service.port, service.healthPath)
      : false;

    if (portInUse && httpHealthy) {
      log(`✓ ${service.name} (port ${service.port}): HEALTHY`, 'green');
    } else if (portInUse && !httpHealthy) {
      log(
        `⚠ ${service.name} (port ${service.port}): PORT IN USE BUT NOT RESPONDING`,
        'yellow'
      );
      issues.push(`${service.name} is not responding to health checks`);
      allHealthy = false;
    } else {
      log(`✗ ${service.name} (port ${service.port}): NOT RUNNING`, 'red');
      issues.push(`${service.name} is not running`);
      allHealthy = false;
    }
  }

  // Check for zombie processes
  log('\nChecking for Zombie Processes:', 'blue');
  const zombieCount = await countZombieProcesses();

  if (zombieCount === 0) {
    log(`✓ No zombie processes found`, 'green');
  } else if (zombieCount <= ZOMBIE_THRESHOLD) {
    log(`⚠ Found ${zombieCount} processes (within threshold)`, 'yellow');
  } else {
    log(`✗ Found ${zombieCount} zombie processes (EXCEEDS THRESHOLD)`, 'red');
    issues.push(`${zombieCount} zombie processes detected`);
    allHealthy = false;

    const zombies = await getZombieDetails();
    log('\nZombie Process Details:', 'yellow');
    zombies.slice(0, 5).forEach((zombie) => {
      console.log(`  ${zombie.substring(0, 120)}`);
    });
    if (zombies.length > 5) {
      log(`  ... and ${zombies.length - 5} more`, 'yellow');
    }
  }

  // Check for high CPU processes
  log('\nChecking for High CPU Usage:', 'blue');
  const highCpuProcesses = await checkHighCpuProcesses();

  if (highCpuProcesses.length === 0) {
    log(`✓ No processes using excessive CPU`, 'green');
  } else {
    log(
      `⚠ Found ${highCpuProcesses.length} processes using >50% CPU:`,
      'yellow'
    );
    highCpuProcesses.forEach((proc) => {
      log(`  PID ${proc.pid}: ${proc.cpu}% CPU - ${proc.command}`, 'yellow');
    });
    if (highCpuProcesses.length > 3) {
      issues.push(`${highCpuProcesses.length} processes using high CPU`);
      allHealthy = false;
    }
  }

  // Summary
  log('\n=== Summary ===', 'blue');
  if (allHealthy) {
    log('✓ All systems healthy', 'green');
    return 0;
  } else {
    log('✗ Issues detected:', 'red');
    issues.forEach((issue) => log(`  - ${issue}`, 'red'));
    log('\nRecommendation: Run cleanup script or restart services', 'yellow');
    return 1;
  }
}

// Run the health check
runHealthCheck()
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    log(`\nError running health check: ${error.message}`, 'red');
    process.exit(1);
  });
