const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Route reservation-related APIs to reservation-service (4003)
  app.use(
    '/api/reservations',
    createProxyMiddleware({
      target: 'http://localhost:4003',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
      }
    })
  );

  app.use(
    '/api/resources',
    createProxyMiddleware({
      target: 'http://localhost:4003',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
      }
    })
  );

  app.use(
    '/api/error-tracking',
    createProxyMiddleware({
      target: 'http://localhost:4003',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
      }
    })
  );

  // Checklist routes to customer-service (4004)
  app.use(
    '/api/checklists',
    createProxyMiddleware({
      target: 'http://localhost:4004',
      changeOrigin: true,
      logLevel: 'debug',
      pathRewrite: function (path, req) {
        return path; // Don't rewrite, keep the full path
      },
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
      }
    })
  );

  // Default: other /api routes to customer-service (4004)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4004',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Proxy Error:', err);
        res.status(500).json({ error: 'Proxy Error', details: err.message });
      }
    })
  );
};
