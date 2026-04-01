import type { Request } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
