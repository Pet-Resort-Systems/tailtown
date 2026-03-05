import { Request } from 'express';

export interface TenantRequest extends Omit<Request, 'tenantId'> {
  tenantId?: string;
}
