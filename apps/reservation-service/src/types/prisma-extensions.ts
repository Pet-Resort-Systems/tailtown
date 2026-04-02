/**
 * Prisma client extension for multi-tenant support
 * These type extensions are necessary because our schema includes fields like tenantId
 * for multi-tenant isolation, but the Prisma client doesn't recognize them in TypeScript.
 */

import { Prisma } from '../generated/prisma/client.js';

// Define tenant-specific types to use with type assertions
export interface TenantFields {
  tenantId: string;
}

// Extend the ReservationStatus enum to include our custom statuses
export enum ExtendedReservationStatus {
  CONFIRMED = 'CONFIRMED',
  PENDING = 'PENDING',
  CANCELED = 'CANCELED',
  COMPLETED = 'COMPLETED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  NO_SHOW = 'NO_SHOW',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  DRAFT = 'DRAFT',
}

// Extend Prisma's WhereInput types to include tenantId
export interface ExtendedReservationWhereInput
  extends Prisma.ReservationWhereInput {
  tenantId?: string | Prisma.StringFilter;
}
// Customer and Pet models removed from reservation service - use customerServiceClient instead
// export interface ExtendedCustomerWhereInput - REMOVED (use Customer Service API)
// export interface ExtendedPetWhereInput - REMOVED (use Customer Service API)
export interface ExtendedResourceWhereInput extends Prisma.ResourceWhereInput {
  tenantId?: string | Prisma.StringFilter;
}
export interface ExtendedAddOnServiceWhereInput
  extends Prisma.AddOnServiceWhereInput {
  tenantId?: string | Prisma.StringFilter;
}
export interface ExtendedServiceWhereInput extends Prisma.ServiceWhereInput {
  tenantId?: string | Prisma.StringFilter;
}

// Extend Prisma's model types to include custom fields
export type ExtendedReservation = Prisma.ReservationGetPayload<{}> & {
  suiteType?: string;
  price?: number;
  resource?: Prisma.ResourceGetPayload<{}>;
  addOns?: Prisma.ReservationAddOnGetPayload<{ include: { addOn: true } }>[];
  service?: Prisma.ServiceGetPayload<{}>;
};

// Define interfaces for Prisma include and select options with additional fields
export interface ExtendedReservationInclude extends Omit<
  Prisma.ReservationInclude,
  'service'
> {
  // We're keeping this simple to avoid complex Prisma type constraint issues
  addOns?: any;
  service?: any; // Using any to avoid Prisma type generation issues
}

// Pet and Customer Select types removed - use customerServiceClient instead
// export interface ExtendedPetSelect - REMOVED (use Customer Service API)
// export interface ExtendedCustomerSelect - REMOVED (use Customer Service API)

// Interface for creating ReservationAddOn with tenant isolation
export type ExtendedReservationAddOnCreateInput =
  Prisma.ReservationAddOnCreateInput & TenantFields;

/**
 * This mapping allows us to use type assertions to override Prisma's generated types
 * when we need to use fields not recognized by TypeScript but present in our database.
 *
 * Example usage:
 * const whereClause = { tenantId } as ExtendedReservationWhereInput;
 */
