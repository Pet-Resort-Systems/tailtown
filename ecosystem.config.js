/**
 * PM2 Ecosystem Configuration
 * Production process management for Tailtown services
 * 
 * Usage:
 *   Development: pm2 start ecosystem.config.js
 *   Production:  pm2 start ecosystem.config.js --env production
 *   Startup:     pm2 startup && pm2 save
 */

module.exports = {
  apps: [
    {
      name: 'customer-service',
      cwd: './apps/customer-service',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4004
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4004
      },
      error_file: './logs/customer-error.log',
      out_file: './logs/customer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'reservation-service',
      cwd: './apps/reservation-service',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4003
      },
      error_file: './logs/reservation-error.log',
      out_file: './logs/reservation-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    },
    {
      name: 'frontend',
      cwd: './apps/frontend',
      script: 'npx',
      args: 'serve -s build -l 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: './logs/apps/frontend-error.log',
      out_file: './logs/apps/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'health-monitor',
      script: './scripts/health-check.js',
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '*/5 * * * *',
      autorestart: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/health-error.log',
      out_file: './logs/health-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  deploy: {
    production: {
      user: 'tailtown',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/tailtown.git',
      path: '/opt/tailtown',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /opt/tailtown/logs'
    }
  }
};
