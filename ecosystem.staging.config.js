/**
 * PM2 Ecosystem Configuration - STAGING
 * Staging environment process management for Tailtown services
 *
 * Usage:
 *   Start:   pm2 start ecosystem.staging.config.js
 *   Restart: pm2 restart ecosystem.staging.config.js
 *   Stop:    pm2 stop ecosystem.staging.config.js
 *   Delete:  pm2 delete ecosystem.staging.config.js
 *
 * Ports:
 *   Customer Service:    5004 (prod: 4004)
 *   Reservation Service: 5003 (prod: 4003)
 *   Frontend:            5000 (prod: 3000)
 */

module.exports = {
  apps: [
    {
      name: 'staging-customer-service',
      cwd: './apps/customer-service',
      script: 'dist/index.js',
      instances: 1, // Single instance for staging
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: 5004,
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        REDIS_URL: process.env.STAGING_REDIS_URL || 'redis://localhost:6379/1', // Use DB 1 for staging
      },
      error_file: './logs/staging-customer-error.log',
      out_file: './logs/staging-customer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '512M',
      max_restarts: 5,
      min_uptime: '10s',
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'staging-reservation-service',
      cwd: './apps/reservation-service',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: 5003,
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        REDIS_URL: process.env.STAGING_REDIS_URL || 'redis://localhost:6379/1',
      },
      error_file: './logs/staging-reservation-error.log',
      out_file: './logs/staging-reservation-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '512M',
      max_restarts: 5,
      min_uptime: '10s',
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: 'staging-frontend',
      cwd: './apps/frontend',
      script: 'npx',
      args: 'serve -s build -l 5000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
      },
      error_file: './logs/staging-frontend-error.log',
      out_file: './logs/staging-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '256M',
      max_restarts: 5,
      min_uptime: '10s',
    },
  ],

  deploy: {
    staging: {
      user: 'tailtown',
      host: ['your-server.com'],
      ref: 'origin/staging',
      repo: 'git@github.com:moosecreates/tailtown.git',
      path: '/opt/tailtown-staging',
      'pre-deploy': 'git fetch --all',
      'post-deploy':
        'pnpm install && pnpm run build:staging && pm2 reload ecosystem.staging.config.js',
      'pre-setup': 'mkdir -p /opt/tailtown-staging/logs',
    },
  },
};
