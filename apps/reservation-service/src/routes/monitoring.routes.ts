/**
 * Monitoring Routes
 * 
 * Endpoints for viewing metrics and health status
 */

import { Router } from 'express';
import { monitoring } from '../utils/monitoring';

const router = Router();

/**
 * GET /monitoring/metrics
 * Get current metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = monitoring.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /monitoring/health
 * Get health status
 */
router.get('/health', (req, res) => {
  try {
    const metrics = monitoring.getMetrics();
    res.json({
      status: metrics.health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      health: metrics.health,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve health status' });
  }
});

/**
 * GET /monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const alerts = monitoring.checkAlerts();
    res.json({
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

/**
 * GET /monitoring/dashboard
 * HTML dashboard for viewing metrics
 */
router.get('/dashboard', (req, res) => {
  const metrics = monitoring.getMetrics();
  const alerts = monitoring.checkAlerts();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailtown Monitoring Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h2 { color: #666; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .metric { font-size: 32px; font-weight: bold; color: #333; }
    .metric.success { color: #10b981; }
    .metric.warning { color: #f59e0b; }
    .metric.error { color: #ef4444; }
    .label { font-size: 12px; color: #999; margin-top: 5px; }
    .alert {
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .alert.warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert.critical { background: #fee2e2; border-left: 4px solid #ef4444; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.healthy { background: #d1fae5; color: #065f46; }
    .status-badge.degraded { background: #fef3c7; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    th { color: #666; font-size: 12px; text-transform: uppercase; }
    .refresh { 
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .refresh:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔍 Tailtown Monitoring Dashboard</h1>
    
    ${alerts.length > 0 ? `
    <div class="card" style="margin-bottom: 20px;">
      <h2>⚠️ Active Alerts (${alerts.length})</h2>
      ${alerts.map(alert => `
        <div class="alert ${alert.severity}">
          <strong>${alert.type}</strong>: ${alert.message}
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="grid">
      <div class="card">
        <h2>System Health</h2>
        <div class="metric">
          <span class="status-badge ${metrics.health.status}">${metrics.health.status.toUpperCase()}</span>
        </div>
        <div class="label">Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m</div>
      </div>
      
      <div class="card">
        <h2>Total Requests</h2>
        <div class="metric success">${metrics.requests.total.toLocaleString()}</div>
        <div class="label">All time</div>
      </div>
      
      <div class="card">
        <h2>Error Rate</h2>
        <div class="metric ${(metrics.errors.total / Math.max(metrics.requests.total, 1)) > 0.05 ? 'error' : 'success'}">
          ${((metrics.errors.total / Math.max(metrics.requests.total, 1)) * 100).toFixed(2)}%
        </div>
        <div class="label">${metrics.errors.total} errors</div>
      </div>
      
      <div class="card">
        <h2>Response Time (P95)</h2>
        <div class="metric ${metrics.responseTimes.p95 > 1000 ? 'warning' : 'success'}">
          ${metrics.responseTimes.p95}ms
        </div>
        <div class="label">Avg: ${metrics.responseTimes.avg}ms</div>
      </div>
      
      <div class="card">
        <h2>Rate Limit Hits</h2>
        <div class="metric ${metrics.rateLimits.hits > 0 ? 'warning' : 'success'}">
          ${metrics.rateLimits.hits.toLocaleString()}
        </div>
        <div class="label">${((metrics.rateLimits.hits / Math.max(metrics.requests.total, 1)) * 100).toFixed(2)}% of requests</div>
      </div>
      
      <div class="card">
        <h2>Database Queries</h2>
        <div class="metric">${metrics.database.queries.toLocaleString()}</div>
        <div class="label">${metrics.database.slowQueries} slow (>100ms)</div>
      </div>
    </div>
    
    <div class="grid">
      <div class="card">
        <h2>Requests by Tenant</h2>
        <table>
          <thead>
            <tr><th>Tenant</th><th>Requests</th></tr>
          </thead>
          <tbody>
            ${Object.entries(metrics.requests.byTenant)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([tenant, count]) => `
                <tr><td>${tenant}</td><td>${count}</td></tr>
              `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Top Endpoints</h2>
        <table>
          <thead>
            <tr><th>Endpoint</th><th>Requests</th></tr>
          </thead>
          <tbody>
            ${Object.entries(metrics.requests.byEndpoint)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([endpoint, count]) => `
                <tr><td>${endpoint}</td><td>${count}</td></tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    ${metrics.errors.recent.length > 0 ? `
    <div class="card">
      <h2>Recent Errors</h2>
      <table>
        <thead>
          <tr><th>Time</th><th>Error</th><th>Tenant</th></tr>
        </thead>
        <tbody>
          ${metrics.errors.recent.map(err => `
            <tr>
              <td>${new Date(err.timestamp).toLocaleTimeString()}</td>
              <td>${err.error}</td>
              <td>${err.tenant || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  </div>
  
  <button class="refresh" onclick="location.reload()">🔄 Refresh</button>
  
  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
  `;

  res.send(html);
});

/**
 * POST /monitoring/reset
 * Reset metrics (for testing)
 */
router.post('/reset', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Cannot reset metrics in production' });
  }

  monitoring.reset();
  res.json({ message: 'Metrics reset successfully' });
});

export default router;
