/**
 * Payment Service
 * Handles payment processing with CardConnect integration
 */

import express from 'express';
import type { Express, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createAllowedOriginChecker } from '@tailtown/shared';
import { logger } from './utils/logger.js';
import paymentRoutes from './routes/payment.routes.js';
import { env } from './env.js';

const app: Express = express();
const PORT = env.PORT;

// Security middleware
app.use(helmet());

// CORS configuration
const isAllowedOrigin = createAllowedOriginChecker(env.ALLOWED_ORIGINS.join(','), [
  'http://localhost:3000',
]);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
  });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
    });

    res.status(err.status || 500).json({
      status: 'error',
      message: err.message || 'Internal server error',
    });
  }
);

// Start server
app.listen(PORT, () => {
  logger.info(`Payment service started on port ${PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`CardConnect API: ${env.CARDCONNECT_API_URL}`);
});

export default app;
