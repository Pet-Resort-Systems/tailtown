import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
    }
  }
}

// This file is required to extend the Express Request type
// with the tenantId property added by the tenant middleware
