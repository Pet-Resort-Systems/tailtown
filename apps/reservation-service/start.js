/**
 * Simple start script to run the reservation service
 * This bypasses TypeScript build issues while we test the kennel calendar
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting reservation service on port 4003...');

// Run the service using ts-node to bypass TypeScript build issues
// Added --transpile-only flag to skip type checking
const serviceProcess = spawn('npx', ['ts-node', '--transpile-only', 'src/index.ts'], {
  env: { ...process.env, PORT: 4003 },
  stdio: 'inherit',
  cwd: __dirname
});

console.log('Reservation service started!');

// Handle process exit
serviceProcess.on('exit', (code) => {
  console.log(`Reservation service process exited with code ${code}`);
  process.exit(code);
});

// Handle process errors
serviceProcess.on('error', (err) => {
  console.error('Failed to start reservation service:', err);
  process.exit(1);
});
